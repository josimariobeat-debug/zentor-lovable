import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Search, Plus, ShoppingBag, Ruler, Check, GripVertical, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ProductRow = { id: string; name: string; price: string; currency: string; url: string; image: string | null };
type MeasureRow = { id: string; name: string };
type Layout = 'lista' | 'cartoes';

export interface ProductLinkSelection {
  layout: Layout;
  productIds: string[];
  measureId: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: ProductLinkSelection | null;
  onSave: (sel: ProductLinkSelection) => void;
  onAddManual?: () => void;
  onCreateProduct?: () => void;
  refreshNonce?: number;
  autoSelectProductId?: string | null;
  onAutoSelectHandled?: () => void;
  /**
   * Produtos pré-carregados pelo componente pai. Quando fornecidos,
   * o modal abre já hidratado — sem skeleton/“Carregando…” e sem flash.
   */
  prefetchedProducts?: ProductRow[];
  /** Modelos de medida pré-carregados pelo componente pai. */
  prefetchedMeasures?: MeasureRow[];
}

function SortableProductItem({
  product,
  onRemove,
}: {
  product: ProductRow;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto' as const,
    opacity: isDragging ? 0.9 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-2 bg-white border border-neutral-200 rounded-xl ${isDragging ? 'shadow-lg' : ''}`}
    >
      <button
        type="button"
        className="p-1.5 -ml-1 text-neutral-400 hover:text-neutral-700 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        aria-label="Reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-9 h-9 rounded-md bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center">
        {product.image ? (
          <img src={product.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <ShoppingBag className="w-4 h-4 text-neutral-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-neutral-900 truncate">{product.name}</div>
        <div className="text-[11px] text-neutral-500">{product.currency} {product.price}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-neutral-400 hover:text-red-600 rounded-md hover:bg-neutral-100"
        aria-label="Remover"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ProductLinkModal({ open, onOpenChange, initial, onSave, onAddManual, onCreateProduct, refreshNonce, autoSelectProductId, onAutoSelectHandled, prefetchedProducts, prefetchedMeasures }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'produtos' | 'medida'>('produtos');
  const [layout, setLayout] = useState<Layout>(initial?.layout ?? 'lista');
  // Hidratação síncrona a partir do prefetch — evita o estado vazio + skeleton
  // e o consequente flash visual quando o modal abre.
  const [products, setProducts] = useState<ProductRow[]>(prefetchedProducts ?? []);
  const [measures, setMeasures] = useState<MeasureRow[]>(prefetchedMeasures ?? []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchMed, setSearchMed] = useState('');
  const [selProductIds, setSelProductIds] = useState<string[]>(initial?.productIds ?? []);
  const [selMeasure, setSelMeasure] = useState<string | null>(initial?.measureId ?? null);
  const [openList, setOpenList] = useState(false);
  const [openMedList, setOpenMedList] = useState(false);
  const [prodActiveIdx, setProdActiveIdx] = useState(0);
  const [medActiveIdx, setMedActiveIdx] = useState(0);
  const productWrapRef = useRef<HTMLDivElement | null>(null);
  const measureWrapRef = useRef<HTMLDivElement | null>(null);
  const prodTriggerRef = useRef<HTMLButtonElement | null>(null);
  const medTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!openList && !openMedList) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (openList && productWrapRef.current && !productWrapRef.current.contains(target)) {
        setOpenList(false);
        prodTriggerRef.current?.focus();
      }
      if (openMedList && measureWrapRef.current && !measureWrapRef.current.contains(target)) {
        setOpenMedList(false);
        medTriggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [openList, openMedList]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!open) return;
    setTab('produtos');
    setLayout(initial?.layout ?? 'lista');
    setSelProductIds(initial?.productIds ?? []);
    setSelMeasure(initial?.measureId ?? null);
    setSearch(''); setSearchMed('');
    setOpenList(false); setOpenMedList(false);
  }, [open, initial]);

  // Mantém o estado em sincronia com mudanças do prefetch vindas do pai
  // (sem flash, pois nunca esvaziamos o estado).
  useEffect(() => {
    if (prefetchedProducts) setProducts(prefetchedProducts);
  }, [prefetchedProducts]);
  useEffect(() => {
    if (prefetchedMeasures) setMeasures(prefetchedMeasures);
  }, [prefetchedMeasures]);

  useEffect(() => {
    if (!open || !user || !supabase) return;
    // Só mostramos o estado de "Carregando..." quando NÃO há dados em mãos.
    // Com prefetch, fazemos um refresh silencioso em segundo plano.
    const hasInitialData = products.length > 0 || measures.length > 0;
    if (!hasInitialData) setLoading(true);
    (async () => {
      const [p, m] = await Promise.all([
        supabase.from('products').select('id,name,price,currency,url,image').eq('user_id', user.id).order('created_at', { ascending: false }),
        (supabase as any).from('measure_models').select('id,name').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setProducts((p.data as any) ?? []);
      setMeasures((m.data as any) ?? []);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, refreshNonce]);

  useEffect(() => {
    if (!open || !autoSelectProductId) return;
    if (!products.some((p) => p.id === autoSelectProductId)) return;
    setSelProductIds((prev) => (prev.includes(autoSelectProductId) ? prev : [...prev, autoSelectProductId]));
    setOpenList(true);
    onAutoSelectHandled?.();
  }, [open, autoSelectProductId, products, onAutoSelectHandled]);

  const filteredProducts = useMemo(
    () => products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );
  const filteredMeasures = useMemo(
    () => measures.filter((m) => !searchMed || m.name.toLowerCase().includes(searchMed.toLowerCase())),
    [measures, searchMed]
  );

  const selectedProducts = useMemo(
    () => selProductIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as ProductRow[],
    [selProductIds, products],
  );

  const toggleProduct = (id: string) => {
    setSelProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setOpenList(false);
    setSearch('');
  };

  const removeProduct = (id: string) => {
    setSelProductIds((prev) => prev.filter((x) => x !== id));
  };

  const selectMeasure = (id: string) => {
    // Garante que a mesma medida não seja selecionada repetidamente
    if (selMeasure === id) {
      setSelMeasure(null);
    } else {
      setSelMeasure(id);
    }
    setOpenMedList(false);
    setSearchMed('');
    medTriggerRef.current?.focus();
  };

  // Focus the currently selected (or first) option when opening; reset on filter change
  useEffect(() => {
    if (!openList) return;
    const lastSel = selProductIds[selProductIds.length - 1];
    const idx = lastSel ? filteredProducts.findIndex((p) => p.id === lastSel) : -1;
    setProdActiveIdx(idx >= 0 ? idx : 0);
  }, [openList]);
  useEffect(() => { setProdActiveIdx(0); }, [search]);

  useEffect(() => {
    if (!openMedList) return;
    const idx = selMeasure ? filteredMeasures.findIndex((m) => m.id === selMeasure) : -1;
    setMedActiveIdx(idx >= 0 ? idx : 0);
  }, [openMedList]);
  useEffect(() => { setMedActiveIdx(0); }, [searchMed]);

  // Scroll active option into view
  useEffect(() => {
    if (!openList) return;
    const el = productWrapRef.current?.querySelector<HTMLElement>(`[data-prod-idx="${prodActiveIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [prodActiveIdx, openList]);
  useEffect(() => {
    if (!openMedList) return;
    const el = measureWrapRef.current?.querySelector<HTMLElement>(`[data-med-idx="${medActiveIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [medActiveIdx, openMedList]);

  const handleProdKey = (e: React.KeyboardEvent) => {
    const len = filteredProducts.length;
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      setOpenList(false);
      prodTriggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      // Close the listbox and let focus move naturally (Tab/Shift+Tab)
      setOpenList(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (len > 0) setProdActiveIdx((i) => (i + 1) % len);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (len > 0) setProdActiveIdx((i) => (i - 1 + len) % len);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setProdActiveIdx(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      if (len > 0) setProdActiveIdx(len - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = filteredProducts[prodActiveIdx];
      if (p) toggleProduct(p.id);
    }
  };

  const handleMedKey = (e: React.KeyboardEvent) => {
    const len = filteredMeasures.length;
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      setOpenMedList(false);
      medTriggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      setOpenMedList(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (len > 0) setMedActiveIdx((i) => (i + 1) % len);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (len > 0) setMedActiveIdx((i) => (i - 1 + len) % len);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setMedActiveIdx(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      if (len > 0) setMedActiveIdx(len - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const m = filteredMeasures[medActiveIdx];
      if (m) selectMeasure(m.id);
    }
  };

  const handleTriggerKey = (which: 'prod' | 'med') => (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (which === 'prod') setOpenList(true); else setOpenMedList(true);
    } else if (e.key === 'Escape') {
      if (which === 'prod') setOpenList(false); else setOpenMedList(false);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSelProductIds((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleSave = () => {
    onSave({ layout, productIds: selProductIds, measureId: selMeasure });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-5 border-b border-neutral-200">
          {([
            { id: 'produtos', label: 'Produtos', icon: ShoppingBag },
            { id: 'medida', label: 'Medida', icon: Ruler },
          ] as const).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative px-4 py-3 text-[14px] font-medium flex items-center gap-2 transition-colors ${
                  active ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-neutral-900 rounded-full" />}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-5 min-h-[280px]">
          {tab === 'produtos' ? (
            <div className="space-y-4">
              <div>
                <label className="text-[13px] font-semibold text-neutral-800 block mb-2">Layout dos produtos</label>
                <Select value={layout} onValueChange={(v) => setLayout(v as Layout)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lista">Lista</SelectItem>
                    <SelectItem value="cartoes">Cartões</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative" ref={productWrapRef}>
                <button
                  type="button"
                  ref={prodTriggerRef}
                  onClick={() => setOpenList((v) => !v)}
                  onKeyDown={handleTriggerKey('prod')}
                  aria-haspopup="listbox"
                  aria-expanded={openList}
                  className="w-full h-11 px-3 rounded-xl border border-neutral-200 bg-white text-left text-[14px] text-neutral-500 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-violet-500 flex items-center justify-between"
                >
                  <span className="truncate">
                    {selProductIds.length > 0
                      ? `${selProductIds.length} produto(s) selecionado(s)`
                      : 'Digite para procurar o produto cadastrado'}
                  </span>
                  <Search className="w-4 h-4 text-neutral-400" />
                </button>

                {openList && (
                  <div id="prod-listbox" className="absolute left-0 right-0 mt-1 z-30 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-64 overflow-auto" role="listbox" aria-label="Produtos cadastrados">
                    <div className="p-2 sticky top-0 bg-white border-b border-neutral-100">
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleProdKey}
                        placeholder="Buscar..."
                        className="h-9 rounded-lg"
                        aria-label="Buscar produto"
                        aria-controls="prod-listbox"
                        aria-activedescendant={filteredProducts[prodActiveIdx] ? `prod-opt-${prodActiveIdx}` : undefined}
                      />
                    </div>
                    {loading ? (
                      <div className="p-4 text-center text-[13px] text-neutral-400">Carregando...</div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-[13px] text-neutral-400">Nenhum produto cadastrado</div>
                    ) : (
                      filteredProducts.map((p, idx) => {
                        const sel = selProductIds.includes(p.id);
                        const active = idx === prodActiveIdx;
                        return (
                          <button
                            key={p.id}
                            id={`prod-opt-${idx}`}
                            type="button"
                            role="option"
                            data-prod-idx={idx}
                            aria-selected={sel}
                            onMouseEnter={() => setProdActiveIdx(idx)}
                            onClick={() => toggleProduct(p.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left ${active ? 'bg-neutral-100' : sel ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                          >
                            <div className="w-8 h-8 rounded-md bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center">
                              {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <ShoppingBag className="w-3.5 h-3.5 text-neutral-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium text-neutral-900 truncate">{p.name}</div>
                              <div className="text-[11px] text-neutral-500">{p.currency} {p.price}</div>
                            </div>
                            {sel && <Check className="w-4 h-4 text-neutral-900" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>


              {selectedProducts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-neutral-800">Produtos selecionados</label>
                    <span className="text-[11px] text-neutral-400">Arraste para reordenar</span>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={selProductIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2 max-h-56 overflow-auto pr-1">
                        {selectedProducts.map((p) => (
                          <SortableProductItem key={p.id} product={p} onRemove={() => removeProduct(p.id)} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2">
                {onCreateProduct && (
                  <button
                    type="button"
                    onClick={() => onCreateProduct()}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-neutral-900 text-white text-[13px] font-semibold hover:bg-neutral-800 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar novo Produto
                  </button>
                )}
                {onAddManual && (
                  <button
                    type="button"
                    onClick={() => onAddManual?.()}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white border border-neutral-200 text-[13px] font-medium text-neutral-900 hover:bg-neutral-50 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar manualmente
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="text-[13px] font-semibold text-neutral-800 block">Tabela de medidas</label>
              <div className="relative" ref={measureWrapRef}>
                <button
                  type="button"
                  ref={medTriggerRef}
                  onClick={() => setOpenMedList((v) => !v)}
                  onKeyDown={handleTriggerKey('med')}
                  aria-haspopup="listbox"
                  aria-expanded={openMedList}
                  className="w-full h-11 px-3 rounded-xl border border-neutral-200 bg-white text-left text-[14px] text-neutral-500 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-violet-500 flex items-center justify-between"
                >
                  <span className="truncate">
                    {selMeasure ? measures.find((m) => m.id === selMeasure)?.name ?? 'Selecionada' : 'Digite para procurar a medida cadastrada'}
                  </span>
                  <Search className="w-4 h-4 text-neutral-400" />
                </button>
                {openMedList && (
                  <div id="med-listbox" className="absolute left-0 right-0 mt-1 z-30 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-64 overflow-auto" role="listbox" aria-label="Medidas cadastradas">
                    <div className="p-2 sticky top-0 bg-white border-b border-neutral-100">
                      <Input
                        value={searchMed}
                        onChange={(e) => setSearchMed(e.target.value)}
                        onKeyDown={handleMedKey}
                        placeholder="Buscar..."
                        className="h-9 rounded-lg"
                        aria-label="Buscar medida"
                        aria-controls="med-listbox"
                        aria-activedescendant={filteredMeasures[medActiveIdx] ? `med-opt-${medActiveIdx}` : undefined}
                      />
                    </div>
                    {loading ? (
                      <div className="p-4 text-center text-[13px] text-neutral-400">Carregando...</div>
                    ) : filteredMeasures.length === 0 ? (
                      <div className="p-4 text-center text-[13px] text-neutral-400">Nenhuma medida cadastrada</div>
                    ) : (
                      filteredMeasures.map((m, idx) => {
                        const sel = selMeasure === m.id;
                        const active = idx === medActiveIdx;
                        return (
                          <button
                            key={m.id}
                            id={`med-opt-${idx}`}
                            type="button"
                            role="option"
                            data-med-idx={idx}
                            aria-selected={sel}
                            disabled={sel}
                            onMouseEnter={() => setMedActiveIdx(idx)}
                            onClick={() => selectMeasure(m.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-left ${sel ? 'bg-neutral-50 cursor-not-allowed opacity-80' : active ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
                          >
                            <span className="text-[13px] font-medium text-neutral-900 truncate">{m.name}</span>
                            {sel && <Check className="w-4 h-4 text-neutral-900" />}
                          </button>

                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 h-10 rounded-lg text-[14px] font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-save px-5 h-10 rounded-full text-[14px] font-semibold"
          >
            Salvar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
