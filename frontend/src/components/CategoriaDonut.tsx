import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { brl } from "@/lib/format";
import type { CategoriaTotal } from "@/lib/types";

interface Props {
  titulo: string;
  itens: CategoriaTotal[];
  semCategoria?: number;
  mes?: number | null;
  vazio: string;
}

export default function CategoriaDonut({ titulo, itens, semCategoria = 0, mes, vazio }: Props) {
  const comValor = itens.filter((c) => c.valor > 0);
  const total = itens.reduce((s, c) => s + c.valor, 0);
  const periodo = mes ? `&mes=${mes}` : "&mes=ano";

  return (
    <section data-testid="category-breakdown" className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm lg:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-slate-100">{titulo}</h2>
        <span className="text-xs text-slate-500">Clique numa categoria para ver os detalhes</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(240px,340px)_1fr] lg:items-center">
        <div data-testid="chart-category-donut" className="relative h-[260px]">
          {comValor.length === 0 ? (
            <div className="grid h-full place-items-center rounded-full border border-dashed border-slate-800 text-center text-sm text-slate-500">
              {vazio}
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={comValor} dataKey="valor" nameKey="nome" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
                    {comValor.map((c) => (
                      <Cell key={c.nome} fill={c.cor} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [brl(value), name]}
                    contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 8, color: "#F8FAFC" }}
                    itemStyle={{ color: "#E2E8F0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Total</p>
                  <p data-testid="donut-total" className="font-mono text-lg font-semibold text-slate-100">{brl(total)}</p>
                </div>
              </div>
            </>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 text-left font-medium">Categoria</th>
              <th className="py-2 text-right font-medium">Qtd</th>
              <th className="py-2 text-right font-medium">Valor</th>
              <th className="w-28 py-2 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((c) => (
              <tr key={c.nome} data-testid={`category-row-${c.nome}`} className="group border-t border-slate-800/70">
                <td className="py-2">
                  <Link
                    to={`/analise?categoria=${encodeURIComponent(c.nome)}${periodo}`}
                    data-testid={`category-link-${c.nome}`}
                    className="inline-flex items-center gap-2 text-slate-200 transition-colors hover:text-primary"
                  >
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                    {c.nome}
                    <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </td>
                <td className="py-2 text-right font-mono text-xs text-slate-500">{c.qtd}</td>
                <td data-testid={`category-valor-${c.nome}`} className="py-2 text-right font-mono tabular-nums text-slate-200">
                  {brl(c.valor)}
                </td>
                <td className="py-2 pl-3">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.cor }} />
                    </div>
                    <span className="w-12 text-right font-mono text-xs tabular-nums text-slate-400">{c.pct.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {semCategoria > 0 && (
              <tr className="border-t border-slate-800/70 text-slate-500">
                <td className="py-2 italic">Sem categoria</td>
                <td />
                <td className="py-2 text-right font-mono tabular-nums">{brl(semCategoria)}</td>
                <td />
              </tr>
            )}
            <tr className="border-t border-slate-700 font-semibold">
              <td className="py-2.5 text-slate-200">Total</td>
              <td />
              <td data-testid="category-total" className="py-2.5 text-right font-mono tabular-nums text-slate-100">
                {brl(total)}
              </td>
              <td className="py-2.5 text-right font-mono text-xs text-slate-400">{total ? "100%" : "0%"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
