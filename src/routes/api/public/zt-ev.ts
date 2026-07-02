import { createFileRoute } from '@tanstack/react-router';
import { jsonCors, preflight } from '@/lib/cors';

const ALLOWED = new Set(['impression', 'open', 'view', 'completed', 'click']);

export const Route = createFileRoute('/api/public/track')({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body !== 'object') return jsonCors({ error: 'invalid' }, { status: 400 });
          const { store_id, story_id, event_type, session_id } = body as Record<string, unknown>;
          if (typeof store_id !== 'string' || !/^[a-z0-9_]{6,40}$/i.test(store_id)) {
            return jsonCors({ error: 'invalid_store' }, { status: 400 });
          }
          if (typeof event_type !== 'string' || !ALLOWED.has(event_type)) {
            return jsonCors({ error: 'invalid_event' }, { status: 400 });
          }
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

          // Confirm store exists & active before writing (cheap, prevents log spam).
          const { data: store } = await supabaseAdmin
            .from('stores')
            .select('store_id')
            .eq('store_id', store_id)
            .eq('active', true)
            .maybeSingle();
          if (!store) return jsonCors({ ok: true }); // silently accept to avoid leaking existence

          const referrer = request.headers.get('referer') ?? null;
          const ua = request.headers.get('user-agent') ?? null;

          await supabaseAdmin.from('widget_events').insert({
            store_id,
            story_id: typeof story_id === 'string' && story_id.length === 36 ? story_id : null,
            event_type,
            session_id: typeof session_id === 'string' ? session_id.slice(0, 64) : null,
            referrer: referrer ? referrer.slice(0, 500) : null,
            url: referrer ? referrer.slice(0, 500) : null,
            user_agent: ua ? ua.slice(0, 500) : null,
          });

          return jsonCors({ ok: true });
        } catch {
          return jsonCors({ error: 'server_error' }, { status: 500 });
        }
      },
    },
  },
});
