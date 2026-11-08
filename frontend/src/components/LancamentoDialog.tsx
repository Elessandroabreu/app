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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategorias, useSalvarLancamento, useSalvarParcelado } from "@/lib/queries";
import { MESES_CURTOS, brl, errMsg, parseValor, valorParaInput } from "@/lib/format";
import type { Lancamento, Tipo } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEM = "__sem__";
const OPCOES_PARCELAS = Array.from({ length: 24 }, (_, i) => i + 1);

/** "2026-10-15" + 3 → "Jan/2027" */
function mesMais(iso: string, n: number): string {
  const total = Number(iso.slice(5, 7)) - 1 + n;
  const ano = Number(iso.slice(0, 4)) + Math.floor(total / 12);
  return `${MESES_CURTOS[total % 12]}/${ano}`;
}

interface Props {
  tipo: Tipo;
  inicial?: Lancamento;
  dataPadrao: string;
  onClose: () => void;
}

export default function LancamentoDialog({ tipo, inicial, dataPadrao, onClose }: Props) {
  const { data: categorias = [] } = useCategorias();
  const salvar = useSalvarLancamento();
  const salvarParcelado = useSalvarParcelado();
  const [data, setData] = useState(inicial?.data ?? dataPadrao);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [valor, setValor] = useState(inicial ? valorParaInput(inicial.valor) : "");
  const [obs, setObs] = useState(inicial?.observacao ?? "");
  const [parcelas, setParcelas] = useState(1);
  const [dividir, setDividir] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const isDespesa = tipo === "despesa";
  const nomeTipo = isDespesa ? "despesa" : "receita";
  const pedeParcelas = isDespesa && !inicial && obs.trim().toLowerCase() === "parcelamento";
  const nParcelas = pedeParcelas ? parcelas : 1;
  const pending = salvar.isPending || salvarParcelado.isPending;

  const v = parseValor(valor);
  const valorOk = Number.isFinite(v) && v > 0;
  const porParcela = valorOk ? (dividir ? Math.floor((v * 100) / nParcelas) / 100 : v) : 0;
  const totalCompra = valorOk ? (dividir ? v : v * nParcelas) : 0;

  async function enviar(continuar: boolean) {
    if (!descricao.trim()) return setErro("Informe a descrição");
    if (!data) return setErro("Informe a data");
    if (!valorOk) return setErro("Informe um valor válido maior que zero");
    setErro(null);
    const body = { tipo, data, descricao: descricao.trim(), valor: v, observacao: obs };
    try {
      if (nParcelas > 1) {
        await salvarParcelado.mutateAsync({ ...body, parcelas: nParcelas, dividir });
        toast.success(`${nParcelas} parcelas lançadas`, { description: `${mesMais(data, 0)} até ${mesMais(data, nParcelas - 1)}` });
      } else {
        await salvar.mutateAsync({ id: inicial?.id, body });
        toast.success(inicial ? "Lançamento atualizado" : `${isDespesa ? "Despesa" : "Receita"} adicionada`);
      }
      if (continuar) {
        setDescricao("");
        setValor("");
        setParcelas(1);
      } else onClose();
    } catch (e) {
      setErro(errMsg(e));
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void enviar(false);
  };

  return (
    <Dialog open onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent data-testid="lancamento-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {inicial ? `Editar ${nomeTipo}` : `Nova ${nomeTipo}`}
            {inicial?.parcela && inicial.parcelas && (
              <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-px font-mono text-sm text-amber-300">
                {inicial.parcela}/{inicial.parcelas}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {inicial?.grupo_id
              ? "Editar altera somente esta parcela."
              : isDespesa
                ? "Escolha a categoria (observação). Em “Parcelamento” você informa em quantas vezes."
                : "Registre uma entrada de dinheiro."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" id="lancamento-form">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lanc-data">{nParcelas > 1 ? "Data da 1ª parcela" : "Data"}</Label>
              <Input
                id="lanc-data"
                type="date"
                data-testid="lancamento-data-input"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="font-mono [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lanc-valor">{nParcelas > 1 ? (dividir ? "Valor total (R$)" : "Valor da parcela (R$)") : "Valor (R$)"}</Label>
              <Input
                id="lanc-valor"
                inputMode="decimal"
                placeholder="0,00"
                data-testid="lancamento-valor-input"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lanc-desc">Descrição</Label>
            <Input
              id="lanc-desc"
              autoFocus
              placeholder={isDespesa ? "Ex.: Mercado, Gasolina, Cartão Nu…" : "Ex.: Salário, Cliente…"}
              data-testid="lancamento-descricao-input"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{isDespesa ? "Categoria (observação)" : "Observação"}</Label>
            {isDespesa ? (
              <Select value={obs || SEM} onValueChange={(v: string) => setObs(v === SEM ? "" : v)}>
                <SelectTrigger data-testid="lancamento-categoria-select" className="w-full">
                  <SelectValue>{(v) => (v === SEM ? "Sem categoria" : String(v))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM} data-testid="categoria-option-sem">
                    Sem categoria
                  </SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.nome} data-testid={`categoria-option-${c.nome}`}>
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Ex.: PG"
                data-testid="lancamento-observacao-input"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
            )}
          </div>

          {pedeParcelas && (
            <div data-testid="parcelas-section" className="space-y-3 rounded-lg border border-amber-900/50 bg-amber-950/20 p-3 animate-fade-up">
              <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                  <Label>Parcelas</Label>
                  <Select value={String(parcelas)} onValueChange={(v: string) => setParcelas(Number(v))}>
                    <SelectTrigger data-testid="lancamento-parcelas-select" className="w-[120px] font-mono">
                      <SelectValue>{(v) => `${String(v)}x`}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {OPCOES_PARCELAS.map((n) => (
                        <SelectItem key={n} value={String(n)} data-testid={`parcelas-option-${n}`}>
                          {n === 1 ? "1x (à vista)" : `${n}x`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {parcelas > 1 && (
                  <div className="flex rounded-md border border-slate-700 p-0.5 text-xs">
                    {[
                      { on: false, label: "Valor da parcela", id: "parcela" },
                      { on: true, label: "Valor total", id: "total" },
                    ].map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        data-testid={`parcelas-modo-${o.id}`}
                        aria-pressed={dividir === o.on}
                        onClick={() => setDividir(o.on)}
                        className={cn(
                          "rounded px-2.5 py-1.5 transition-colors duration-150",
                          dividir === o.on ? "bg-primary text-black" : "text-slate-400 hover:text-slate-100",
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {parcelas > 1 && (
                <p data-testid="parcelas-resumo" className="text-sm text-amber-200/90">
                  <span className="font-mono font-semibold">{parcelas}x de {brl(porParcela)}</span> = {brl(totalCompra)}
                  <br />
                  <span className="text-xs text-slate-400">
                    Lança de <b className="text-slate-200">{data ? mesMais(data, 0) : "—"}</b> até{" "}
                    <b className="text-slate-200">{data ? mesMais(data, parcelas - 1) : "—"}</b>, uma parcela por mês.
                  </span>
                </p>
              )}
            </div>
          )}

          {erro && (
            <p data-testid="lancamento-erro" className="rounded-md border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
              {erro}
            </p>
          )}
        </form>
        <DialogFooter className="gap-2">
          {!inicial && (
            <Button
              type="button"
              variant="outline"
              data-testid="lancamento-salvar-continuar-button"
              disabled={pending}
              onClick={() => void enviar(true)}
            >
              Salvar e adicionar outra
            </Button>
          )}
          <Button type="submit" form="lancamento-form" data-testid="lancamento-salvar-button" disabled={pending}>
            {pending ? "Salvando…" : nParcelas > 1 ? `Lançar ${nParcelas} parcelas` : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
