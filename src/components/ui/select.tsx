import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectContextValue {
  value: string;
  displayValue: string;
  onValueChange: (value: string, displayValue: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

function Select({ value = '', onValueChange = () => {}, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState('');
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

  const handleValueChange = (newValue: string, newDisplayValue: string) => {
    onValueChange(newValue);
    setDisplayValue(newDisplayValue);
  };

  return (
    <SelectContext.Provider value={{ value, displayValue, onValueChange: handleValueChange, open, setOpen }}>
      <div data-ev-id="ev_4d30b00edd" ref={ref} className="relative">
        {children}
      </div>
    </SelectContext.Provider>);

}

function SelectTrigger({ children, className }: {children: React.ReactNode;className?: string;}) {
  const ctx = React.useContext(SelectContext)!;
  return (
    <button data-ev-id="ev_08a80d1356"
    type="button"
    onClick={() => ctx.setOpen(!ctx.open)}
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}>

      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>);

}

function SelectValue({ placeholder }: {placeholder?: string;}) {
  const ctx = React.useContext(SelectContext)!;
  const display = ctx.displayValue || ctx.value || placeholder;
  return <span data-ev-id="ev_1a4fae0075" className={display === placeholder ? 'text-neutral-400' : ''}>{display}</span>;
}

function SelectContent({ children }: {children: React.ReactNode;}) {
  const ctx = React.useContext(SelectContext)!;
  if (!ctx.open) return null;
  return (
    <div data-ev-id="ev_e995fddd92" className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
      {children}
    </div>);

}

function SelectItem({ value, children }: {value: string;children: React.ReactNode;}) {
  const ctx = React.useContext(SelectContext)!;
  const isSelected = ctx.value === value;
  const childrenStr = typeof children === 'string' ? children : value;

  // Set display value when this item is selected and mounted
  React.useEffect(() => {
    if (isSelected && ctx.displayValue !== childrenStr) {
      ctx.onValueChange(value, childrenStr);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button data-ev-id="ev_1d44c31274"
    type="button"
    onClick={() => {
      ctx.onValueChange(value, childrenStr);
      ctx.setOpen(false);
    }}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 px-3 text-sm outline-none hover:bg-neutral-100 focus:bg-neutral-100',
      isSelected && 'bg-neutral-100'
    )}>

      <span data-ev-id="ev_3856cc4333" className="flex-1 text-left">{children}</span>
      {isSelected && <Check className="h-4 w-4" />}
    </button>);

}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };