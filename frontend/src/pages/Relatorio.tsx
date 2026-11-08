import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, PiggyBank, Pencil, Wallet } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import KpiCard from "@/components/KpiCard";
import CategoriaDonut from "@/components/CategoriaDonut";
import InvestimentoDialog from "@/components/InvestimentoDialog";
import { YearSelect } from "@/components/PeriodBar";
import { usePeriodo } from "@/lib/periodo";
import { useResumoAnual } from "@/lib/queries";
import { MESES, MESES_CURTOS, brl, brlCompacto } from "@/lib/format";
import { cn } from "@/lib/utils";

const TOOLTIP = { background: "#0F172A", border: "1px solid #334155", borderRadius: 8, color: "#F8FAFC" };

export default function Relatorio() {
  const { ano, setMes } = usePeriodo();
  const navigate = useNavigate();
  const { data, isError, isLoading } = useResumoAnual(ano);
  const [invest, setInvest] = useState<{ mes: number; atual: number | null } | null>(null);
  const d = isError ? undefined : data;
  const meses = d?.meses ?? [];
  const ultimoInvest = [...meses].reverse().find((m) => m.investimento != null)?.investimento ?? null;
  const chart = meses.map((m) => ({
    nome: MESES_CURTOS[m.mes - 1],
    Entradas: m.entradas,
    Saídas: m.saidas,
    Investimento: m.investimento ?? undefined,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Relatório geral</p>
          <h1 data-testid="relatorio-titulo" className="mt-1 font-heading text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
            Ano de <span className="text-primary">{ano}</span>
          </h1>
        </div>
        <YearSelect />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Entradas no ano" value={brl(d?.total_entradas)} icon={ArrowUpRight} tone="receita" testId="anual-entradas-value" />
        <KpiCard label="Saídas no ano" value={brl(d?.total_saidas)} icon={ArrowDownRight} tone="despesa" testId="anual-saidas-value" />
        <KpiCard
          label="Saldo do ano"
          value={brl(d?.total_saldo)}
          icon={Wallet}
          tone="saldo"
          testId="anual-saldo-value"
          valueClassName={(d?.total_saldo ?? 0) < 0 ? "text-rose-300" : undefined}
        />
        <KpiCard label="Último investimento" value={ultimoInvest == null ? "—" : brl(ultimoInvest)} icon={PiggyBank} tone="invest" testId="anual-investimento-value" />
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm lg:p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold text-slate-100">Entradas × Saídas por mês</h2>
        <div data-testid="annual-chart-comparison" className="h-[320px]">
          {isLoading ? (
            <div className="h-full animate-pulse rounded-lg bg-slate-800/50" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1F2937" vertical={false} />
                <XAxis dataKey="nome" stroke="#64748B" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis yAxisId="v" stroke="#64748B" tickLine={false} axisLine={false} fontSize={11} tickFormatter={brlCompacto} width={48} />
                <YAxis yAxisId="i" orientation="right" stroke="#B45309" tickLine={false} axisLine={false} fontSize={11} tickFormatter={brlCompacto} width={48} />
                <Tooltip formatter={(value: number, name: string) => [brl(value), name]} contentStyle={TOOLTIP} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                <Bar yAxisId="v" dataKey="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar yAxisId="v" dataKey="Saídas" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Line yAxisId="i" dataKey="Investimento" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: "#F59E0B" }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-baseline justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-slate-100">Resumo mês a mês</h2>
          <span className="text-xs text-slate-500">Clique num mês para abrir o painel</span>
        </div>
        <div className="overflow-x-auto">
          <table data-testid="annual-report-table" className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">Mês</th>
                <th className="px-3 py-2.5 text-right font-medium">Entradas</th>
                <th className="px-3 py-2.5 text-right font-medium">Saídas</th>
                <th className="px-3 py-2.5 text-right font-medium">Saldo</th>
                <th className="px-5 py-2.5 text-right font-medium">Investimento</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((m) => (
                <tr
                  key={m.mes}
                  data-testid={`annual-row-${m.mes}`}
                  onClick={() => {
                    setMes(m.mes);
                    navigate("/");
                  }}
                  className="cursor-pointer border-t border-slate-800/60 transition-colors duration-100 even:bg-[#131C2E]/60 hover:bg-slate-800/50"
                >
                  <td className="px-5 py-2.5 font-medium text-slate-200">{MESES[m.mes - 1]}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-emerald-300">{brl(m.entradas)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-rose-300">{brl(m.saidas)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", m.saldo < 0 ? "text-rose-300" : "text-indigo-200")}>
                    {brl(m.saldo)}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      type="button"
                      data-testid={`annual-invest-edit-${m.mes}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInvest({ mes: m.mes, atual: m.investimento });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono tabular-nums text-amber-300 transition-colors hover:bg-amber-500/10"
                    >
                      {m.investimento == null ? <span className="text-slate-600">—</span> : brl(m.investimento)}
                      <Pencil className="size-3 opacity-50" />
                    </button>
                  </td>
                </tr>
              ))}
              {d && (
                <tr className="border-t border-slate-700 font-semibold">
                  <td className="px-5 py-3 text-slate-100">Total</td>
                  <td data-testid="annual-total-entradas" className="px-3 py-3 text-right font-mono tabular-nums text-emerald-300">{brl(d.total_entradas)}</td>
                  <td data-testid="annual-total-saidas" className="px-3 py-3 text-right font-mono tabular-nums text-rose-300">{brl(d.total_saidas)}</td>
                  <td data-testid="annual-total-saldo" className="px-3 py-3 text-right font-mono tabular-nums text-indigo-200">{brl(d.total_saldo)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div data-testid="annual-category-ranking">
        <CategoriaDonut titulo={`Gastos por categoria em ${ano}`} itens={d?.por_categoria ?? []} mes={null} vazio="Sem despesas neste ano" />
      </div>

      {invest && <InvestimentoDialog ano={ano} mes={invest.mes} atual={invest.atual} onClose={() => setInvest(null)} />}
    </motion.div>
  );
}
