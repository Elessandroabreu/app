import { useRef, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { CheckCircle2, Download, FileSpreadsheet, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useImportarBackup } from "@/lib/queries";
import { errMsg } from "@/lib/format";
import type { ImportarOut } from "@/lib/types";
import { cn } from "@/lib/utils";

type Modo = "mesclar" | "substituir";

const MODOS: { id: Modo; titulo: string; texto: string }[] = [
  { id: "substituir", titulo: "Restaurar (substituir tudo)", texto: "Apaga os dados atuais e deixa o sistema igual ao backup. Use depois de reinstalar." },
  { id: "mesclar", titulo: "Juntar com os dados atuais", texto: "Só adiciona o que ainda não existe. Nada é apagado e nada é duplicado." },
];

function lerBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}

export default function Backup() {
  const importar = useImportarBackup();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [modo, setModo] = useState<Modo>("substituir");
  const [confirmar, setConfirmar] = useState(false);
  const [resultado, setResultado] = useState<ImportarOut | null>(null);

  async function executar() {
    if (!arquivo) return;
    try {
      const b64 = await lerBase64(arquivo);
      const r = await importar.mutateAsync({
        arquivo_base64: b64,
        modo,
        confirmacao: modo === "substituir" ? "SUBSTITUIR" : null,
      });
      setResultado(r);
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success(`${r.lancamentos_importados} lançamento(s) importado(s)`);
    } catch (e) {
      toast.error(errMsg(e, "Não foi possível importar"));
    }
    setConfirmar(false);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Seus dados em segurança</p>
        <h1 className="mt-1 font-heading text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">Backup</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Exporte uma planilha Excel com <b className="text-slate-200">todos</b> os lançamentos, categorias e investimentos. Se reinstalar o
          programa ou trocar de computador, é só importar o arquivo de volta.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="flex flex-col rounded-xl border border-emerald-900/50 bg-gradient-to-br from-emerald-950/30 to-slate-900/80 p-6 lg:col-span-2">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Download className="size-5" />
          </span>
          <h2 className="mt-4 font-heading text-xl font-semibold text-slate-100">Exportar planilha</h2>
          <p className="mt-1 text-sm text-slate-400">
            Baixa o arquivo <span className="font-mono text-slate-300">FinanControl_backup_AAAA-MM-DD.xlsx</span> com as abas
            Lançamentos, Categorias e Investimentos. Guarde num pendrive, e-mail ou Google Drive.
          </p>
          <a
            href="/api/backup/exportar"
            download
            data-testid="backup-exportar-button"
            className="mt-auto inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-black shadow-[0_0_24px_-8px_rgba(16,185,129,0.8)] transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_0_28px_-6px_rgba(16,185,129,0.9)] mt-6"
          >
            <Download className="size-4" /> Baixar backup (.xlsx)
          </a>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 lg:col-span-3">
          <span className="grid size-11 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
            <Upload className="size-5" />
          </span>
          <h2 className="mt-4 font-heading text-xl font-semibold text-slate-100">Importar planilha</h2>
          <p className="mt-1 text-sm text-slate-400">
            Aceita o backup exportado aqui ou a planilha original <span className="font-mono text-slate-300">CONTROLE_FINANCEIRO</span>.
          </p>

          <label
            data-testid="backup-file-dropzone"
            className={cn(
              "mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-4 transition-colors duration-150",
              arquivo ? "border-amber-600/70 bg-amber-500/5" : "border-slate-700 hover:border-slate-500",
            )}
          >
            <FileSpreadsheet className={cn("size-6 shrink-0", arquivo ? "text-amber-400" : "text-slate-500")} />
            <span className="min-w-0 flex-1">
              <span data-testid="backup-file-name" className="block truncate text-sm text-slate-200">
                {arquivo ? arquivo.name : "Clique para escolher o arquivo .xlsx"}
              </span>
              {arquivo && <span className="text-xs text-slate-500">{(arquivo.size / 1024).toFixed(0)} KB</span>}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              data-testid="backup-file-input"
              className="sr-only"
              onChange={(e) => {
                setArquivo(e.target.files?.[0] ?? null);
                setResultado(null);
              }}
            />
          </label>

          <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup">
            {MODOS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={modo === m.id}
                data-testid={`backup-modo-${m.id}`}
                onClick={() => setModo(m.id)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-[border-color,background-color] duration-150",
                  modo === m.id ? "border-primary bg-amber-500/5" : "border-slate-800 hover:border-slate-600",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
                  <span className={cn("size-3 rounded-full border-2", modo === m.id ? "border-primary bg-primary" : "border-slate-600")} />
                  {m.titulo}
                </span>
                <span className="mt-1 block text-xs text-slate-400">{m.texto}</span>
              </button>
            ))}
          </div>

          <Button
            data-testid="backup-importar-button"
            className="mt-5 gap-2"
            disabled={!arquivo || importar.isPending}
            onClick={() => (modo === "substituir" ? setConfirmar(true) : void executar())}
          >
            <Upload className="size-4" />
            {importar.isPending ? "Importando…" : "Importar"}
          </Button>

          {resultado && (
            <div data-testid="backup-resultado" className="mt-5 rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-4 text-sm animate-fade-up">
              <p className="flex items-center gap-2 font-medium text-emerald-300">
                <CheckCircle2 className="size-4" /> Importação concluída ({resultado.formato === "backup" ? "backup FinanControl" : "planilha original"})
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-slate-300">
                <li>Lançamentos importados: <b data-testid="backup-res-importados" className="font-mono">{resultado.lancamentos_importados}</b></li>
                <li>Já existiam (ignorados): <b data-testid="backup-res-ignorados" className="font-mono">{resultado.lancamentos_ignorados}</b></li>
                <li>Categorias criadas: <b className="font-mono">{resultado.categorias_criadas}</b></li>
                <li>Investimentos: <b className="font-mono">{resultado.investimentos}</b></li>
                {resultado.linhas_invalidas > 0 && <li className="col-span-2 text-amber-300">Linhas inválidas ignoradas: {resultado.linhas_invalidas}</li>}
              </ul>
            </div>
          )}
        </section>
      </div>

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-400" />
        Seus dados já ficam salvos no banco de dados online e não se perdem ao reinstalar o app. O backup é uma garantia extra. Antes de
        restaurar, o sistema guarda uma cópia de segurança automática dos dados atuais.
      </p>

      <ConfirmDialog
        open={confirmar}
        titulo="Substituir todos os dados?"
        descricao={`Os lançamentos, categorias e investimentos atuais serão trocados pelo conteúdo de “${arquivo?.name ?? ""}”.`}
        confirmLabel="Substituir tudo"
        pending={importar.isPending}
        onCancel={() => setConfirmar(false)}
        onConfirm={() => void executar()}
      />
    </motion.div>
  );
}
