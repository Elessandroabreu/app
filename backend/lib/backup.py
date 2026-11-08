"""Backup em Excel: exporta tudo (lançamentos, categorias, investimentos) e lê de volta."""

from datetime import date, datetime, timezone
from io import BytesIO

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

LANC_COLS = ["ID", "Tipo", "Data", "Descrição", "Valor", "Observação", "Parcela", "Total parcelas", "Grupo", "Criado em"]
CAT_COLS = ["ID", "Nome", "Cor", "Recorrente", "Ordem"]
INV_COLS = ["Ano", "Mês", "Valor"]

HEAD_FONT = Font(bold=True, color="FFFFFF")
HEAD_FILL = PatternFill("solid", fgColor="1E293B")
BRL = '"R$" #,##0.00'


def _sheet(wb, titulo: str, cols: list[str], larguras: list[int]):
    ws = wb.create_sheet(titulo)
    ws.append(cols)
    for i, w in enumerate(larguras, start=1):
        c = ws.cell(1, i)
        c.font, c.fill, c.alignment = HEAD_FONT, HEAD_FILL, Alignment(horizontal="center")
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A2"
    return ws


def exportar(lancamentos: list[dict], categorias: list[dict], investimentos: list[dict]) -> bytes:
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    ws = _sheet(wb, "Lançamentos", LANC_COLS, [38, 10, 12, 36, 14, 18, 9, 14, 38, 30])
    for l in lancamentos:
        ws.append([
            l["id"], "Receita" if l["tipo"] == "receita" else "Despesa", date.fromisoformat(l["data"]), l["descricao"],
            l["valor"], l.get("observacao") or "", l.get("parcela"), l.get("parcelas"), l.get("grupo_id"), l.get("created_at"),
        ])
        ws.cell(ws.max_row, 3).number_format = "DD/MM/YYYY"
        ws.cell(ws.max_row, 5).number_format = BRL

    ws = _sheet(wb, "Categorias", CAT_COLS, [38, 22, 10, 12, 8])
    for c in categorias:
        ws.append([c["id"], c["nome"], c["cor"], "Sim" if c.get("recorrente") else "Não", c.get("ordem", 0)])

    ws = _sheet(wb, "Investimentos", INV_COLS, [8, 6, 16])
    for i in investimentos:
        ws.append([i["ano"], i["mes"], i.get("valor")])
        ws.cell(ws.max_row, 3).number_format = BRL

    ws = wb.create_sheet("Info")
    ws.append(["FinanControl — backup"])
    ws.append(["Exportado em", datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")])
    ws.append(["Como restaurar", "No sistema, abra Backup → Importar e escolha este arquivo."])
    ws["A1"].font = Font(bold=True, size=14)
    ws.column_dimensions["A"].width = 18
    ws.column_dimensions["B"].width = 60

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ---------------- leitura ----------------
def _data(v) -> str | None:
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, str):
        s = v.strip()
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d/%m/%y"):
            try:
                return datetime.strptime(s, fmt).date().isoformat()
            except ValueError:
                continue
    return None


def _num(v) -> float | None:
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        t = v.replace("R$", "").replace(" ", "")
        if "," in t:
            t = t.replace(".", "").replace(",", ".")
        try:
            return float(t)
        except ValueError:
            return None
    return None


def _int(v) -> int | None:
    n = _num(v)
    return int(n) if n is not None else None


def _txt(v) -> str:
    return str(v).strip() if v is not None else ""


def _linhas(ws) -> list[dict]:
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    head = [_txt(h) for h in rows[0]]
    return [dict(zip(head, r)) for r in rows[1:] if any(c is not None and _txt(c) for c in r)]


def eh_backup(wb) -> bool:
    return "Lançamentos" in wb.sheetnames


def ler_backup(wb) -> tuple[list[dict], list[dict], list[dict], int]:
    """Returns (lançamentos, categorias, investimentos, linhas inválidas)."""
    invalidas = 0
    lancs = []
    for r in _linhas(wb["Lançamentos"]):
        data, valor, desc = _data(r.get("Data")), _num(r.get("Valor")), _txt(r.get("Descrição"))
        tipo = "receita" if _txt(r.get("Tipo")).lower().startswith("rec") else "despesa"
        if not data or valor is None or valor <= 0:
            invalidas += 1
            continue
        lancs.append({
            "id": _txt(r.get("ID")) or None, "tipo": tipo, "data": data, "descricao": (desc or "Sem descrição")[:120],
            "valor": round(valor, 2), "observacao": _txt(r.get("Observação"))[:60],
            "parcela": _int(r.get("Parcela")), "parcelas": _int(r.get("Total parcelas")),
            "grupo_id": _txt(r.get("Grupo")) or None, "created_at": _txt(r.get("Criado em")) or None,
        })
    cats = []
    if "Categorias" in wb.sheetnames:
        for r in _linhas(wb["Categorias"]):
            nome = _txt(r.get("Nome"))[:40]
            cor = _txt(r.get("Cor")).upper()
            if not nome:
                continue
            cats.append({
                "id": _txt(r.get("ID")) or None, "nome": nome,
                "cor": cor if len(cor) == 7 and cor.startswith("#") else None,
                "recorrente": _txt(r.get("Recorrente")).lower() in ("sim", "true", "1", "s"),
                "ordem": _int(r.get("Ordem")),
            })
    invs = []
    if "Investimentos" in wb.sheetnames:
        for r in _linhas(wb["Investimentos"]):
            ano, mes = _int(r.get("Ano")), _int(r.get("Mês"))
            if ano and mes and 1 <= mes <= 12:
                invs.append({"ano": ano, "mes": mes, "valor": _num(r.get("Valor"))})
    return lancs, cats, invs, invalidas
