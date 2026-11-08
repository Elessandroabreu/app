import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import type {
  AnaliseCategoria,
  Anos,
  Categoria,
  CategoriaComUso,
  CategoriaIn,
  Hoje,
  Investimento,
  InvestimentoIn,
  Lancamento,
  LancamentoIn,
  ResumoAnual,
  ResumoMensal,
  Tipo,
} from "@/lib/types";

export const useHoje = () =>
  useQuery({ queryKey: ["hoje"], queryFn: () => apiGet<Hoje>("/hoje"), staleTime: 60 * 60 * 1000 });

export const useAnos = () => useQuery({ queryKey: ["anos"], queryFn: () => apiGet<Anos>("/anos") });

export const useCategorias = () =>
  useQuery({ queryKey: ["categorias"], queryFn: () => apiGet<CategoriaComUso[]>("/categorias") });

export const useLancamentos = (ano: number, mes: number, tipo: Tipo) =>
  useQuery({
    queryKey: ["lancamentos", ano, mes, tipo],
    queryFn: () => apiGet<Lancamento[]>(`/lancamentos?ano=${ano}&mes=${mes}&tipo=${tipo}`),
  });

export const useResumoMensal = (ano: number, mes: number) =>
  useQuery({
    queryKey: ["resumo", "mensal", ano, mes],
    queryFn: () => apiGet<ResumoMensal>(`/resumo/mensal?ano=${ano}&mes=${mes}`),
  });

export const useResumoAnual = (ano: number) =>
  useQuery({ queryKey: ["resumo", "anual", ano], queryFn: () => apiGet<ResumoAnual>(`/resumo/anual?ano=${ano}`) });

export const useAnalise = (categoria: string | null, ano: number, mes: number | null) =>
  useQuery({
    queryKey: ["analise", categoria, ano, mes],
    enabled: !!categoria,
    queryFn: () =>
      apiGet<AnaliseCategoria>(
        `/analise?categoria=${encodeURIComponent(categoria ?? "")}&ano=${ano}${mes ? `&mes=${mes}` : ""}`,
      ),
  });

/** Any write can change totals everywhere — refresh every data query (not "hoje"). */
function useInvalidarTudo() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "hoje" });
}

export function useSalvarLancamento() {
  const invalidar = useInvalidarTudo();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: LancamentoIn }) =>
      id ? apiPut<Lancamento>(`/lancamentos/${id}`, body) : apiPost<Lancamento>("/lancamentos", body),
    onSuccess: invalidar,
  });
}

export function useExcluirLancamento() {
  const invalidar = useInvalidarTudo();
  return useMutation({ mutationFn: (id: string) => apiDelete<void>(`/lancamentos/${id}`), onSuccess: invalidar });
}

export function useSalvarCategoria() {
  const invalidar = useInvalidarTudo();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: CategoriaIn }) =>
      id ? apiPut<Categoria>(`/categorias/${id}`, body) : apiPost<Categoria>("/categorias", body),
    onSuccess: invalidar,
  });
}

export function useExcluirCategoria() {
  const invalidar = useInvalidarTudo();
  return useMutation({ mutationFn: (id: string) => apiDelete<void>(`/categorias/${id}`), onSuccess: invalidar });
}

export function useSalvarInvestimento() {
  const invalidar = useInvalidarTudo();
  return useMutation({
    mutationFn: ({ ano, mes, body }: { ano: number; mes: number; body: InvestimentoIn }) =>
      apiPut<Investimento>(`/investimentos/${ano}/${mes}`, body),
    onSuccess: invalidar,
  });
}
