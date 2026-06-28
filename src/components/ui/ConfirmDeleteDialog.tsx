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
 * Use sempre que houver uma ação destrutiva irreversível na aplicação.
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
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-semibold text-neutral-900">
                <DialogTitle>{title}</DialogTitle>
              </div>
              <div className="mt-1 text-[13.5px] text-neutral-600 leading-relaxed">
                <DialogDescription>{description ?? defaultDescription}</DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? 'Excluindo...' : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDeleteDialog;
