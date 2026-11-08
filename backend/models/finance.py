"""Pydantic models for the financial control app. Mirrored by frontend/src/lib/types.ts."""

import uuid
from datetime import date, datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Tipo = Literal["receita", "despesa"]


def _uuid() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Categorias (observações de despesas) ----------
class CategoriaIn(BaseModel):
    nome: str = Field(min_length=1, max_length=40)
    cor: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")

    @field_validator("nome")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("nome obrigatório")
        return v


class Categoria(CategoriaIn):
    id: str = Field(default_factory=_uuid)
    ordem: int = 0


class CategoriaComUso(Categoria):
    qtd: int
    total: float


# ---------- Lançamentos ----------
class LancamentoIn(BaseModel):
    tipo: Tipo
    data: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    descricao: str = Field(min_length=1, max_length=120)
    valor: float = Field(gt=0)
    observacao: str = Field(default="", max_length=60)

    @field_validator("data")
    @classmethod
    def _valid_date(cls, v: str) -> str:
        date.fromisoformat(v)
        return v

    @field_validator("descricao", "observacao")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()


class Lancamento(LancamentoIn):
    id: str = Field(default_factory=_uuid)
    created_at: str = Field(default_factory=_now_iso)


# ---------- Investimento ----------
class InvestimentoIn(BaseModel):
    valor: float | None = Field(default=None, ge=0)


class Investimento(BaseModel):
    ano: int
    mes: int
    valor: float | None


# ---------- Resumos ----------
class CategoriaTotal(BaseModel):
    nome: str
    cor: str
    valor: float
    pct: float
    qtd: int


class MesResumo(BaseModel):
    mes: int
    entradas: float
    saidas: float
    saldo: float
    investimento: float | None


class ResumoMensal(MesResumo):
    ano: int
    por_categoria: list[CategoriaTotal]
    sem_categoria: float


class ResumoAnual(BaseModel):
    ano: int
    meses: list[MesResumo]
    total_entradas: float
    total_saidas: float
    total_saldo: float
    por_categoria: list[CategoriaTotal]


class PontoMes(BaseModel):
    mes: int
    valor: float


class AnaliseCategoria(BaseModel):
    categoria: str
    cor: str
    ano: int
    mes: int | None
    total: float
    qtd: int
    media: float
    total_ano: float
    evolucao: list[PontoMes]
    lancamentos: list[Lancamento]


class Hoje(BaseModel):
    data: str
    ano: int
    mes: int


class Anos(BaseModel):
    anos: list[int]
