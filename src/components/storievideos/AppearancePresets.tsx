import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/toaster';
import { Plus, Copy, Pencil, Trash2 } from 'lucide-react';
import { StoriesRowsSkeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/helpers';
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog';
import AppearanceMiniPreview, { type MiniConfig } from './AppearanceMiniPreview';

type Preset = Tables<'appearance_presets'>;
type Kind = 'floating' | 'carousel';

const PAGE_SIZE_OPTIONS = [8, 16, 32, 64];


// Module-level cache to avoid skeleton flicker on tab re-entry / kind switch.
const presetsCache = new Map<string, Preset[]>();
const cacheKey = (userId: string, kind: Kind) => `${userId}::${kind}`;

// Module-level cache for the "first story" thumbnail per app — keeps the
// mini preview thumbnail stable and avoids re-fetching across tab switches.
const firstStoryCache = new Map<string, { url: string; type: 'image' | 'video' } | null>();

export default function AppearancePresets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { appId } = useParams();
  const [kind, setKind] = useState<Kind>('floating');
  const initialKey = user ? cacheKey(user.id, 'floating') : null;
  const initialCached = initialKey ? presetsCache.get(initialKey) : undefined;
  const [items, setItems] = useState<Preset[]>(initialCached ?? []);
  const [loading, setLoading] = useState(!initialCached);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [toDelete, setToDelete] = useState<Preset | null>(null);
  const [firstMedia, setFirstMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(
    appId ? firstStoryCache.get(appId) ?? null : null,
  );

  useEffect(() => {
    let cancelled = false;
    async function loadFirstStory() {
      if (!appId) return;
      if (firstStoryCache.has(appId)) {
        setFirstMedia(firstStoryCache.get(appId) ?? null);
        return;
      }
      const { data } = await supabase
        .from('stories')
        .select('id, created_at, story_media(url, type, is_cover, order_index)')
        .eq('app_id', appId)
        .order('created_at', { ascending: true })
        .limit(1);
      const story = data?.[0];
      const media = story?.story_media as Array<{ url: string; type: string; is_cover?: boolean; order_index?: number }> | undefined;
      const cover = media?.find((m) => m.is_cover) ?? media?.[0];
      const next = cover?.url
        ? { url: cover.url, type: (String(cover.type).includes('video') ? 'video' : 'image') as 'image' | 'video' }
        : null;
      firstStoryCache.set(appId, next);
      if (!cancelled) setFirstMedia(next);
    }
    loadFirstStory();
    return () => { cancelled = true; };
  }, [appId]);

  async function load() {
    if (!user) return;
    const key = cacheKey(user.id, kind);
    const cached = presetsCache.get(key);
    if (cached) {
      setItems(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    const { data } = await supabase
      .from('appearance_presets')
      .select('*')
      .eq('user_id', user.id)
      .eq('kind', kind)
      .order('created_at', { ascending: true });
    const next = data ?? [];
    presetsCache.set(key, next);
    setItems(next);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, kind]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  async function duplicate(p: Preset) {
    const { error } = await supabase.from('appearance_presets').insert({
      user_id: user!.id,
      name: `${p.name} (cópia)`,
      kind: p.kind,
      config: p.config as unknown as never,
    });
    if (error) { toast.error('Erro ao duplicar'); return; }
    toast.success('Padrão duplicado');
    load();
  }

  async function confirmRemove(p: Preset) {
    const { error } = await supabase.from('appearance_presets').delete().eq('id', p.id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Padrão excluído');
    load();
  }

  return (
    <div>
      {/* Header row — mirrors the Stories tab pattern (controls left, Adicionar right, outside the card) */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1 border-b border-neutral-200">
          {[
            { v: 'floating' as const, label: 'Widget Flutuante' },
            { v: 'carousel' as const, label: 'Carrossel' },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => { setKind(t.v); setPage(1); }}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors ${
                kind === t.v
                  ? 'text-neutral-900 border-neutral-900 bg-neutral-50'
                  : 'text-neutral-500 border-transparent hover:text-neutral-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => navigate(`/app/${appId}/aparencia/new?kind=${kind}`)}
          className="inline-flex items-center gap-2 text-[13.5px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>

      {loading ? (
        <StoriesRowsSkeleton count={3} />
      ) : pageItems.length === 0 ? (
        <div className="border border-dashed border-neutral-300 rounded-2xl p-16 text-center text-neutral-500">
          Nenhum padrão criado ainda. Clique em <b className="text-neutral-700">Adicionar</b> para começar.
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          {pageItems.map((p, idx) => (
            <div
              key={p.id}
              className={`flex items-center gap-2.5 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 ${idx !== pageItems.length - 1 ? 'border-b border-neutral-100' : ''}`}
            >
              <div className="shrink-0">
                {/* Smaller on very small screens to preserve room for title + actions */}
                <span className="hidden xs:inline-block">
                  <AppearanceMiniPreview
                    config={(p.config as unknown as MiniConfig) ?? null}
                    kind={p.kind as 'floating' | 'carousel'}
                    width={48}
                    firstMedia={firstMedia}
                  />
                </span>
                <span className="inline-block xs:hidden">
                  <AppearanceMiniPreview
                    config={(p.config as unknown as MiniConfig) ?? null}
                    kind={p.kind as 'floating' | 'carousel'}
                    width={40}
                    firstMedia={firstMedia}
                  />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[13.5px] sm:text-[14.5px] font-semibold text-neutral-900 truncate">{p.name}</h4>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
                <button
                  title="Duplicar"
                  onClick={() => duplicate(p)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-700 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  title="Editar"
                  onClick={() => navigate(`/app/${appId}/aparencia/${p.id}?kind=${p.kind}`)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  title="Excluir"
                  onClick={() => setToDelete(p)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-neutral-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-5 text-sm text-neutral-600">
        <div>Página {page} de {totalPages}</div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            Ir para a página
            <input
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={(e) => {
                const v = Math.max(1, Math.min(totalPages, Number(e.target.value) || 1));
                setPage(v);
              }}
              className="w-16 h-9 px-2 rounded-lg border border-neutral-200"
            />
          </label>
          <label className="flex items-center gap-2">
            Mostrar
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="h-9 px-2 rounded-lg border border-neutral-200 bg-white"
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div className="flex items-center">
            <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 h-9 disabled:opacity-30">«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 h-9 disabled:opacity-30">‹</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 h-9 disabled:opacity-30">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 h-9 disabled:opacity-30">»</button>
          </div>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={() => setToDelete(null)}
        title="Excluir aparência"
        itemName={toDelete?.name}
        onConfirm={async () => {
          if (toDelete) {
            await confirmRemove(toDelete);
            setToDelete(null);
          }
        }}
      />
    </div>
  );
}


