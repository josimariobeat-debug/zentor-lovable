import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Search, Plus, ShoppingBag, Ruler, Check } from 'lucide-react';

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
}

export default function ProductLinkModal({ open, onOpenChange, initial, onSave, onAddManual, onCreateProduct, refreshNonce, autoSelectProductId, onAutoSelectHandled }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'produtos' | 'medida'>('produtos');
  const [layout, setLayout] = useState<Layout>(initial?.layout ?? 'lista');
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [measures, setMeasures] = useState<MeasureRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchMed, setSearchMed] = useState('');
  const [selProducts, setSelProducts] = useState<Set<string>>(new Set(initial?.productIds ?? []));
  const [selMeasure, setSelMeasure] = useState<string | null>(initial?.measureId ?? null);
  const [openList, setOpenList] = useState(false);
  const [openMedList, setOpenMedList] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab('produtos');
    setLayout(initial?.layout ?? 'lista');
    setSelProducts(new Set(initial?.productIds ?? []));
    setSelMeasure(initial?.measureId ?? null);
    setSearch(''); setSearchMed('');
    setOpenList(false); setOpenMedList(false);
  }, [open, initial]);

  useEffect(() => {
    if (!open || !user || !supabase) return;
    setLoading(true);
    (async () => {
      const [p, m] = await Promise.all([
        supabase.from('products').select('id,name,price,currency,url,image').eq('user_id', user.id).order('created_at', { ascending: false }),
        (supabase as any).from('measure_models').select('id,name').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setProducts((p.data as any) ?? []);
      setMeasures((m.data as any) ?? []);
      setLoading(false);
    })();
  }, [open, user, refreshNonce]);

  // Auto-seleciona produto recém criado após o reload
  useEffect(() => {
    if (!open || !autoSelectProductId) return;
    if (!products.some((p) => p.id === autoSelectProductId)) return;
    setSelProducts((prev) => {
      if (prev.has(autoSelectProductId)) return prev;
      const next = new Set(prev);
      next.add(autoSelectProductId);
      return next;
    });
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

  const toggleProduct = (id: string) => {
    const next = new Set(selProducts);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelProducts(next);
  };

  const handleSave = () => {
    onSave({ layout, productIds: Array.from(selProducts), measureId: selMeasure });
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

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenList((v) => !v)}
                  className="w-full h-11 px-3 rounded-xl border border-neutral-200 bg-white text-left text-[14px] text-neutral-500 hover:border-neutral-300 flex items-center justify-between"
                >
                  <span className="truncate">
                    {selProducts.size > 0
                      ? `${selProducts.size} produto(s) selecionado(s)`
                      : 'Digite para procurar o produto cadastrado'}
                  </span>
                  <Search className="w-4 h-4 text-neutral-400" />
                </button>

                {openList && (
                  <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-64 overflow-auto">
                    <div className="p-2 sticky top-0 bg-white border-b border-neutral-100">
                      <Input
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar..."
                        className="h-9 rounded-lg"
                      />
                    </div>
                    {loading ? (
                      <div className="p-4 text-center text-[13px] text-neutral-400">Carregando...</div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-[13px] text-neutral-400">Nenhum produto cadastrado</div>
                    ) : (
                      filteredProducts.map((p) => {
                        const sel = selProducts.has(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleProduct(p.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 text-left ${sel ? 'bg-neutral-50' : ''}`}
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMedList((v) => !v)}
                  className="w-full h-11 px-3 rounded-xl border border-neutral-200 bg-white text-left text-[14px] text-neutral-500 hover:border-neutral-300 flex items-center justify-between"
                >
                  <span className="truncate">
                    {selMeasure ? measures.find((m) => m.id === selMeasure)?.name ?? 'Selecionada' : 'Digite para procurar a medida cadastrada'}
                  </span>
                  <Search className="w-4 h-4 text-neutral-400" />
                </button>
                {openMedList && (
                  <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-64 overflow-auto">
                    <div className="p-2 sticky top-0 bg-white border-b border-neutral-100">
                      <Input
                        autoFocus
                        value={searchMed}
                        onChange={(e) => setSearchMed(e.target.value)}
                        placeholder="Buscar..."
                        className="h-9 rounded-lg"
                      />
                    </div>
                    {loading ? (
                      <div className="p-4 text-center text-[13px] text-neutral-400">Carregando...</div>
                    ) : filteredMeasures.length === 0 ? (
                      <div className="p-4 text-center text-[13px] text-neutral-400">Nenhuma medida cadastrada</div>
                    ) : (
                      filteredMeasures.map((m) => {
                        const sel = selMeasure === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => { setSelMeasure(sel ? null : m.id); setOpenMedList(false); }}
                            className={`w-full flex items-center justify-between px-3 py-2 hover:bg-neutral-50 text-left ${sel ? 'bg-neutral-50' : ''}`}
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
            className="px-5 h-10 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-[14px] font-semibold"
          >
            Salvar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
