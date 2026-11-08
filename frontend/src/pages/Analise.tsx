import { useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { Calculator, Hash, Receipt, Sigma } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import KpiCard from "@/components/KpiCard";
import LancamentosTable from "@/components/LancamentosTable";
import { YearSelect } from "@/components/PeriodBar";
import { usePeriodo } from "@/lib/periodo";
import { useAnalise, useCategorias, useResumoAnual, useResumoMensal } from "@/lib/queries";
import { MESES, MESES_CURTOS, brl, brlCompacto } from "@/lib/format";
import { cn } from "@/lib/utils";

const ANO = "ano";
const TOOLTIP = { background: "#0F172A", border: "1px solid #334155", borderRadius: 8, color: "#F8FAFC" };

export default function Analise() {
  const periodo = usePeriodo();
  const [params, setParams] = useSearchParams();
  const { data: categorias = [] } = useCategorias();

  const categoria = params.get("categoria") ?? categorias[0]?.nome ?? null;
  const mesParam = params.get("mes");
  const mes: number | null = mesParam === ANO ? null : mesParam ? Number(mesParam) : periodo.mes;
  const ano = periodo.ano;

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    p.set(k, v);
    if (k === "categoria" && !p.get("mes")) p.set("mes", mes ? String(mes) : ANO);
    setParams(p, { replace: true });
  };

  const analise = useAnalise(categoria, ano, mes);
  const a = analise.isError ? undefined : analise.data;
  const mensal = useResumoMensal(ano, mes ?? 1);
  const anual = useResumoAnual(ano);
  const comparativo = (mes ? mensal.data?.por_categoria : anual.data?.por_categoria) ?? [];
  const maxComp = Math.max(1, ...comparativo.map((c) => c.valor));
  const cor = a?.cor ?? categorias.find((c) => c.nome === categoria)?.cor ?? "#F59E0B";
  const nomePeriodo = mes ? `${MESES[mes - 1]} de ${ano}` : `todo o ano de ${ano}`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Análise & filtros</p>
        <h1 data-testid="analise-titulo" className="mt-1 font-heading text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
          Quanto gastei com <span style={{ color: cor }}>{categoria ?? "…"}</span>?
        </h1>
        <p className="mt-2 text-sm text-slate-400">Período: {nomePeriodo}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 backdrop-blur-sm">
        <Select value={categoria ?? ""} onValueChange={(v: string) => set("categoria", v)}>
          <SelectTrigger data-testid="filter-category-select" className="w-[220px] border-slate-700 bg-slate-950/60">
            <SelectValue>{(v) => (v ? String(v) : "Categoria")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.nome} data-testid={`filter-category-option-${c.nome}`}>
                <span className="size-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mes ? String(mes) : ANO} onValueChange={(v: string) => set("mes", v)}>
          <SelectTrigger data-testid="filter-period-select" className="w-[180px] border-slate-700 bg-slate-950/60">
            <SelectValue>{(v) => (v === ANO ? "Ano inteiro" : MESES[Number(v) - 1])}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANO} data-testid="filter-period-option-ano">Ano inteiro</SelectItem>
            {MESES.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)} data-testid={`filter-period-option-${i + 1}`}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <YearSelect />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={mes ? "Gasto no mês" : "Gasto no ano"} value={brl(a?.total)} icon={Sigma} tone="despesa" testId="filter-total-spent" />
        <KpiCard label="Lançamentos" value={String(a?.qtd ?? 0)} icon={Hash} tone="saldo" testId="filter-count" />
        <KpiCard label="Média por lançamento" value={brl(a?.media)} icon={Calculator} tone="invest" testId="filter-media" />
        <KpiCard label={`Total em ${ano}`} value={brl(a?.total_ano)} icon={Receipt} tone="receita" testId="filter-total-ano" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm xl:col-span-7">
          <h2 className="mb-4 font-heading text-lg font-semibold text-slate-100">Evolução mensal — {categoria}</h2>
          <div data-testid="filter-evolution-chart" className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(a?.evolucao ?? []).map((p) => ({ nome: MESES_CURTOS[p.mes - 1], mes: p.mes, valor: p.valor }))}>
                <CartesianGrid stroke="#1F2937" vertical={false} />
                <XAxis dataKey="nome" stroke="#64748B" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke="#64748B" tickLine={false} axisLine={false} fontSize={11} tickFormatter={brlCompacto} width={44} />
                <Tooltip formatter={(value: number) => [brl(value), categoria ?? ""]} contentStyle={TOOLTIP} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={34}>
                  {(a?.evolucao ?? []).map((p) => (
                    <Cell key={p.mes} fill={cor} fillOpacity={mes == null || p.mes === mes ? 1 : 0.3} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm xl:col-span-5">
          <h2 className="mb-1 font-heading text-lg font-semibold text-slate-100">Todas as categorias</h2>
          <p className="mb-4 text-xs text-slate-500">{nomePeriodo} — clique para filtrar</p>
          <ul data-testid="filter-category-comparison" className="space-y-2.5">
            {comparativo.map((c) => (
              <li key={c.nome}>
                <button
                  type="button"
                  data-testid={`compare-category-${c.nome}`}
                  onClick={() => set("categoria", c.nome)}
                  className={cn(
                    "w-full rounded-lg px-2.5 py-1.5 text-left transition-colors duration-150 hover:bg-slate-800/60",
                    c.nome === categoria && "bg-slate-800/80",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 text-slate-200">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                      {c.nome}
                    </span>
                    <span className="font-mono tabular-nums text-slate-300">{brl(c.valor)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${(c.valor / maxComp) * 100}%`, backgroundColor: c.cor }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div data-testid="filter-results-table">
        <LancamentosTable
          tipo="despesa"
          titulo={`Lançamentos de ${categoria ?? "—"}`}
          itens={a?.lancamentos ?? []}
          carregando={analise.isLoading}
          erro={analise.isError}
          cores={Object.fromEntries(categorias.map((c) => [c.nome, c.cor]))}
          maxHeight="max-h-[480px]"
        />
      </div>
    </motion.div>
  );
}
