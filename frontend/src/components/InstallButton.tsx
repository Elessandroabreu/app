import { useState } from "react";
import { CheckCircle2, Download, MonitorDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { promptInstall, useInstallState } from "@/lib/pwa";

export default function InstallButton() {
  const state = useInstallState();
  const [ajuda, setAjuda] = useState(false);

  if (state === "installed") {
    return (
      <span
        data-testid="install-status-installed"
        className="hidden items-center gap-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-300 sm:inline-flex"
      >
        <CheckCircle2 className="size-3.5" /> Instalado
      </span>
    );
  }

  return (
    <>
      <Button
        data-testid="install-app-button"
        aria-label="Instalar aplicativo"
        size="sm"
        onClick={async () => {
          if (state === "available") await promptInstall();
          else setAjuda(true);
        }}
        className="gap-1.5 shadow-[0_0_24px_-6px_rgba(245,158,11,0.6)] transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-[0_0_28px_-4px_rgba(245,158,11,0.8)]"
      >
        <Download className="size-4" />
        <span className="hidden sm:inline">Instalar no PC</span>
      </Button>

      <Dialog open={ajuda} onOpenChange={setAjuda}>
        <DialogContent data-testid="install-help-dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-xl">
              <MonitorDown className="size-5 text-primary" /> Instalar o FinanControl
            </DialogTitle>
            <DialogDescription>
              O app pode ser instalado como um programa no seu computador, com ícone na área de trabalho.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-slate-300">
            <li className="flex gap-3">
              <span className="font-mono text-primary">1.</span>
              Abra o link do sistema no <b className="text-slate-100">Google Chrome</b> ou <b className="text-slate-100">Microsoft Edge</b> (fora desta pré-visualização).
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-primary">2.</span>
              Clique no ícone de instalar <MonitorDown className="inline size-4" /> no canto direito da barra de endereço — ou no menu ⋮ → <i>“Instalar FinanControl”</i> / <i>“Aplicativos → Instalar este site”</i>.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-primary">3.</span>
              Pronto: o FinanControl abre em janela própria. Os dados ficam salvos no banco de dados e aparecem em qualquer dispositivo.
            </li>
          </ol>
          <DialogFooter>
            <Button data-testid="install-help-close" variant="outline" onClick={() => setAjuda(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
