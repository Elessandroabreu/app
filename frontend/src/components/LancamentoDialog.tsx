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
import { useCategorias, useSalvarLancamento } from "@/lib/queries";
import { errMsg, parseValor, valorParaInput } from "@/lib/format";
import type { Lancamento, Tipo } from "@/lib/types";

const SEM = "__sem__";

interface Props {
  tipo: Tipo;
  inicial?: Lancamento;
  dataPadrao: string;
  onClose: () => void;
}

export default function LancamentoDialog({ tipo, inicial, dataPadrao, onClose }: Props) {
  const { data: categorias = [] } = useCategorias();
  const salvar = useSalvarLancamento();
  const [data, setData] = useState(inicial?.data ?? dataPadrao);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [valor, setValor] = useState(inicial ? valorParaInput(inicial.valor) : "");
  const [obs, setObs] = useState(inicial?.observacao ?? "");
  const [erro, setErro] = useState<string | null>(null);

  const isDespesa = tipo === "despesa";
  const nomeTipo = isDespesa ? "despesa" : "receita";

  async function enviar(continuar: boolean) {
    const v = parseValor(valor);
    if (!descricao.trim()) return setErro("Informe a descrição");
    if (!data) return setErro("Informe a data");
    if (!Number.isFinite(v) || v <= 0) return setErro("Informe um valor válido maior que zero");
    setErro(null);
    try {
      await salvar.mutateAsync({
        id: inicial?.id,
        body: { tipo, data, descricao: descricao.trim(), valor: v, observacao: obs },
      });
      toast.success(inicial ? "Lançamento atualizado" : `${isDespesa ? "Despesa" : "Receita"} adicionada`);
      if (continuar) {
        setDescricao("");
        setValor("");
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
          </DialogTitle>
          <DialogDescription>
            {isDespesa ? "Escolha a categoria (observação) para aparecer nos gráficos e filtros." : "Registre uma entrada de dinheiro."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" id="lancamento-form">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lanc-data">Data</Label>
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
              <Label htmlFor="lanc-valor">Valor (R$)</Label>
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
              placeholder={isDespesa ? "Ex.: Mercado, Gasolina, Shopee…" : "Ex.: Salário, Cliente…"}
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
              disabled={salvar.isPending}
              onClick={() => void enviar(true)}
            >
              Salvar e adicionar outra
            </Button>
          )}
          <Button type="submit" form="lancamento-form" data-testid="lancamento-salvar-button" disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
