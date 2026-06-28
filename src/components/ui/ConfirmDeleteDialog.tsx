import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  /** Nome do item a ser excluído (aparece em destaque na descrição padrão). */
  itemName?: string;
  /** Texto do botão de confirmação. Default: "Excluir". */
  confirmLabel?: string;
  /** Texto do botão de cancelamento. Default: "Cancelar". */
  cancelLabel?: string;
  /** Indica que a operação está em andamento (desabilita os botões). */
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Modal padrão de confirmação de exclusão.
 * - Foco inicial vai para "Cancelar" (ação segura).
 * - Foco retorna ao elemento gatilho ao fechar.
 * - Tab/Shift+Tab fica preso entre os dois botões.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = 'Confirmar exclusão',
  description,
  itemName,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const confirmRef = React.useRef<HTMLButtonElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    if (open) {
      previousFocusRef.current = (document.activeElement as HTMLElement) ?? null;
      const t = window.setTimeout(() => cancelRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    const prev = previousFocusRef.current;
    if (prev && document.contains(prev)) {
      requestAnimationFrame(() => prev.focus({ preventScroll: true }));
    }
    previousFocusRef.current = null;
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const focusables = [cancelRef.current, confirmRef.current].filter(
      (el): el is HTMLButtonElement => !!el && !el.disabled
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const handleConfirm = async () => {
    if (loading) return;
    await onConfirm();
  };

  const defaultDescription = itemName ? (
    <>
      Tem certeza que deseja excluir <span className="font-semibold text-neutral-900">"{itemName}"</span>?
      Esta ação não pode ser desfeita.
    </>
  ) : (
    'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.'
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onKeyDown={handleKeyDown}
        >
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center"
                aria-hidden="true"
              >
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <DialogTitle><span id={titleId}>{title}</span></DialogTitle>
                <DialogDescription><span id={descId}>{description ?? defaultDescription}</span></DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <button
              ref={cancelRef}
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-10 px-4 inline-flex items-center justify-center text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="h-10 px-4 inline-flex items-center justify-center text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              {loading ? 'Excluindo...' : confirmLabel}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDeleteDialog;
