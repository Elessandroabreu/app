import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { BarChart3, Check, Pencil, Plus, Repeat, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useCategorias, useExcluirCategoria, useSalvarCategoria } from "@/lib/queries";
import { brl, errMsg } from "@/lib/format";
import type { CategoriaComUso } from "@/lib/types";
import { cn } from "@/lib/utils";

const PALETA = ["#F59E0B", "#10B981", "#F43F5E", "#38BDF8", "#8B5CF6", "#F97316", "#EAB308", "#14B8A6", "#EC4899", "#64748B", "#84CC16", "#6366F1"];

function CorPicker({ cor, onChange, testId }: { cor: string; onChange: (c: string) => void; testId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid={testId}>
      {PALETA.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Cor ${c}`}
          data-testid={`${testId}-${c.slice(1)}`}
          onClick={() => onChange(c)}
          className={cn(
            "size-6 rounded-full border-2 transition-transform duration-150 hover:scale-110",
            cor.toUpperCase() === c ? "border-white" : "border-transparent",
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      <label className="relative size-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-slate-500" title="Outra cor">
        <input
          type="color"
          value={cor}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          data-testid={`${testId}-custom`}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
        <Plus className="absolute inset-0 m-auto size-3 text-slate-400" />
      </label>
    </div>
  );
}

function CategoriaItem({ c, onDelete }: { c: CategoriaComUso; onDelete: (c: CategoriaComUso) => void }) {
  const salvar = useSalvarCategoria();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(c.nome);
  const [cor, setCor] = useState(c.cor);

  async function alternarRecorrente() {
    try {
      await salvar.mutateAsync({ id: c.id, body: { nome: c.nome, cor: c.cor, recorrente: !c.recorrente } });
      toast.success(c.recorrente ? `“${c.nome}” não é mais recorrente` : `“${c.nome}” marcada como recorrente`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function confirmar() {
    if (!nome.trim()) return toast.error("Informe o nome");
    try {
      await salvar.mutateAsync({ id: c.id, body: { nome: nome.trim(), cor, recorrente: c.recorrente } });
      toast.success("Categoria atualizada");
      setEditando(false);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <li
      data-testid={`category-list-item-${c.nome}`}
      className="group rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-slate-700"
      style={{ boxShadow: `inset 3px 0 0 ${editando ? cor : c.cor}` }}
    >
      {editando ? (
        <div className="space-y-3">
          <Input data-testid="category-edit-name-input" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          <CorPicker cor={cor} onChange={setCor} testId="category-edit-color" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" data-testid="category-edit-cancel" onClick={() => { setEditando(false); setNome(c.nome); setCor(c.cor); }}>
              <X className="size-4" /> Cancelar
            </Button>
            <Button size="sm" data-testid="category-edit-save" disabled={salvar.isPending} onClick={() => void confirmar()}>
              <Check className="size-4" /> Salvar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="size-9 shrink-0 rounded-lg" style={{ backgroundColor: `${c.cor}26`, border: `1px solid ${c.cor}66` }}>
            <span className="m-auto mt-[13px] block size-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
          </span>
          <div className="min-w-0 flex-1">
            <p data-testid="category-name" className="flex items-center gap-2 truncate font-medium text-slate-100">
              {c.nome}
              {c.recorrente && (
                <span data-testid="category-recorrente-badge" className="inline-flex items-center gap-1 rounded-full border border-amber-800/60 bg-amber-500/10 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-amber-300">
                  <Repeat className="size-2.5" /> Recorrente
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500">
              <span data-testid="category-usage-badge" className="font-mono">{c.qtd}</span> lançamento(s) ·{" "}
              <span className="font-mono text-slate-400">{brl(c.total)}</span>
            </p>
          </div>
          <div className="flex gap-0.5 opacity-70 transition-opacity duration-150 group-hover:opacity-100">
            <button
              type="button"
              aria-label={c.recorrente ? "Desmarcar recorrente" : "Marcar como recorrente"}
              title={c.recorrente ? "Desmarcar recorrente" : "Marcar como recorrente (copiar todo mês)"}
              data-testid={`category-toggle-recorrente-${c.nome}`}
              aria-pressed={c.recorrente}
              disabled={salvar.isPending}
              onClick={() => void alternarRecorrente()}
              className={cn(
                "rounded p-1.5 transition-colors hover:bg-slate-800",
                c.recorrente ? "text-amber-400 hover:text-amber-300" : "text-slate-400 hover:text-slate-100",
              )}
            >
              <Repeat className="size-4" />
            </button>
            <Link
              to={`/analise?categoria=${encodeURIComponent(c.nome)}`}
              aria-label="Ver análise"
              data-testid={`category-analise-${c.nome}`}
              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-primary"
            >
              <BarChart3 className="size-4" />
            </Link>
            <button type="button" aria-label="Editar categoria" data-testid={`category-edit-${c.nome}`} onClick={() => setEditando(true)} className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100">
              <Pencil className="size-4" />
            </button>
            <button type="button" aria-label="Excluir categoria" data-testid={`category-delete-${c.nome}`} onClick={() => onDelete(c)} className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-950 hover:text-rose-300">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function Categorias() {
  const { data: categorias = [], isLoading, isError } = useCategorias();
  const salvar = useSalvarCategoria();
  const excluir = useExcluirCategoria();
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(PALETA[3]);
  const [recorrente, setRecorrente] = useState(false);
  const [apagar, setApagar] = useState<CategoriaComUso | null>(null);

  async function criar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Informe o nome da categoria");
    try {
      await salvar.mutateAsync({ body: { nome: nome.trim(), cor, recorrente } });
      toast.success(`Categoria “${nome.trim()}” criada`);
      setNome("");
      setRecorrente(false);
    } catch (err) {
      toast.error(errMsg(err));
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Observações das despesas</p>
        <h1 className="mt-1 font-heading text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">Categorias</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Crie quantas quiser (ex.: <i>Compra Física</i>, <i>Farmácia</i>). Elas aparecem na hora de lançar uma despesa, nos gráficos e na análise.
          Renomear uma categoria atualiza todos os lançamentos dela. Categorias marcadas como <b className="text-amber-300">Recorrente</b> vêm
          pré-selecionadas no botão “Copiar p/ próximo mês” do painel.
        </p>
      </div>

      <form
        onSubmit={criar}
        data-testid="category-create-form"
        className="grid gap-4 rounded-xl border border-amber-900/50 bg-gradient-to-br from-amber-950/30 to-slate-900/80 p-5 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end"
      >
        <div className="space-y-1.5">
          <label htmlFor="nova-cat" className="text-sm font-medium text-slate-300">Nova categoria</label>
          <Input id="nova-cat" data-testid="category-name-input" placeholder="Ex.: Compra Física" value={nome} onChange={(e) => setNome(e.target.value)} className="bg-slate-950/60" />
        </div>
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Cor</span>
          <CorPicker cor={cor} onChange={setCor} testId="category-color-picker" />
        </div>
        <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-slate-300" title="Despesas desta categoria vêm pré-marcadas ao copiar para o próximo mês">
          <Checkbox data-testid="category-recorrente-checkbox" checked={recorrente} onCheckedChange={(v: boolean) => setRecorrente(v)} />
          <Repeat className="size-3.5 text-amber-400" /> Recorrente
        </label>
        <Button type="submit" data-testid="btn-create-category" disabled={salvar.isPending} className="gap-1.5">
          <Plus className="size-4" /> Adicionar
        </Button>
      </form>

      {isError && <p className="text-sm text-slate-500">Não foi possível carregar as categorias.</p>}
      <ul data-testid="category-list" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <li key={i} className="h-[74px] animate-pulse rounded-xl bg-slate-900" />)}
        {categorias.map((c) => (
          <CategoriaItem key={c.id} c={c} onDelete={setApagar} />
        ))}
      </ul>

      <ConfirmDialog
        open={!!apagar}
        titulo={`Excluir “${apagar?.nome ?? ""}”?`}
        descricao={
          apagar && apagar.qtd > 0
            ? `Essa categoria tem ${apagar.qtd} lançamento(s). Mude a categoria deles antes de excluir.`
            : "A categoria será removida da lista."
        }
        pending={excluir.isPending}
        onCancel={() => setApagar(null)}
        onConfirm={async () => {
          if (!apagar) return;
          try {
            await excluir.mutateAsync(apagar.id);
            toast.success("Categoria excluída");
          } catch (e) {
            toast.error(errMsg(e, "Não foi possível excluir"));
          }
          setApagar(null);
        }}
      />
    </motion.div>
  );
}
