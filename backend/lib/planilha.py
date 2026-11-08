"""Parser for the CONTROLE_FINANCEIRO spreadsheet (Relatório Geral + JAN..DEZ sheets)."""

import calendar
from datetime import date, datetime

import openpyxl

MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]

CATEGORIAS_PADRAO = [
    ("Gasolina", "#F59E0B"),
    ("Mercado", "#10B981"),
    ("Padaria", "#F97316"),
    ("Compra Online", "#38BDF8"),
    ("Lanche", "#F43F5E"),
    ("Extras", "#8B5CF6"),
    ("Parcelamento", "#EAB308"),
    ("Fixo", "#64748B"),
]


def _to_date(v, ano: int, mes: int) -> date | None:
    if isinstance(v, datetime):
        v = v.date()
    if not isinstance(v, date):
        return None
    # Lançamento copiado de outro mês (ex.: aba DEZ com datas de novembro): mantém o dia, ajusta para o mês da aba.
    if v.year != ano or v.month != mes:
        v = date(ano, mes, min(v.day, calendar.monthrange(ano, mes)[1]))
    return v


def _bloco(ws, col_data: int, ano: int, mes: int, tipo: str) -> list[dict]:
    out = []
    for r in range(4, ws.max_row + 1):
        d, desc, valor, obs = (ws.cell(r, col_data + i).value for i in range(4))
        if isinstance(d, str) and d.strip().lower() == "total":
            break
        dt = _to_date(d, ano, mes)
        if dt is None or not isinstance(valor, (int, float)) or valor <= 0:
            continue
        out.append({
            "tipo": tipo,
            "data": dt.isoformat(),
            "descricao": (str(desc).strip() if desc else "") or "Sem descrição",
            "valor": float(valor),
            "observacao": str(obs).strip() if obs else "",
        })
    return out


def parse_planilha(path: str) -> tuple[int, list[dict], dict[int, float]]:
    """Returns (ano, lançamentos, investimentos por mês)."""
    wb = openpyxl.load_workbook(path, data_only=False)
    geral = wb["Relatório Geral"]
    ano = int(geral["I3"].value or date.today().year)
    investimentos: dict[int, float] = {}
    for i in range(12):
        v = geral.cell(4 + i, 6).value
        if isinstance(v, (int, float)):
            investimentos[i + 1] = float(v)
    lancs: list[dict] = []
    for i, nome in enumerate(MESES):
        if nome not in wb.sheetnames:
            continue
        ws = wb[nome]
        lancs += _bloco(ws, 2, ano, i + 1, "receita")   # B..E
        lancs += _bloco(ws, 7, ano, i + 1, "despesa")   # G..J
    return ano, lancs, investimentos
