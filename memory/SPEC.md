# FinanControl — SPEC

Personal finance control (pt-BR, BRL), built from the user's spreadsheet `CONTROLE_FINANCEIRO_2026.xlsx`
(stored at `backend/data/`). Installable PWA (manifest + `/sw.js`), data in MongoDB. **No login** (user chose no PIN).

## Data model (Mongo)
- `categorias` {id, nome (unique, case-insensitive), cor #RRGGBB, ordem} — "observações" of despesas.
- `lancamentos` {id, tipo receita|despesa, data YYYY-MM-DD, descricao, valor>0, observacao, created_at}
  - despesa.observacao must be "" or an existing categoria nome; receita.observacao is free text (e.g. "PG").
- `investimentos` {ano, mes, valor|null} — manual monthly invested balance (column F of "Relatório Geral").

## API (all under /api)
- GET /hoje, GET /anos
- GET/POST /categorias, PUT/DELETE /categorias/{id} (rename cascades to lancamentos; delete → 409 if in use; dup → 409)
- GET /lancamentos?ano&mes&tipo&observacao, POST, PUT/DELETE /lancamentos/{id}
- PUT /investimentos/{ano}/{mes} {valor}
- GET /resumo/mensal?ano&mes, GET /resumo/anual?ano, GET /analise?categoria&ano[&mes]

## Pages
- `/` Painel do mês: year select + month pills, KPIs, Receitas/Despesas tables (add/edit/delete/search), donut by categoria.
- `/relatorio` 12-month table (click month → painel; edit investimento), Entradas×Saídas chart, yearly categories.
- `/analise?categoria=X&mes=N|ano` total/qtd/média per categoria + evolution chart + comparison + entries list.
- `/categorias` create (name + color), rename/recolor, delete.

## Seed (`cd /app/backend && python seed.py`, idempotent)
- 8 default categorias: Gasolina, Mercado, Padaria, Compra Online, Lanche, Extras, Parcelamento, Fixo.
- 160 lançamentos from sheets OUT, NOV, DEZ of 2026 (other months empty). Investimentos 2026: Mar 129723,
  Mai 144320, Jun 151000, Jul 160400, Ago 168100, Set 175500, Out 180843.
- Deviation: DEZ-sheet receitas were dated November in the spreadsheet (copy/paste); they are imported into December (same day).
- Out/2026 receitas total R$ 13.236,00. Nov/2026 has 14 receitas.
