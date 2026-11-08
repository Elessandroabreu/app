import { useMemo, useState, type ReactNode } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl, dataCurta } from "@/lib/format";
import type { Lancamento, Tipo } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  tipo: Tipo;
  titulo: string;
  itens: Lancamento[];
  carregando: boolean;
  erro: boolean;
  cores: Record<string, string>;
  onAdd?: () => void;
  onEdit?: (l: Lancamento) => void;
  onDelete?: (l: Lancamento) => void;
  extraAction?: ReactNode;
  className?: string;
  maxHeight?: string;
}

export default function LancamentosTable({
  tipo, titulo, itens, carregando, erro, cores, onAdd, onEdit, onDelete, extraAction, className, maxHeight = "max-h-[560px]",
}: Props) {
  const [busca, setBusca] = useState("");
  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return itens;
    return itens.filter((l) => l.descricao.toLowerCase().includes(t) || l.observacao.toLowerCase().includes(t));
  }, [itens, busca]);
  const total = filtrados.reduce((s, l) => s + l.valor, 0);
  const isDespesa = tipo === "despesa";
  const acoes = !!(onEdit || onDelete);

  return (
    <section
      data-testid={`table-${tipo}s`}
      className={cn("flex flex-col rounded-xl border border-slate-800 bg-slate-900/80 shadow-sm backdrop-blur-sm", className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className={cn("size-2 rounded-full", isDespesa ? "bg-rose-400" : "bg-emerald-400")} />
          <h2 className="font-heading text-lg font-semibold text-slate-100">{titulo}</h2>
          <span data-testid={`${tipo}-count`} className="rounded-md bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-slate-400">
            {filtrados.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
            <Input
              data-testid={`${tipo}-search-input`}
              placeholder="Buscar…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 w-36 border-slate-700 bg-slate-950/60 pl-8 text-sm"
            />
          </div>
          {extraAction}
          {onAdd && (
            <Button data-testid={`btn-add-${tipo}`} size="sm" variant="outline" onClick={onAdd} className="gap-1 border-slate-700">
              <Plus className="size-4" /> Adicionar
            </Button>
          )}
        </div>
      </header>

      <div className={cn("overflow-auto", maxHeight)}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-900/95 text-xs uppercase tracking-wide text-slate-500 backdrop-blur">
            <tr>
              <th className="px-5 py-2.5 text-left font-medium">Data</th>
              <th className="px-2 py-2.5 text-left font-medium">Descrição</th>
              <th className="px-2 py-2.5 text-left font-medium">{isDespesa ? "Categoria" : "Obs."}</th>
              <th className="px-2 py-2.5 text-right font-medium">Valor</th>
              {acoes && <th className="w-16 px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {carregando &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t border-slate-800/60">
                  <td colSpan={5} className="px-5 py-3">
                    <div className="h-4 animate-pulse rounded bg-slate-800/70" />
                  </td>
                </tr>
              ))}
            {!carregando && (erro || filtrados.length === 0) && (
              <tr>
                <td colSpan={5} data-testid={`${tipo}-empty`} className="px-5 py-10 text-center text-slate-500">
                  {erro ? "Não foi possível carregar os lançamentos" : busca ? "Nada encontrado" : "Nenhum lançamento neste mês"}
                </td>
              </tr>
            )}
            {!carregando &&
              !erro &&
              filtrados.map((l) => (
                <tr
                  key={l.id}
                  data-testid={`${tipo}-row`}
                  className="group border-t border-slate-800/60 transition-colors duration-100 even:bg-[#131C2E]/60 hover:bg-slate-800/50"
                >
                  <td className="whitespace-nowrap px-5 py-2 font-mono text-xs text-slate-400">{dataCurta(l.data)}</td>
                  <td className="px-2 py-2 text-slate-200" data-testid={`${tipo}-row-descricao`}>
                    {l.descricao}
                    {l.parcela && l.parcelas && (
                      <span
                        data-testid={`${tipo}-row-parcela`}
                        className="ml-2 rounded bg-amber-500/10 px-1.5 py-px font-mono text-[11px] text-amber-300"
                      >
                        {l.parcela}/{l.parcelas}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {l.observacao ? (
                      isDespesa ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-700/70 bg-slate-950/50 px-2 py-0.5 text-xs text-slate-300">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: cores[l.observacao] ?? "#64748B" }} />
                          {l.observacao}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">{l.observacao}</span>
                      )
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td
                    data-testid={`${tipo}-row-valor`}
                    className={cn("whitespace-nowrap px-2 py-2 text-right font-mono tabular-nums", isDespesa ? "text-rose-300" : "text-emerald-300")}
                  >
                    {brl(l.valor)}
                  </td>
                  {acoes && (
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-0.5 opacity-60 transition-opacity duration-150 group-hover:opacity-100">
                        {onEdit && (
                          <button
                            type="button"
                            aria-label="Editar lançamento"
                            data-testid={`${tipo}-edit-button`}
                            onClick={() => onEdit(l)}
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-100"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            aria-label="Excluir lançamento"
                            data-testid={`${tipo}-delete-button`}
                            onClick={() => onDelete(l)}
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-rose-950 hover:text-rose-300"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <footer className="mt-auto flex items-center justify-between border-t border-slate-800 px-5 py-3">
        <span className="text-sm font-medium text-slate-400">Total{busca && " (filtrado)"}</span>
        <span
          data-testid={`${tipo}-total`}
          className={cn("font-mono text-base font-semibold tabular-nums", isDespesa ? "text-rose-300" : "text-emerald-300")}
        >
          {brl(total)}
        </span>
      </footer>
    </section>
  );
}
