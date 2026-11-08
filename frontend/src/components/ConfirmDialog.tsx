import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  titulo: string;
  descricao: string;
  pending?: boolean;
  confirmLabel?: string;
  extra?: { label: string; onClick: () => void; testId: string };
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({ open, titulo, descricao, pending, confirmLabel = "Excluir", extra, onCancel, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o: boolean) => !o && onCancel()}>
      <DialogContent data-testid="confirm-dialog" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button data-testid="confirm-cancel-button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          {extra && (
            <Button data-testid={extra.testId} variant="destructive" disabled={pending} onClick={extra.onClick}>
              {extra.label}
            </Button>
          )}
          <Button data-testid="confirm-delete-button" variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? "Aguarde…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
