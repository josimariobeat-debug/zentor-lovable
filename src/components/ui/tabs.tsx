import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

function Tabs({ defaultValue = '', value: controlledValue, onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const value = controlledValue ?? internalValue;
  const handleChange = onValueChange ?? setInternalValue;

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleChange }}>
      <div data-ev-id="ev_cdf309fd3d" className={className}>{children}</div>
    </TabsContext.Provider>);

}

function TabsList({ children, className }: {children: React.ReactNode;className?: string;}) {
  return (
    <div data-ev-id="ev_9e6eafaf91" className={cn('inline-flex items-center', className)}>
      {children}
    </div>);

}

function TabsTrigger({ value, children, className }: {value: string;children: React.ReactNode;className?: string;}) {
  const ctx = React.useContext(TabsContext)!;
  const isActive = ctx.value === value;

  return (
    <button data-ev-id="ev_8823b0efff"
    type="button"
    onClick={() => ctx.onValueChange(value)}
    data-state={isActive ? 'active' : 'inactive'}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
      className
    )}>

      {children}
    </button>);

}

function TabsContent({ value, children, className }: {value: string;children: React.ReactNode;className?: string;}) {
  const ctx = React.useContext(TabsContext)!;
  const isActive = ctx.value === value;

  // Keep all tab panels mounted so their child state (and any fetched data)
  // persists across tab switches — no skeleton flicker on re-entry.
  return (
    <div
      data-ev-id="ev_15019aad3f"
      role="tabpanel"
      data-state={isActive ? 'active' : 'inactive'}
      hidden={!isActive}
      className={cn(isActive && 'fade-in', className)}
    >
      {children}
    </div>);

}

export { Tabs, TabsList, TabsTrigger, TabsContent };