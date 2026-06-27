import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/toaster';
import { Plus, Copy, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/helpers';

type Preset = Tables<'appearance_presets'>;
type Kind = 'floating' | 'carousel';

const PAGE_SIZE_OPTIONS = [8, 16, 32, 64];


export default function AppearancePresets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { appId } = useParams();
  const [kind, setKind] = useState<Kind>('floating');
  const [items, setItems] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('appearance_presets')
      .select('*')
      .eq('user_id', user.id)
      .eq('kind', kind)
      .order('created_at', { ascending: true });
    setItems(data ?? []);
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

  async function remove(p: Preset) {
    if (!confirm(`Excluir "${p.name}"?`)) return;
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

      <div className="bg-white border border-neutral-200 rounded-2xl p-6">


      <div className="mt-4 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] text-xs uppercase tracking-wide text-neutral-500 font-medium border-b border-neutral-200 pb-3">
          <div>Nome</div>
          <div className="text-right pr-1">Ações</div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-neutral-500 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-12 text-center text-sm text-neutral-500">
            Nenhum padrão criado ainda. Clique em <strong>Adicionar</strong> para começar.
          </div>
        ) : (
          pageItems.map((p) => (
            <div key={p.id} className="grid grid-cols-[1fr_auto] items-center py-4 border-b border-neutral-100">
              <div className="text-sm text-neutral-800">{p.name}</div>
              <div className="flex items-center gap-2">
                <button
                  title="Duplicar"
                  onClick={() => duplicate(p)}
                  className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 text-white grid place-items-center"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  title="Editar"
                  onClick={() => navigate(`/app/${appId}/aparencia/${p.id}?kind=${p.kind}`)}
                  className="w-9 h-9 rounded-full bg-yellow-400 hover:bg-yellow-500 text-neutral-900 grid place-items-center"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  title="Excluir"
                  onClick={() => remove(p)}
                  className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white grid place-items-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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

      </div>
    </div>
  );
}

