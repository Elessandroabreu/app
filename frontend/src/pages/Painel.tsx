import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, PiggyBank, Pencil, Wallet } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import LancamentosTable from "@/components/LancamentosTable";
import LancamentoDialog from "@/components/LancamentoDialog";
import CategoriaDonut from "@/components/CategoriaDonut";
import ConfirmDialog from "@/components/ConfirmDialog";
import InvestimentoDialog from "@/components/InvestimentoDialog";
import { MonthPills, YearSelect } from "@/components/PeriodBar";
import { usePeriodo } from "@/lib/periodo";
import { useCategorias, useExcluirLancamento, useLancamentos, useResumoAnual, useResumoMensal } from "@/lib/queries";
import { MESES, brl, errMsg, primeiroDiaOuHoje } from "@/lib/format";
import type { Lancamento, Tipo } from "@/lib/types";

export default function Painel() {
  const { ano, mes, hoje } = usePeriodo();
  const receitas = useLancamentos(ano, mes, "receita");
  const despesas = useLancamentos(ano, mes, "despesa");
  const resumo = useResumoMensal(ano, mes);
  const anual = useResumoAnual(ano);
  const { data: categorias = [] } = useCategorias();
  const excluir = useExcluirLancamento();

  const [dialog, setDialog] = useState<{ tipo: Tipo; item?: Lancamento } | null>(null);
  const [apagar, setApagar] = useState<Lancamento | null>(null);
  const [invest, setInvest] = useState(false);

  const cores = Object.fromEntries(categorias.map((c) => [c.nome, c.cor]));
  const r = resumo.isError ? undefined : resumo.data;
  const saldo = r?.saldo ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Painel do mês</p>
          <h1 data-testid="painel-titulo" className="mt-1 font-heading text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
            {MESES[mes - 1]} <span className="text-slate-500">{ano}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Saldo do ano:{" "}
            <span data-testid="saldo-ano" className="font-mono font-semibold text-slate-200">
              {anual.isError ? "—" : brl(anual.data?.total_saldo)}
            </span>
          </p>
        </div>
        <YearSelect />
      </div>

      <MonthPills />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Entradas" value={brl(r?.entradas)} icon={ArrowUpRight} tone="receita" testId="kpi-entradas-value" />
        <KpiCard label="Saídas" value={brl(r?.saidas)} icon={ArrowDownRight} tone="despesa" testId="kpi-saidas-value" />
        <KpiCard
          label="Saldo do mês"
          value={brl(saldo)}
          icon={Wallet}
          tone="saldo"
          testId="kpi-saldo-value"
          valueClassName={saldo < 0 ? "text-rose-300" : undefined}
        />
        <KpiCard
          label="Investimento"
          value={r?.investimento == null ? "—" : brl(r.investimento)}
          icon={PiggyBank}
          tone="invest"
          testId="kpi-investimento-value"
          action={
            <button
              type="button"
              aria-label="Editar investimento"
              data-testid="kpi-investimento-edit-button"
              onClick={() => setInvest(true)}
              className="rounded-md p-1.5 text-amber-400/70 transition-colors hover:bg-amber-500/10 hover:text-amber-300"
            >
              <Pencil className="size-3.5" />
            </button>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <LancamentosTable
          className="xl:col-span-5"
          tipo="receita"
          titulo="Receitas"
          itens={receitas.data ?? []}
          carregando={receitas.isLoading}
          erro={receitas.isError}
          cores={cores}
          onAdd={() => setDialog({ tipo: "receita" })}
          onEdit={(l) => setDialog({ tipo: "receita", item: l })}
          onDelete={setApagar}
        />
        <LancamentosTable
          className="xl:col-span-7"
          tipo="despesa"
          titulo="Despesas"
          itens={despesas.data ?? []}
          carregando={despesas.isLoading}
          erro={despesas.isError}
          cores={cores}
          onAdd={() => setDialog({ tipo: "despesa" })}
          onEdit={(l) => setDialog({ tipo: "despesa", item: l })}
          onDelete={setApagar}
        />
      </div>

      <CategoriaDonut
        titulo="Despesas por categoria"
        itens={r?.por_categoria ?? categorias.map((c) => ({ nome: c.nome, cor: c.cor, valor: 0, pct: 0, qtd: 0 }))}
        semCategoria={r?.sem_categoria}
        mes={mes}
        vazio="Sem despesas categorizadas neste mês"
      />

      {dialog && (
        <LancamentoDialog
          key={dialog.item?.id ?? `novo-${dialog.tipo}`}
          tipo={dialog.tipo}
          inicial={dialog.item}
          dataPadrao={primeiroDiaOuHoje(ano, mes, hoje)}
          onClose={() => setDialog(null)}
        />
      )}
      {invest && <InvestimentoDialog ano={ano} mes={mes} atual={r?.investimento ?? null} onClose={() => setInvest(false)} />}
      <ConfirmDialog
        open={!!apagar}
        titulo="Excluir lançamento?"
        descricao={apagar ? `“${apagar.descricao}” — ${brl(apagar.valor)}. Essa ação não pode ser desfeita.` : ""}
        pending={excluir.isPending}
        onCancel={() => setApagar(null)}
        onConfirm={async () => {
          if (!apagar) return;
          try {
            await excluir.mutateAsync(apagar.id);
            toast.success("Lançamento excluído");
            setApagar(null);
          } catch (e) {
            toast.error(errMsg(e, "Não foi possível excluir"));
          }
        }}
      />
    </motion.div>
  );
}
