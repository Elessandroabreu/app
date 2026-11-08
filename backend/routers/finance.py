"""Financial control routes: categorias, lançamentos, investimentos and resumos."""

import calendar
import re

from fastapi import APIRouter, HTTPException, Query, Response

from lib.dates import today_iso
from lib.db import db
from models.finance import (
    AnaliseCategoria,
    Anos,
    Categoria,
    CategoriaComUso,
    CategoriaIn,
    CategoriaTotal,
    Hoje,
    Investimento,
    InvestimentoIn,
    Lancamento,
    LancamentoIn,
    MesResumo,
    PontoMes,
    ResumoAnual,
    ResumoMensal,
    Tipo,
)

router = APIRouter()

SEM_ID = {"_id": 0}


def _range(ano: int, mes: int | None) -> tuple[str, str]:
    if mes is None:
        return f"{ano:04d}-01-01", f"{ano:04d}-12-31"
    last = calendar.monthrange(ano, mes)[1]
    return f"{ano:04d}-{mes:02d}-01", f"{ano:04d}-{mes:02d}-{last:02d}"


async def _lancamentos(ano: int, mes: int | None = None, tipo: str | None = None, observacao: str | None = None) -> list[dict]:
    ini, fim = _range(ano, mes)
    q: dict = {"data": {"$gte": ini, "$lte": fim}}
    if tipo:
        q["tipo"] = tipo
    if observacao is not None:
        q["observacao"] = observacao
    return await db.lancamentos.find(q, SEM_ID).sort([("data", 1), ("created_at", 1)]).to_list(20000)


async def _categorias() -> list[dict]:
    return await db.categorias.find({}, SEM_ID).sort([("ordem", 1), ("nome", 1)]).to_list(500)


def _por_categoria(despesas: list[dict], cats: list[dict]) -> tuple[list[CategoriaTotal], float]:
    soma: dict[str, float] = {c["nome"]: 0.0 for c in cats}
    qtd: dict[str, int] = {c["nome"]: 0 for c in cats}
    sem = 0.0
    for d in despesas:
        obs = d.get("observacao") or ""
        if obs in soma:
            soma[obs] += d["valor"]
            qtd[obs] += 1
        else:
            sem += d["valor"]
    total = sum(soma.values())
    out = [
        CategoriaTotal(
            nome=c["nome"],
            cor=c["cor"],
            valor=round(soma[c["nome"]], 2),
            pct=round(soma[c["nome"]] / total * 100, 2) if total else 0.0,
            qtd=qtd[c["nome"]],
        )
        for c in cats
    ]
    return out, round(sem, 2)


# ---------------- util ----------------
@router.get("/hoje", response_model=Hoje)
async def hoje():
    d = today_iso()
    return Hoje(data=d, ano=int(d[:4]), mes=int(d[5:7]))


@router.get("/anos", response_model=Anos)
async def anos():
    datas = await db.lancamentos.distinct("data")
    atual = int(today_iso()[:4])
    s = {int(d[:4]) for d in datas} | {atual - 1, atual, atual + 1}
    return Anos(anos=sorted(s))


# ---------------- categorias ----------------
@router.get("/categorias", response_model=list[CategoriaComUso])
async def listar_categorias():
    cats = await _categorias()
    agg = await db.lancamentos.aggregate([
        {"$match": {"tipo": "despesa"}},
        {"$group": {"_id": "$observacao", "qtd": {"$sum": 1}, "total": {"$sum": "$valor"}}},
    ]).to_list(1000)
    uso = {a["_id"]: a for a in agg}
    return [
        CategoriaComUso(**c, qtd=uso.get(c["nome"], {}).get("qtd", 0), total=round(uso.get(c["nome"], {}).get("total", 0.0), 2))
        for c in cats
    ]


async def _nome_existe(nome: str, exceto_id: str | None = None) -> bool:
    q: dict = {"nome": {"$regex": f"^{re.escape(nome)}$", "$options": "i"}}
    if exceto_id:
        q["id"] = {"$ne": exceto_id}
    return await db.categorias.find_one(q) is not None


@router.post("/categorias", response_model=Categoria, status_code=201)
async def criar_categoria(body: CategoriaIn):
    if await _nome_existe(body.nome):
        raise HTTPException(409, "Já existe uma categoria com esse nome")
    ultima = await db.categorias.find_one({}, sort=[("ordem", -1)])
    cat = Categoria(**body.model_dump(), ordem=(ultima["ordem"] + 1) if ultima else 0)
    await db.categorias.insert_one(cat.model_dump())
    return cat


@router.put("/categorias/{id}", response_model=Categoria)
async def editar_categoria(id: str, body: CategoriaIn):
    atual = await db.categorias.find_one({"id": id}, SEM_ID)
    if not atual:
        raise HTTPException(404, "Categoria não encontrada")
    if await _nome_existe(body.nome, exceto_id=id):
        raise HTTPException(409, "Já existe uma categoria com esse nome")
    await db.categorias.update_one({"id": id}, {"$set": body.model_dump()})
    if atual["nome"] != body.nome:  # renomear também os lançamentos que usam a categoria
        await db.lancamentos.update_many({"tipo": "despesa", "observacao": atual["nome"]}, {"$set": {"observacao": body.nome}})
    return Categoria(**{**atual, **body.model_dump()})


@router.delete("/categorias/{id}", status_code=204)
async def excluir_categoria(id: str):
    atual = await db.categorias.find_one({"id": id}, SEM_ID)
    if not atual:
        raise HTTPException(404, "Categoria não encontrada")
    em_uso = await db.lancamentos.count_documents({"tipo": "despesa", "observacao": atual["nome"]})
    if em_uso:
        raise HTTPException(409, f"Categoria em uso por {em_uso} lançamento(s). Altere esses lançamentos antes de excluir.")
    await db.categorias.delete_one({"id": id})
    return Response(status_code=204)


