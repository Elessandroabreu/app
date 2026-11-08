import { ApiError } from "@/lib/api";

const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const brl = (v: number | null | undefined) => brlFmt.format(v ?? 0);
export const brlCompacto = (v: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** "2026-11-06" → "06/11" */
export const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
/** "2026-11-06" → "06/11/2026" */
export const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Aceita "55,50", "1.234,56", "R$ 20" ou "12.5" */
export function parseValor(s: string): number {
  const t = s.replace(/R\$|\s/g, "");
  if (!t) return NaN;
  const norm = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(norm);
  return Number.isFinite(n) ? n : NaN;
}

export const valorParaInput = (v: number) => v.toFixed(2).replace(".", ",");

export function errMsg(e: unknown, fallback = "Não foi possível salvar"): string {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "detail" in e.body) {
    const d = (e.body as { detail: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return fallback;
}

export function primeiroDiaOuHoje(ano: number, mes: number, hoje?: string): string {
  if (hoje && Number(hoje.slice(0, 4)) === ano && Number(hoje.slice(5, 7)) === mes) return hoje;
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}
