import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSalvarInvestimento } from "@/lib/queries";
import { MESES, errMsg, parseValor, valorParaInput } from "@/lib/format";

interface Props {
  ano: number;
  mes: number;
  atual: number | null;
  onClose: () => void;
}

export default function InvestimentoDialog({ ano, mes, atual, onClose }: Props) {
  const salvar = useSalvarInvestimento();
  const [valor, setValor] = useState(atual == null ? "" : valorParaInput(atual));
  const [erro, setErro] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = valor.trim() ? parseValor(valor) : null;
    if (v !== null && (!Number.isFinite(v) || v < 0)) return setErro("Valor inválido");
    try {
      await salvar.mutateAsync({ ano, mes, body: { valor: v } });
      toast.success("Investimento salvo");
      onClose();
    } catch (err) {
      setErro(errMsg(err));
    }
  }

  return (
    <Dialog open onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent data-testid="investimento-dialog" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Investimento — {MESES[mes - 1]} {ano}</DialogTitle>
          <DialogDescription>Valor total investido no mês. Deixe em branco para limpar.</DialogDescription>
        </DialogHeader>
        <form id="invest-form" onSubmit={onSubmit} className="space-y-2">
          <Label htmlFor="invest-valor">Valor (R$)</Label>
          <Input
            id="invest-valor"
            autoFocus
            inputMode="decimal"
            placeholder="0,00"
            data-testid="investimento-valor-input"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="font-mono"
          />
          {erro && <p className="text-sm text-rose-300">{erro}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="investimento-cancelar-button">
            Cancelar
          </Button>
          <Button type="submit" form="invest-form" data-testid="investimento-salvar-button" disabled={salvar.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
