import * as React from 'react';
import { cn } from '@/lib/utils';

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function DropdownMenu({ children }: {children: React.ReactNode;}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div data-ev-id="ev_0ee25f8e0e" ref={ref} className="relative">
        {children}
      </div>
    </DropdownContext.Provider>);

}

function DropdownMenuTrigger({ asChild, children }: {asChild?: boolean;children: React.ReactNode;}) {
  const ctx = React.useContext(DropdownContext)!;

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => ctx.setOpen(!ctx.open)
    });
  }

  return (
    <button data-ev-id="ev_d8e08c4aec" onClick={() => ctx.setOpen(!ctx.open)}>
      {children}
    </button>);

}

function DropdownMenuContent({ children, align = 'start', className }: {children: React.ReactNode;align?: 'start' | 'end';className?: string;}) {
  const ctx = React.useContext(DropdownContext)!;
  if (!ctx.open) return null;

  return (
    <div data-ev-id="ev_3a5aa523d8"
    className={cn(
      'absolute z-50 mt-2 min-w-[160px] overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-lg animate-in fade-in-0 zoom-in-95',
      align === 'end' ? 'right-0' : 'left-0',
      className
    )}>

      {children}
    </div>);

}

function DropdownMenuItem({ children, onClick, className }: {children: React.ReactNode;onClick?: () => void;className?: string;}) {
  const ctx = React.useContext(DropdownContext)!;
  return (
    <button data-ev-id="ev_8e44e7c77f"
    onClick={() => {
      onClick?.();
      ctx.setOpen(false);
    }}
    className={cn(
      'flex w-full items-center rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 outline-none',
      className
    )}>

      {children}
    </button>);

}

function DropdownMenuLabel({ children, className }: {children: React.ReactNode;className?: string;}) {
  return (
    <div data-ev-id="ev_ed1ff1e217" className={cn('px-3 py-2 text-xs font-medium text-neutral-500', className)}>
      {children}
    </div>);

}

function DropdownMenuSeparator() {
  return <div data-ev-id="ev_62d988af0c" className="my-1 h-px bg-neutral-200" />;
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator };