import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  receita: { box: "border-emerald-900/60 bg-emerald-950/30", icon: "bg-emerald-500/15 text-emerald-400", value: "text-emerald-300" },
  despesa: { box: "border-rose-900/60 bg-rose-950/30", icon: "bg-rose-500/15 text-rose-400", value: "text-rose-300" },
  saldo: { box: "border-indigo-900/60 bg-indigo-950/30", icon: "bg-indigo-500/15 text-indigo-300", value: "text-indigo-200" },
  invest: { box: "border-amber-900/60 bg-amber-950/25", icon: "bg-amber-500/15 text-amber-400", value: "text-amber-300" },
} as const;

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  testId: string;
  hint?: ReactNode;
  action?: ReactNode;
  valueClassName?: string;
}

export default function KpiCard({ label, value, icon: Icon, tone, testId, hint, action, valueClassName }: Props) {
  const t = TONES[tone];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border p-5 backdrop-blur-sm transition-[transform,border-color] duration-200 hover:-translate-y-0.5",
        t.box,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cn("grid size-8 place-items-center rounded-lg", t.icon)}>
            <Icon className="size-4" />
          </span>
          <span className="text-sm font-medium text-slate-300">{label}</span>
        </div>
        {action}
      </div>
      <p data-testid={testId} className={cn("mt-4 font-mono text-2xl font-semibold tabular-nums tracking-tight lg:text-[1.7rem]", t.value, valueClassName)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
