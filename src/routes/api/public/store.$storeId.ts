import { createFileRoute } from '@tanstack/react-router';
import { CORS_HEADERS, jsonCors, preflight } from '@/lib/cors';

export const Route = createFileRoute('/api/public/store/$storeId')({
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
          const { data, error } = await supabaseAdmin
            .from('stores')
            .select('store_id, name, theme, active')
            .eq('store_id', storeId)
            .maybeSingle();
          if (error) return jsonCors({ error: 'server_error' }, { status: 500 });
          if (!data || !data.active) return jsonCors({ error: 'not_found' }, { status: 404 });
          return jsonCors(
            { store_id: data.store_id, name: data.name, theme: data.theme },
            {
              headers: {
                ...CORS_HEADERS,
                'Cache-Control': 'public, max-age=60, s-maxage=60',
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
