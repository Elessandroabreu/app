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
    recorrente: bool = False  # pré-selecionada ao copiar despesas para o próximo mês

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
    # Preenchidos só em compras parceladas: parcela 2 de 3 do grupo X
    parcela: int | None = None
    parcelas: int | None = None
    grupo_id: str | None = None


class ParceladoIn(LancamentoIn):
    parcelas: int = Field(ge=2, le=24)
    dividir: bool = False  # True: `valor` é o total da compra e será dividido; False: `valor` é o de cada parcela


class ImportarIn(BaseModel):
    arquivo_base64: str = Field(min_length=10)
    modo: Literal["substituir", "mesclar"]
    confirmacao: str | None = None  # obrigatório "SUBSTITUIR" quando modo=substituir


class ImportarOut(BaseModel):
    formato: Literal["backup", "planilha"]
    modo: Literal["substituir", "mesclar"]
    lancamentos_importados: int
    lancamentos_ignorados: int
    categorias_criadas: int
    investimentos: int
    linhas_invalidas: int


class CopiarIn(BaseModel):
    ano: int = Field(ge=1900, le=3000)
    mes: int = Field(ge=1, le=12)
    ids: list[str] = Field(min_length=1)


class CopiarOut(BaseModel):
    criados: int
    ignorados: int
    ano_destino: int
    mes_destino: int


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
