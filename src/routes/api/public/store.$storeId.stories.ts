import { createFileRoute } from '@tanstack/react-router';
import { CORS_HEADERS, jsonCors, preflight } from '@/lib/cors';

const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 days

export const Route = createFileRoute('/api/public/store/$storeId/stories')({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ params }) => {
        const { storeId } = params;
        if (!storeId || !/^[a-z0-9_]{6,40}$/i.test(storeId)) {
          return jsonCors({ error: 'invalid_store' }, { status: 400 });
        }
        try {
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

          const { data: store } = await supabaseAdmin
            .from('stores')
            .select('store_id, active')
            .eq('store_id', storeId)
            .maybeSingle();
          if (!store || !store.active) return jsonCors({ error: 'not_found' }, { status: 404 });

          const { data: rows, error } = await supabaseAdmin
            .from('stories')
            .select('id, title, cta, cover_url, thumbnail_url, urls, story_media(url, type, is_cover, position)')
            .eq('store_id', storeId)
            .eq('active', true)
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) return jsonCors({ error: 'server_error' }, { status: 500 });

          // Re-sign storage URLs that point at our private bucket (best-effort, public URLs pass through).
          const reSign = async (rawUrl: string | null | undefined): Promise<string | null> => {
            if (!rawUrl) return null;
            const idx = rawUrl.indexOf('/storage/v1/object/');
            if (idx === -1) return rawUrl;
            const rest = rawUrl.slice(idx + '/storage/v1/object/'.length);
            const parts = rest.replace(/^sign\//, '').replace(/^public\//, '').split('?')[0].split('/');
            const bucket = parts.shift();
            const objectPath = parts.join('/');
            if (bucket !== 'media' || !objectPath) return rawUrl;
            try {
              const { data } = await supabaseAdmin.storage.from('media').createSignedUrl(objectPath, SIGNED_TTL);
              return data?.signedUrl ?? rawUrl;
            } catch {
              return rawUrl;
            }
          };

          const stories = await Promise.all(
            (rows ?? []).map(async (s) => {
              const media = (s.story_media ?? []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
              const cover = media.find((m) => m.is_cover) ?? media[0];
              const items = await Promise.all(
                media.map(async (m) => ({
                  url: await reSign(m.url),
                  type: m.type,
                })),
              );
              return {
                id: s.id,
                title: s.title,
                cta: s.cta,
                cover: (await reSign(s.thumbnail_url ?? s.cover_url ?? cover?.url ?? null)) ?? null,
                media: items.filter((m) => !!m.url),
              };
            }),
          );

          return jsonCors(
            { stories },
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
