"""Backup routes: export everything to .xlsx and import it back (backup file or the original spreadsheet)."""

import base64
import binascii
import uuid
from datetime import datetime, timedelta, timezone
from io import BytesIO

import openpyxl
from fastapi import APIRouter, HTTPException, Response

from lib.backup import eh_backup, exportar, ler_backup
from lib.dates import today_iso
from lib.db import db
from lib.planilha import CATEGORIAS_PADRAO, parse_planilha
from models.finance import ImportarIn, ImportarOut

router = APIRouter()

SEM_ID = {"_id": 0}
PALETA = ["#F59E0B", "#10B981", "#F43F5E", "#38BDF8", "#8B5CF6", "#F97316", "#EAB308", "#14B8A6", "#EC4899", "#64748B"]


@router.get("/backup/exportar")
async def exportar_backup():
    lancs = await db.lancamentos.find({}, SEM_ID).sort([("data", 1), ("created_at", 1)]).to_list(200000)
    cats = await db.categorias.find({}, SEM_ID).sort([("ordem", 1), ("nome", 1)]).to_list(1000)
    invs = await db.investimentos.find({}, SEM_ID).sort([("ano", 1), ("mes", 1)]).to_list(5000)
    conteudo = exportar(lancs, cats, invs)
    nome = f"FinanControl_backup_{today_iso()}.xlsx"
    return Response(
        content=conteudo,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nome}"'},
    )


def _chave(l: dict) -> tuple:
    return (l["tipo"], l["data"], l["descricao"], round(l["valor"], 2), l.get("observacao") or "")


@router.post("/backup/importar", response_model=ImportarOut)
async def importar_backup(body: ImportarIn):
    # 1) Ler e validar o arquivo inteiro ANTES de mexer no banco
    try:
        raw = base64.b64decode(body.arquivo_base64.split(",")[-1], validate=False)
        wb = openpyxl.load_workbook(BytesIO(raw), data_only=True)
    except (binascii.Error, ValueError, OSError, KeyError, Exception):  # arquivo não é um .xlsx válido
        raise HTTPException(400, "Arquivo inválido. Envie uma planilha Excel (.xlsx).")

    if eh_backup(wb):
        formato = "backup"
        lancs, cats, invs, invalidas = ler_backup(wb)
    elif "Relatório Geral" in wb.sheetnames:
        formato = "planilha"
        wb_f = openpyxl.load_workbook(BytesIO(raw), data_only=False)
        ano, lancs, inv_map = parse_planilha(wb_f)
        cats = [{"id": None, "nome": n, "cor": c, "recorrente": n == "Fixo", "ordem": i} for i, (n, c) in enumerate(CATEGORIAS_PADRAO)]
        invs = [{"ano": ano, "mes": m, "valor": v} for m, v in inv_map.items()]
        invalidas = 0
    else:
        raise HTTPException(400, "Planilha não reconhecida. Use um backup exportado pelo FinanControl ou a planilha CONTROLE_FINANCEIRO.")

    # 2) Substituir: ação explícita confirmada na tela. Antes de limpar, guarda uma cópia de segurança completa.
    if body.modo == "substituir":
        if body.confirmacao != "SUBSTITUIR":
            raise HTTPException(400, "Confirme a substituição dos dados")
        await db.snapshots_importacao.insert_one({
            "id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "lancamentos": await db.lancamentos.find({}, SEM_ID).to_list(200000),
            "categorias": await db.categorias.find({}, SEM_ID).to_list(1000),
            "investimentos": await db.investimentos.find({}, SEM_ID).to_list(5000),
        })
        await db.lancamentos.delete_many({})
        await db.categorias.delete_many({})
        await db.investimentos.delete_many({})

    # 3) Categorias (por nome, sem diferenciar maiúsculas)
    existentes = {c["nome"].lower(): c for c in await db.categorias.find({}, SEM_ID).to_list(1000)}
    ordem = max([c.get("ordem", 0) for c in existentes.values()], default=-1) + 1
    criadas = 0
    obs_despesas = {l["observacao"] for l in lancs if l["tipo"] == "despesa" and l["observacao"]}
    todas = list(cats) + [{"id": None, "nome": n, "cor": None, "recorrente": False, "ordem": None} for n in sorted(obs_despesas)]
    for c in todas:
        if c["nome"].lower() in existentes:
            continue
        doc = {
            "id": c.get("id") or str(uuid.uuid4()), "nome": c["nome"], "cor": c.get("cor") or PALETA[ordem % len(PALETA)],
            "recorrente": bool(c.get("recorrente")), "ordem": c["ordem"] if c.get("ordem") is not None else ordem,
        }
        if await db.categorias.find_one({"id": doc["id"]}):
            doc["id"] = str(uuid.uuid4())
        await db.categorias.insert_one(doc)
        existentes[doc["nome"].lower()] = doc
        ordem += 1
        criadas += 1
    # despesas usam o nome exato da categoria cadastrada
    for l in lancs:
        if l["tipo"] == "despesa" and l["observacao"]:
            l["observacao"] = existentes[l["observacao"].lower()]["nome"]

    # 4) Lançamentos — mesclar não duplica (por ID, ou por conteúdo idêntico quando não há ID)
    ids_atuais = set(await db.lancamentos.distinct("id")) if body.modo == "mesclar" else set()
    contagem: dict[tuple, int] = {}
    if body.modo == "mesclar":
        for d in await db.lancamentos.find({}, {"_id": 0, "tipo": 1, "data": 1, "descricao": 1, "valor": 1, "observacao": 1}).to_list(200000):
            contagem[_chave(d)] = contagem.get(_chave(d), 0) + 1
    base = datetime.now(timezone.utc)
    novos, ignorados = [], 0
    for i, l in enumerate(lancs):
        if l.get("id") and l["id"] in ids_atuais:
            ignorados += 1
            continue
        k = _chave(l)
        if not l.get("id") and contagem.get(k, 0) > 0:
            contagem[k] -= 1
            ignorados += 1
            continue
        doc = {
            "id": l.get("id") or str(uuid.uuid4()), "tipo": l["tipo"], "data": l["data"], "descricao": l["descricao"],
            "valor": l["valor"], "observacao": l.get("observacao") or "",
            "created_at": l.get("created_at") or (base + timedelta(microseconds=i)).isoformat(),
            "parcela": l.get("parcela"), "parcelas": l.get("parcelas"), "grupo_id": l.get("grupo_id"),
        }
        ids_atuais.add(doc["id"])
        novos.append(doc)
    if novos:
        await db.lancamentos.insert_many(novos)

    # 5) Investimentos — substituir grava todos; mesclar só preenche meses vazios
    for inv in invs:
        if body.modo == "substituir":
            await db.investimentos.update_one({"ano": inv["ano"], "mes": inv["mes"]}, {"$set": {"valor": inv["valor"]}}, upsert=True)
        else:
            await db.investimentos.update_one({"ano": inv["ano"], "mes": inv["mes"]}, {"$setOnInsert": {"valor": inv["valor"]}}, upsert=True)

    return ImportarOut(
        formato=formato, modo=body.modo, lancamentos_importados=len(novos), lancamentos_ignorados=ignorados,
        categorias_criadas=criadas, investimentos=len(invs), linhas_invalidas=invalidas,
    )
