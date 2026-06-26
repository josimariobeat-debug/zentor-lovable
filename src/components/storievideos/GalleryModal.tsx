import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Search, Check, Image as ImageIcon } from 'lucide-react';
import { GalleryCard } from '@/components/ui/GalleryCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/helpers';

type GalleryMedia = Tables<'media_gallery'>;

interface GalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (items: GalleryMedia[]) => void;
  multiple?: boolean;
}

export default function GalleryModal({ open, onOpenChange, onSelect, multiple = true }: GalleryModalProps) {
  const { user } = useAuth();
  const [media, setMedia] = useState<GalleryMedia[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      loadMedia();
      setSelected(new Set());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadMedia = async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.
    from('media_gallery').
    select('*').
    eq('user_id', user.id).
    order('created_at', { ascending: false });
    setMedia(data ?? []);
  };

  const filtered = (media ?? []).filter((m) =>
  !search || m.name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (!multiple) newSelected.clear();
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const handleConfirm = () => {
    const selectedItems = (media ?? []).filter((m) => selected.has(m.id));
    onSelect(selectedItems);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Galeria de Mídias</DialogTitle>
        </DialogHeader>
        
        <div data-ev-id="ev_aa155b0a0f" className="px-6 pb-4">
          <div data-ev-id="ev_b71ad9ad66" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar mídias..."
              className="pl-9 h-10 rounded-xl border-neutral-200" />

          </div>
        </div>

        <div data-ev-id="ev_6a67313ecd" className="flex-1 overflow-auto px-6 pb-4">
          {media === null ?
          <div data-ev-id="ev_c91924a5b1" className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) =>
            <Skeleton key={i} className="aspect-square rounded-xl" />
            )}
            </div> :
          filtered.length === 0 ?
          <div data-ev-id="ev_ec3b9e8397" className="text-center py-12 text-neutral-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
              <p data-ev-id="ev_314cd5ebc8" className="text-sm">
                {search ? 'Nenhuma mídia encontrada' : 'Nenhuma mídia na galeria ainda'}
              </p>
              <p data-ev-id="ev_594d9d89ea" className="text-xs mt-1 text-neutral-400">
                Faça upload de mídias para vê-las aqui
              </p>
            </div> :

          <div data-ev-id="ev_cef7725820" className="grid grid-cols-3 gap-3">
              {filtered.map((m) => (
                <GalleryCard
                  key={m.id}
                  id={m.id}
                  url={m.url}
                  type={m.type as 'image' | 'video'}
                  name={m.name || undefined}
                  isSelected={selected.has(m.id)}
                  isSelectionMode={true}
                  showDelete={false}
                  showName={true}
                  onSelect={toggleSelect}
                  onClick={toggleSelect}
                />
              ))}
            </div>
          }
        </div>

        <div data-ev-id="ev_f3929779a2" className="px-6 pb-6 pt-4 border-t border-neutral-200 flex items-center justify-between">
          <span data-ev-id="ev_0549bd0ac8" className="text-sm text-neutral-500">
            {selected.size} {selected.size === 1 ? 'item selecionado' : 'itens selecionados'}
          </span>
          <div data-ev-id="ev_4a745c294d" className="flex gap-2">
            <button data-ev-id="ev_e779001712"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">

              Cancelar
            </button>
            <button data-ev-id="ev_0b3aabb65e"
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-lg transition-colors">

              Adicionar {selected.size > 0 && `(${selected.size})`}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);

}