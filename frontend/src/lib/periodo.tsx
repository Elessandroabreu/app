import { createContext, useContext, useState, type ReactNode } from "react";
import { useHoje } from "@/lib/queries";

interface PeriodoCtx {
  ano: number;
  mes: number;
  hoje?: string;
  setAno: (a: number) => void;
  setMes: (m: number) => void;
}

const Ctx = createContext<PeriodoCtx | null>(null);

export function PeriodoProvider({ children }: { children: ReactNode }) {
  const { data: hoje } = useHoje();
  const [ano, setAno] = useState<number | null>(null);
  const [mes, setMes] = useState<number | null>(null);
  const agora = new Date();
  const value: PeriodoCtx = {
    ano: ano ?? hoje?.ano ?? agora.getFullYear(),
    mes: mes ?? hoje?.mes ?? agora.getMonth() + 1,
    hoje: hoje?.data,
    setAno,
    setMes,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePeriodo(): PeriodoCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePeriodo fora do PeriodoProvider");
  return v;
}
