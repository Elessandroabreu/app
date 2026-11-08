// Hand-written mirrors of backend/models/finance.py — keep in sync.
export type Tipo = "receita" | "despesa";

export interface CategoriaIn {
  nome: string;
  cor: string;
  recorrente: boolean;
}
export interface Categoria extends CategoriaIn {
  id: string;
  ordem: number;
}
export interface CategoriaComUso extends Categoria {
  qtd: number;
  total: number;
}

export interface LancamentoIn {
  tipo: Tipo;
  data: string; // YYYY-MM-DD
  descricao: string;
  valor: number;
  observacao: string;
}
export interface Lancamento extends LancamentoIn {
  id: string;
  created_at: string;
  parcela: number | null;
  parcelas: number | null;
  grupo_id: string | null;
}

export interface ParceladoIn extends LancamentoIn {
  parcelas: number;
  dividir: boolean;
}

export interface ImportarIn {
  arquivo_base64: string;
  modo: "substituir" | "mesclar";
  confirmacao: string | null;
}
export interface ImportarOut {
  formato: "backup" | "planilha";
  modo: "substituir" | "mesclar";
  lancamentos_importados: number;
  lancamentos_ignorados: number;
  categorias_criadas: number;
  investimentos: number;
  linhas_invalidas: number;
}

export interface CopiarIn {
  ano: number;
  mes: number;
  ids: string[];
}
export interface CopiarOut {
  criados: number;
  ignorados: number;
  ano_destino: number;
  mes_destino: number;
}

export interface InvestimentoIn {
  valor: number | null;
}
export interface Investimento {
  ano: number;
  mes: number;
  valor: number | null;
}

export interface CategoriaTotal {
  nome: string;
  cor: string;
  valor: number;
  pct: number;
  qtd: number;
}

export interface MesResumo {
  mes: number;
  entradas: number;
  saidas: number;
  saldo: number;
  investimento: number | null;
}
export interface ResumoMensal extends MesResumo {
  ano: number;
  por_categoria: CategoriaTotal[];
  sem_categoria: number;
}
export interface ResumoAnual {
  ano: number;
  meses: MesResumo[];
  total_entradas: number;
  total_saidas: number;
  total_saldo: number;
  por_categoria: CategoriaTotal[];
}

export interface PontoMes {
  mes: number;
  valor: number;
}
export interface AnaliseCategoria {
  categoria: string;
  cor: string;
  ano: number;
  mes: number | null;
  total: number;
  qtd: number;
  media: number;
  total_ano: number;
  evolucao: PontoMes[];
  lancamentos: Lancamento[];
}

export interface Hoje {
  data: string;
  ano: number;
  mes: number;
}
export interface Anos {
  anos: number[];
}
