import { createFileRoute } from '@tanstack/react-router';
import { CORS_HEADERS, jsonCors, preflight } from '@/lib/cors';
import { storyMatchesPath } from '@/lib/urlMatch';

const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 days

async function reSign(rawUrl: string | null | undefined, admin: any): Promise<string | null> {
  if (!rawUrl) return null;
  const idx = rawUrl.indexOf('/storage/v1/object/');
  if (idx === -1) return rawUrl;
  const rest = rawUrl.slice(idx + '/storage/v1/object/'.length);
  const parts = rest.replace(/^sign\//, '').replace(/^public\//, '').split('?')[0].split('/');
  const bucket = parts.shift();
  const objectPath = parts.join('/');
  if (bucket !== 'media' || !objectPath) return rawUrl;
  try {
    const { data } = await admin.storage.from('media').createSignedUrl(objectPath, SIGNED_TTL);
    return data?.signedUrl ?? rawUrl;
  } catch {
    return rawUrl;
  }
}

export const Route = createFileRoute('/api/public/widget')({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const storeId = url.searchParams.get('store') ?? '';
        const path = url.searchParams.get('path') ?? '/';
        if (!/^[a-z0-9_]{6,40}$/i.test(storeId)) {
          return jsonCors({ error: 'invalid_store' }, { status: 400 });
        }
        try {
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

          const { data: store } = await supabaseAdmin
            .from('stores')
            .select('store_id, name, theme, active, user_id')
            .eq('store_id', storeId)
            .maybeSingle();
          if (!store || !store.active) return jsonCors({ error: 'not_found' }, { status: 404 });

          const { data: rows, error } = await supabaseAdmin
            .from('stories')
            .select('id, title, cta, cover_url, thumbnail_url, urls, appearance_preset_id, story_media(id, url, type, is_cover, position, product_ids, measure_id)')
            .eq('store_id', storeId)
            .eq('active', true)
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) return jsonCors({ error: 'server_error' }, { status: 500 });

          const filtered = (rows ?? []).filter((s: any) => storyMatchesPath(s.urls, path));

          // Coleta IDs de produtos, medidas e presets referenciados por qualquer mídia dos stories visíveis.
          const productIds = new Set<string>();
          const measureIds = new Set<string>();
          const presetIds = new Set<string>();
          for (const s of filtered) {
            if (s.appearance_preset_id) presetIds.add(s.appearance_preset_id);
            for (const m of (s.story_media ?? []) as any[]) {
              if (Array.isArray(m.product_ids)) m.product_ids.forEach((id: string) => id && productIds.add(id));
              if (m.measure_id) measureIds.add(m.measure_id);
            }
          }

          // Fetch batelado (owner = store.user_id garante isolamento).
          const [productsRes, measuresRes, presetsRes] = await Promise.all([
            productIds.size
              ? supabaseAdmin
                  .from('products')
                  .select('id, name, price, currency, url, image')
                  .in('id', Array.from(productIds))
                  .eq('user_id', store.user_id)
              : Promise.resolve({ data: [] as any[] }),
            measureIds.size
              ? supabaseAdmin
                  .from('measure_models')
                  .select('id, name, measure_rows(id, size_name, measure_type, value_cm, position, size_used)')
                  .in('id', Array.from(measureIds))
                  .eq('user_id', store.user_id)
              : Promise.resolve({ data: [] as any[] }),
            presetIds.size
              ? supabaseAdmin
                  .from('appearance_presets')
                  .select('id, config')
                  .in('id', Array.from(presetIds))
                  .eq('user_id', store.user_id)
              : Promise.resolve({ data: [] as any[] }),
          ]);

          const productMap = new Map<string, any>();
          for (const p of (productsRes.data ?? []) as any[]) {
            productMap.set(p.id, { id: p.id, name: p.name, price: String(p.price ?? ''), image: p.image ?? null, url: p.url ?? null });
          }

          const measureMap = new Map<string, any>();
          for (const m of (measuresRes.data ?? []) as any[]) {
            const rowsArr = ((m.measure_rows ?? []) as any[])
              .slice()
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
              .map((r) => ({ id: r.id, tamanho: r.size_name, medida: r.measure_type, valor: String(r.value_cm), size_used: r.size_used ?? null }));
            measureMap.set(m.id, { id: m.id, name: m.name, rows: rowsArr });
          }

          const presetMap = new Map<string, any>();
          for (const p of (presetsRes.data ?? []) as any[]) {
            presetMap.set(p.id, p.config ?? {});
          }

          const stories = await Promise.all(
            filtered.map(async (s: any) => {
              const media = (s.story_media ?? [])
                .slice()
                .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
              // cover primeiro
              const coverIdx = media.findIndex((m: any) => m.is_cover);
              if (coverIdx > 0) {
                const [cover] = media.splice(coverIdx, 1);
                media.unshift(cover);
              }
              const cover = media[0];

              const items = await Promise.all(
                media.map(async (m: any) => {
                  const products = Array.isArray(m.product_ids)
                    ? m.product_ids
                        .map((id: string) => productMap.get(id))
                        .filter(Boolean)
                    : [];
                  const measure = m.measure_id ? measureMap.get(m.measure_id) ?? null : null;
                  return {
                    id: m.id,
                    url: await reSign(m.url, supabaseAdmin),
                    type: m.type,
                    products,
                    measure,
                  };
                }),
              );

              return {
                id: s.id,
                title: s.title,
                cta: s.cta,
                cover: (await reSign(s.thumbnail_url ?? s.cover_url ?? cover?.url ?? null, supabaseAdmin)) ?? null,
                appearance: s.appearance_preset_id ? presetMap.get(s.appearance_preset_id) ?? null : null,
                media: items.filter((m) => !!m.url),
              };
            }),
          );

          return jsonCors(
            {
              version: '2',
              store: { store_id: store.store_id, name: store.name, theme: store.theme, active: store.active },
              stories,
            },
            {
              headers: {
                ...CORS_HEADERS,
                'Cache-Control': 'public, max-age=30, s-maxage=30',
              },
            },
          );
        } catch {
          return jsonCors({ error: 'server_error' }, { status: 500 });
        }
      },
    },
  },
});
