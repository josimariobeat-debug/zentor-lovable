import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/toaster';
import { Copy, Check, ExternalLink, Code2, Eye, Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/helpers';



type Store = Tables<'stores'>;
type Theme = { mode: 'dark' | 'light'; position: string; accent: string };

const POSITIONS = [
  { value: 'bottom-left', label: 'Inferior esquerda' },
  { value: 'bottom-right', label: 'Inferior direita' },
  { value: 'top-left', label: 'Superior esquerda' },
  { value: 'top-right', label: 'Superior direita' },
];

export default function IntegracaoTab() {
  const { user } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ impressions: number; opens: number; clicks: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('stores').select('*').eq('user_id', user.id).maybeSingle();
      setStore(data);
      setLoading(false);
      if (data) {
        const { data: events } = await supabase
          .from('widget_events')
          .select('event_type')
          .eq('store_id', data.store_id);
        if (events) {
          setStats({
            impressions: events.filter((e) => e.event_type === 'impression').length,
            opens: events.filter((e) => e.event_type === 'open').length,
            clicks: events.filter((e) => e.event_type === 'click').length,
          });
        }
      }
    })();
  }, [user]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const snippet = useMemo(
    () =>
      store
        ? `<script src="${origin}/widget.js" data-store="${store.store_id}" async></script>`
        : '',
    [store, origin],
  );

  const theme = (store?.theme as Theme | null) ?? { mode: 'dark', position: 'bottom-left', accent: '#111111' };

  async function update(patch: Partial<Store>) {
    if (!store) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('stores')
      .update(patch)
      .eq('id', store.id)
      .select()
      .single();
    setSaving(false);
    if (error) { toast.error('Erro ao salvar'); return; }
    setStore(data);
    toast.success('Salvo');
  }

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      toast.success('Script copiado');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function testIntegration() {
    if (!store) return;
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Teste Zentor — ${store.store_id}</title><style>body{font-family:system-ui,sans-serif;background:#f5f5f5;margin:0;padding:40px;color:#111}h1{font-size:22px}.box{max-width:640px;background:#fff;padding:24px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.06)}</style></head><body><div class="box"><h1>Página de teste — ${store.store_id}</h1><p>Esta é uma página em branco com o widget Zentor instalado. Você deve ver as bolinhas dos stories no canto da tela.</p></div><script src="${origin}/widget.js" data-store="${store.store_id}" async></script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
      </div>
    );
  }

  if (!store) {
    return <div className="text-sm text-neutral-500">Nenhuma loja vinculada à sua conta.</div>;
  }

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <div className="bg-white border border-neutral-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">
              <Code2 className="w-4 h-4" /> ID da loja
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-neutral-900 font-mono">{store.store_id}</h2>
            <p className="mt-1 text-sm text-neutral-500">Use este ID no script abaixo. Cada loja tem um ID único.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={store.active}
              onChange={(e) => update({ active: e.target.checked })}
              disabled={saving}
              className="h-4 w-4"
            />
            Widget ativo
          </label>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-neutral-900">Seu código de instalação</h3>
        <p className="text-sm text-neutral-500 mt-1">
          Cole este trecho antes do fechamento da tag <code className="text-xs bg-neutral-100 px-1 rounded">&lt;/body&gt;</code> da sua loja.
          Funciona em Shopify, WBuy, WooCommerce, Tray, Yampi, Loja Integrada e HTML puro.
        </p>
        <div className="mt-4 relative">
          <pre className="bg-neutral-900 text-neutral-100 text-[12.5px] leading-relaxed rounded-xl p-4 pr-14 overflow-x-auto whitespace-pre-wrap break-all">{snippet}</pre>
          <button
            onClick={copy}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-white text-neutral-900 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-neutral-100"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={testIntegration}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            <Eye className="w-4 h-4" /> Testar integração
          </button>
          <a
            href={`${origin}/widget.js`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            <ExternalLink className="w-4 h-4" /> Ver widget.js
          </a>
        </div>
      </div>

      <AppearancePresets />


      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Impressões', value: stats.impressions },
            { label: 'Aberturas', value: stats.opens },
            { label: 'Cliques no CTA', value: stats.clicks },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-neutral-200 rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wide text-neutral-500 font-medium">{s.label}</div>
              <div className="mt-1 text-2xl font-semibold text-neutral-900">{s.value.toLocaleString('pt-BR')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
