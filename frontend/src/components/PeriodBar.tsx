import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAnos } from "@/lib/queries";
import { usePeriodo } from "@/lib/periodo";
import { MESES_CURTOS } from "@/lib/format";
import { cn } from "@/lib/utils";

export function YearSelect() {
  const { ano, setAno } = usePeriodo();
  const { data } = useAnos();
  const anos = Array.from(new Set([...(data?.anos ?? []), ano])).sort();
  return (
    <Select value={String(ano)} onValueChange={(v: string) => setAno(Number(v))}>
      <SelectTrigger data-testid="year-select" className="w-[110px] border-slate-700 bg-slate-900/80 font-mono">
        <SelectValue>{(v) => String(v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {anos.map((a) => (
          <SelectItem key={a} value={String(a)} data-testid={`year-option-${a}`}>
            {a}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MonthPills() {
  const { mes, setMes } = usePeriodo();
  return (
    <div data-testid="month-selector-bar" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {MESES_CURTOS.map((m, i) => {
        const ativo = mes === i + 1;
        return (
          <button
            key={m}
            type="button"
            data-testid={`month-pill-${i + 1}`}
            aria-pressed={ativo}
            onClick={() => setMes(i + 1)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,border-color,box-shadow] duration-150",
              ativo
                ? "border-primary bg-primary text-black shadow-[0_0_18px_-4px_rgba(245,158,11,0.7)]"
                : "border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-600 hover:text-slate-100",
            )}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}
