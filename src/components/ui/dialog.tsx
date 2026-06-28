import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  const overlayRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  const handleOverlayClick = () => {
    onOpenChange(false);
  };

  return createPortal(
    <>
      {/* Backdrop global: acima de todo o app, incluindo sidebar e cabeçalho */}
      <div
        data-ev-id="ev_1bfe293004"
        className="fixed inset-0 bg-black/50 animate-in fade-in-0"
        style={{ zIndex: 2147483646 }}
        onClick={handleOverlayClick}
      />
      {/* Modal global: camada máxima acima de qualquer conteúdo da página */}
      <div
        data-ev-id="ev_48a5fcedd5"
        ref={overlayRef}
        className="fixed inset-0 overflow-y-auto"
        style={{ zIndex: 2147483647 }}
        onClick={handleOverlayClick}
      >
        <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full flex justify-center">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  );


}

function DialogContent({ children, className }: {children: React.ReactNode;className?: string;}) {
  return (
    <div data-ev-id="ev_25110796c6"
    className={cn(
      'relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto animate-in fade-in-0 zoom-in-95',
      className
    )}
    onClick={(e) => e.stopPropagation()}>

      {children}
    </div>);

}

function DialogHeader({ children, className }: {children: React.ReactNode;className?: string;}) {
  return <div data-ev-id="ev_b57c2b8d9a" className={cn('px-6 pt-6 pb-2', className)}>{children}</div>;
}

function DialogTitle({ children, className }: {children: React.ReactNode;className?: string;}) {
  return <h2 data-ev-id="ev_724c0b6437" className={cn('text-lg font-semibold text-neutral-900 leading-tight', className)}>{children}</h2>;
}

function DialogDescription({ children, className }: {children: React.ReactNode;className?: string;}) {
  return <p data-ev-id="ev_5ad6ce9b1c" className={cn('text-sm text-neutral-600 mt-1.5 leading-relaxed', className)}>{children}</p>;
}

function DialogFooter({ children, className }: {children: React.ReactNode;className?: string;}) {
  return (
    <div data-ev-id="ev_493ce1fce8" className={cn('px-6 pb-6 pt-4 flex justify-end gap-3', className)}>
      {children}
    </div>);

}

function DialogClose({ onClick, children }: {onClick?: () => void;children?: React.ReactNode;}) {
  return (
    <button data-ev-id="ev_9a5c5ae1ba"
    onClick={onClick}
    className="absolute right-4 top-4 rounded-full p-1 hover:bg-neutral-100 transition-colors">

      {children || <X className="h-4 w-4" />}
    </button>);

}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose };