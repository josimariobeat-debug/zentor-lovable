import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/toaster';
import { Plus, Copy, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/helpers';

type Preset = Tables<'appearance_presets'>;
type Kind = 'floating' | 'carousel';

const POSITIONS = [
  { value: 'bottom-left', label: 'Inferior esquerda' },
  { value: 'bottom-right', label: 'Inferior direita' },
  { value: 'top-left', label: 'Superior esquerda' },
  { value: 'top-right', label: 'Superior direita' },
];
const PAGE_SIZE_OPTIONS = [8, 16, 32, 64];

type Config = {
  mode: 'dark' | 'light';
  position: string;
  accent: string;
  borderColor: string;
  bubbleSize: number;
  showLabel: boolean;
};

const DEFAULT_CONFIG: Config = {
  mode: 'dark',
  position: 'bottom-left',
  accent: '#7c3aed',
  borderColor: '#e11d48',
  bubbleSize: 64,
  showLabel: true,
};

export default function AppearancePresets() {
  const { user } = useAuth();
  const [kind, setKind] = useState<Kind>('floating');
  const [items, setItems] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [editing, setEditing] = useState<Preset | null>(null);
  const [creating, setCreating] = useState(false);

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
      config: p.config as Record<string, unknown>,
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
    <div className="bg-white border border-neutral-200 rounded-2xl p-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200 -mt-2 -mx-2 px-2">
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

      <div className="flex justify-end mt-6">
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>

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
                  onClick={() => setEditing(p)}
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

      {(creating || editing) && (
        <PresetEditor
          kind={kind}
          preset={editing}
          userId={user!.id}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function PresetEditor({
  kind, preset, userId, onClose, onSaved,
}: {
  kind: Kind;
  preset: Preset | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial: Config = { ...DEFAULT_CONFIG, ...((preset?.config as Partial<Config>) ?? {}) };
  const [name, setName] = useState(preset?.name ?? '');
  const [cfg, setCfg] = useState<Config>(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) { toast.error('Dê um nome ao padrão'); return; }
    setSaving(true);
    if (preset) {
      const { error } = await supabase
        .from('appearance_presets')
        .update({ name: name.trim(), config: cfg as unknown as Record<string, unknown> })
        .eq('id', preset.id);
      if (error) { setSaving(false); toast.error('Erro ao salvar'); return; }
    } else {
      const { error } = await supabase
        .from('appearance_presets')
        .insert({ user_id: userId, kind, name: name.trim(), config: cfg as unknown as Record<string, unknown> });
      if (error) { setSaving(false); toast.error('Erro ao criar'); return; }
    }
    setSaving(false);
    toast.success('Padrão salvo');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-neutral-200">
          <h3 className="text-base font-semibold text-neutral-900">
            {preset ? 'Editar padrão' : 'Novo padrão'} · {kind === 'floating' ? 'Widget Flutuante' : 'Carrossel'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-neutral-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-neutral-700 font-medium">Nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Padrão da Black Friday"
              className="h-10 rounded-xl border border-neutral-200 px-3"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-neutral-700 font-medium">Modo</span>
              <select
                className="h-10 rounded-xl border border-neutral-200 px-3 bg-white"
                value={cfg.mode}
                onChange={(e) => setCfg({ ...cfg, mode: e.target.value as 'dark' | 'light' })}
              >
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-neutral-700 font-medium">Posição</span>
              <select
                className="h-10 rounded-xl border border-neutral-200 px-3 bg-white"
                value={cfg.position}
                onChange={(e) => setCfg({ ...cfg, position: e.target.value })}
                disabled={kind === 'carousel'}
              >
                {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-neutral-700 font-medium">Cor de destaque</span>
              <input
                type="color"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white cursor-pointer"
                value={cfg.accent}
                onChange={(e) => setCfg({ ...cfg, accent: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-neutral-700 font-medium">Cor da borda</span>
              <input
                type="color"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white cursor-pointer"
                value={cfg.borderColor}
                onChange={(e) => setCfg({ ...cfg, borderColor: e.target.value })}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-neutral-700 font-medium">Tamanho da bolinha ({cfg.bubbleSize}px)</span>
            <input
              type="range"
              min={48}
              max={96}
              value={cfg.bubbleSize}
              onChange={(e) => setCfg({ ...cfg, bubbleSize: Number(e.target.value) })}
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-neutral-700 select-none">
            <input
              type="checkbox"
              checked={cfg.showLabel}
              onChange={(e) => setCfg({ ...cfg, showLabel: e.target.checked })}
              className="h-4 w-4"
            />
            Mostrar título embaixo da bolinha
          </label>
        </div>
        <div className="p-5 border-t border-neutral-200 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-50">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
