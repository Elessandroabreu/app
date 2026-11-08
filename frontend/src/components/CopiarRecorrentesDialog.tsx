import { useState } from "react";
import { toast } from "sonner";
import { CopyPlus, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCategorias, useCopiarProximoMes, useLancamentos } from "@/lib/queries";
import { usePeriodo } from "@/lib/periodo";
import { MESES, brl, dataCurta, errMsg } from "@/lib/format";
import type { Lancamento } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  despesas: Lancamento[];
  onClose: () => void;
}

const chave = (l: Lancamento) => `${l.data.slice(8, 10)}|${l.descricao}|${l.valor}|${l.observacao}`;

export default function CopiarRecorrentesDialog({ despesas, onClose }: Props) {
  const { ano, mes, setAno, setMes } = usePeriodo();
  const anoD = mes === 12 ? ano + 1 : ano;
  const mesD = mes === 12 ? 1 : mes + 1;
  const { data: categorias = [] } = useCategorias();
  const destino = useLancamentos(anoD, mesD, "despesa");
  const copiar = useCopiarProximoMes();

  const recorrentes = new Set(categorias.filter((c) => c.recorrente).map((c) => c.nome));
  const cores = Object.fromEntries(categorias.map((c) => [c.nome, c.cor]));
  // Conta ocorrências no destino: 2 despesas iguais na origem só contam como copiadas se houver 2 no destino.
  const restantes = new Map<string, number>();
  for (const l of destino.data ?? []) restantes.set(chave(l), (restantes.get(chave(l)) ?? 0) + 1);
  const copiados = new Set<string>();
  for (const l of despesas) {
    const n = restantes.get(chave(l)) ?? 0;
    if (n > 0) {
      copiados.add(l.id);
      restantes.set(chave(l), n - 1);
    }
  }
  const jaCopiado = (l: Lancamento) => copiados.has(l.id);
  const idsRecorrentes = () =>
    despesas.filter((l) => recorrentes.has(l.observacao) && !l.grupo_id && !jaCopiado(l)).map((l) => l.id);

  // null = ainda não mexeu → usa a pré-seleção das categorias recorrentes
  const [sel, setSel] = useState<Set<string> | null>(null);
  const selecionados = sel ?? new Set(idsRecorrentes());
  const toggle = (id: string, on: boolean) => {
    const n = new Set(selecionados);
    if (on) n.add(id);
    else n.delete(id);
    setSel(n);
  };
  const total = despesas.filter((l) => selecionados.has(l.id)).reduce((s, l) => s + l.valor, 0);
  const nomeDestino = `${MESES[mesD - 1]}${anoD !== ano ? ` de ${anoD}` : ""}`;

  async function confirmar() {
    try {
      const r = await copiar.mutateAsync({ ano, mes, ids: [...selecionados] });
      toast.success(`${r.criados} despesa(s) copiada(s) para ${MESES[r.mes_destino - 1]}`, {
        description: r.ignorados ? `${r.ignorados} já existiam e foram ignoradas` : undefined,
        action: {
          label: "Ver mês",
          onClick: () => {
            setAno(r.ano_destino);
            setMes(r.mes_destino);
          },
        },
      });
      onClose();
    } catch (e) {
      toast.error(errMsg(e, "Não foi possível copiar"));
    }
  }

  return (
    <Dialog open onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent data-testid="copiar-dialog" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <Repeat className="size-5 text-primary" /> Copiar despesas para {nomeDestino}
          </DialogTitle>
          <DialogDescription>
            Já vêm marcadas as despesas das categorias recorrentes ({[...recorrentes].join(", ") || "nenhuma"}). Marque ou desmarque o
            que quiser — a data mantém o mesmo dia no mês seguinte.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" data-testid="copiar-sel-recorrentes" onClick={() => setSel(new Set(idsRecorrentes()))}>
            Só recorrentes
          </Button>
          <Button
            size="sm"
            variant="outline"
            data-testid="copiar-sel-todas"
            onClick={() => setSel(new Set(despesas.filter((l) => !jaCopiado(l)).map((l) => l.id)))}
          >
            Todas
          </Button>
          <Button size="sm" variant="ghost" data-testid="copiar-sel-nenhuma" onClick={() => setSel(new Set())}>
            Nenhuma
          </Button>
        </div>

        <div className="max-h-[48vh] overflow-auto rounded-lg border border-slate-800">
          {despesas.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">Nenhuma despesa neste mês para copiar.</p>
          ) : (
            <ul>
              {despesas.map((l) => {
                const copiado = jaCopiado(l);
                const marcado = selecionados.has(l.id);
                return (
                  <li key={l.id} className="border-b border-slate-800/70 last:border-0">
                    <label
                      data-testid="copiar-item"
                      className={cn(
                        "flex cursor-pointer items-center gap-3 px-4 py-2 text-sm transition-colors duration-100 hover:bg-slate-800/50",
                        marcado && "bg-amber-500/5",
                        copiado && "cursor-default opacity-50",
                      )}
                    >
                      <Checkbox
                        data-testid="copiar-item-checkbox"
                        checked={marcado}
                        disabled={copiado}
                        onCheckedChange={(v: boolean) => toggle(l.id, v)}
                      />
                      <span className="w-12 font-mono text-xs text-slate-400">{dataCurta(l.data)}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-200">{l.descricao}</span>
                      {copiado ? (
                        <span data-testid="copiar-item-ja-copiado" className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                          já está em {MESES[mesD - 1]}
                        </span>
                      ) : (
                        l.observacao && (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-400">
                            <span className="size-1.5 rounded-full" style={{ backgroundColor: cores[l.observacao] ?? "#64748B" }} />
                            {l.observacao}
                          </span>
                        )
                      )}
                      <span className="w-24 text-right font-mono tabular-nums text-rose-300">{brl(l.valor)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="items-center gap-3 sm:justify-between">
          <p className="text-sm text-slate-400">
            <span data-testid="copiar-qtd" className="font-mono text-slate-200">{selecionados.size}</span> selecionada(s) ·{" "}
            <span data-testid="copiar-total" className="font-mono text-slate-200">{brl(total)}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} data-testid="copiar-cancelar-button">
              Cancelar
            </Button>
            <Button
              data-testid="copiar-confirmar-button"
              disabled={selecionados.size === 0 || copiar.isPending}
              onClick={() => void confirmar()}
              className="gap-1.5"
            >
              <CopyPlus className="size-4" />
              {copiar.isPending ? "Copiando…" : `Copiar para ${MESES[mesD - 1]}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