# ---------------- lançamentos ----------------
async def _validar_obs(body: LancamentoIn) -> None:
    if body.tipo == "despesa" and body.observacao:
        if not await db.categorias.find_one({"nome": body.observacao}):
            raise HTTPException(400, f"Categoria '{body.observacao}' não existe")


@router.get("/lancamentos", response_model=list[Lancamento])
async def listar_lancamentos(
    ano: int = Query(ge=1900, le=3000),
    mes: int | None = Query(default=None, ge=1, le=12),
    tipo: Tipo | None = None,
    observacao: str | None = None,
):
    return [Lancamento(**d) for d in await _lancamentos(ano, mes, tipo, observacao)]


@router.post("/lancamentos", response_model=Lancamento, status_code=201)
async def criar_lancamento(body: LancamentoIn):
    await _validar_obs(body)
    lanc = Lancamento(**body.model_dump())
    await db.lancamentos.insert_one(lanc.model_dump())
    return lanc


@router.put("/lancamentos/{id}", response_model=Lancamento)
async def editar_lancamento(id: str, body: LancamentoIn):
    atual = await db.lancamentos.find_one({"id": id}, SEM_ID)
    if not atual:
        raise HTTPException(404, "Lançamento não encontrado")
    await _validar_obs(body)
    await db.lancamentos.update_one({"id": id}, {"$set": body.model_dump()})
    return Lancamento(**{**atual, **body.model_dump()})


@router.delete("/lancamentos/{id}", status_code=204)
async def excluir_lancamento(id: str):
    res = await db.lancamentos.delete_one({"id": id})
    if not res.deleted_count:
        raise HTTPException(404, "Lançamento não encontrado")
    return Response(status_code=204)


# ---------------- investimentos ----------------
@router.put("/investimentos/{ano}/{mes}", response_model=Investimento)
async def salvar_investimento(ano: int, mes: int, body: InvestimentoIn):
    if not 1 <= mes <= 12:
        raise HTTPException(422, "mês inválido")
    await db.investimentos.update_one({"ano": ano, "mes": mes}, {"$set": {"valor": body.valor}}, upsert=True)
    return Investimento(ano=ano, mes=mes, valor=body.valor)


async def _investimentos(ano: int) -> dict[int, float | None]:
    docs = await db.investimentos.find({"ano": ano}, SEM_ID).to_list(12)
    return {d["mes"]: d.get("valor") for d in docs}


# ---------------- resumos ----------------
@router.get("/resumo/mensal", response_model=ResumoMensal)
async def resumo_mensal(ano: int = Query(ge=1900, le=3000), mes: int = Query(ge=1, le=12)):
    lancs = await _lancamentos(ano, mes)
    cats = await _categorias()
    entradas = sum(l["valor"] for l in lancs if l["tipo"] == "receita")
    despesas = [l for l in lancs if l["tipo"] == "despesa"]
    saidas = sum(l["valor"] for l in despesas)
    por_cat, sem = _por_categoria(despesas, cats)
    inv = (await _investimentos(ano)).get(mes)
    return ResumoMensal(
        ano=ano, mes=mes, entradas=round(entradas, 2), saidas=round(saidas, 2),
        saldo=round(entradas - saidas, 2), investimento=inv, por_categoria=por_cat, sem_categoria=sem,
    )


@router.get("/resumo/anual", response_model=ResumoAnual)
async def resumo_anual(ano: int = Query(ge=1900, le=3000)):
    lancs = await _lancamentos(ano)
    cats = await _categorias()
    inv = await _investimentos(ano)
    meses = []
    for m in range(1, 13):
        e = sum(l["valor"] for l in lancs if l["tipo"] == "receita" and int(l["data"][5:7]) == m)
        s = sum(l["valor"] for l in lancs if l["tipo"] == "despesa" and int(l["data"][5:7]) == m)
        meses.append(MesResumo(mes=m, entradas=round(e, 2), saidas=round(s, 2), saldo=round(e - s, 2), investimento=inv.get(m)))
    por_cat, _ = _por_categoria([l for l in lancs if l["tipo"] == "despesa"], cats)
    te = sum(m.entradas for m in meses)
    ts = sum(m.saidas for m in meses)
    return ResumoAnual(
        ano=ano, meses=meses, total_entradas=round(te, 2), total_saidas=round(ts, 2),
        total_saldo=round(te - ts, 2), por_categoria=sorted(por_cat, key=lambda c: -c.valor),
    )


@router.get("/analise", response_model=AnaliseCategoria)
async def analise(
    categoria: str,
    ano: int = Query(ge=1900, le=3000),
    mes: int | None = Query(default=None, ge=1, le=12),
):
    cat = await db.categorias.find_one({"nome": categoria}, SEM_ID)
    if not cat:
        raise HTTPException(404, "Categoria não encontrada")
    ano_lancs = await _lancamentos(ano, None, "despesa", categoria)
    evolucao = [
        PontoMes(mes=m, valor=round(sum(l["valor"] for l in ano_lancs if int(l["data"][5:7]) == m), 2))
        for m in range(1, 13)
    ]
    sel = [l for l in ano_lancs if mes is None or int(l["data"][5:7]) == mes]
    total = sum(l["valor"] for l in sel)
    return AnaliseCategoria(
        categoria=categoria, cor=cat["cor"], ano=ano, mes=mes, total=round(total, 2), qtd=len(sel),
        media=round(total / len(sel), 2) if sel else 0.0,
        total_ano=round(sum(p.valor for p in evolucao), 2),
        evolucao=evolucao, lancamentos=[Lancamento(**l) for l in sel],
    )
