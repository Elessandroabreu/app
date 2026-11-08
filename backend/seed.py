"""Idempotent seed: default categorias + data imported from the user's spreadsheet.

Run: cd /app/backend && python seed.py
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from lib.db import db, ensure_indexes
from lib.planilha import CATEGORIAS_PADRAO, parse_planilha

PLANILHA = Path(__file__).parent / "data" / "CONTROLE_FINANCEIRO_2026.xlsx"


async def main() -> None:
    await ensure_indexes()

    for ordem, (nome, cor) in enumerate(CATEGORIAS_PADRAO):
        if not await db.categorias.find_one({"nome": nome}):
            await db.categorias.insert_one({"id": str(uuid.uuid4()), "nome": nome, "cor": cor, "ordem": ordem})
    # Fixo já começa marcada como recorrente (só se o usuário ainda não definiu)
    await db.categorias.update_many(
        {"nome": "Fixo", "recorrente": {"$exists": False}}, {"$set": {"recorrente": True}}
    )

    if await db.lancamentos.count_documents({}) > 0:
        print("lançamentos já existem — importação ignorada")
        return

    ano, lancs, investimentos = parse_planilha(str(PLANILHA))
    base = datetime.now(timezone.utc)
    docs = [
        {**l, "id": str(uuid.uuid4()), "created_at": (base + timedelta(microseconds=i)).isoformat()}
        for i, l in enumerate(lancs)
    ]
    if docs:
        await db.lancamentos.insert_many(docs)
    for mes, valor in investimentos.items():
        await db.investimentos.update_one({"ano": ano, "mes": mes}, {"$setOnInsert": {"valor": valor}}, upsert=True)
    print(f"importados {len(docs)} lançamentos e {len(investimentos)} investimentos de {ano}")


if __name__ == "__main__":
    asyncio.run(main())
