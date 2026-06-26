import { createServerFn } from '@tanstack/react-start';

const TEN_YEARS_SECONDS = 60 * 60 * 24 * 365 * 10;

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Public lookup by token. Returns minimal session info needed by the
 * mobile upload page. Does not expose the token of other sessions.
 */
export const getUploadSessionByToken = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string }) => {
    if (!data?.token || typeof data.token !== 'string' || data.token.length > 128) {
      throw new Error('invalid token');
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: row } = await supabaseAdmin
      .from('upload_sessions')
      .select('id, user_id, status, expires_at')
      .eq('token', data.token)
      .maybeSingle();
    if (!row) return { status: 'error' as const };
    if (new Date(row.expires_at) < new Date()) return { status: 'expired' as const };
    if (row.status === 'closed') return { status: 'closed' as const };
    if (row.status !== 'active') return { status: 'error' as const };
    return {
      status: 'active' as const,
      session: { id: row.id, user_id: row.user_id, expires_at: row.expires_at },
    };
  });

/**
 * Mint a signed upload URL for the media bucket, scoped to the session owner's folder.
 * Mobile uploaders use this instead of having anon storage INSERT privileges.
 */
export const createSessionUploadUrl = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; fileName: string }) => {
    if (!data?.token || typeof data.token !== 'string') throw new Error('invalid token');
    if (!data?.fileName || typeof data.fileName !== 'string' || data.fileName.length > 256) {
      throw new Error('invalid fileName');
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: session } = await supabaseAdmin
      .from('upload_sessions')
      .select('id, user_id, status, expires_at')
      .eq('token', data.token)
      .maybeSingle();
    if (
      !session ||
      session.status !== 'active' ||
      new Date(session.expires_at) < new Date()
    ) {
      throw new Error('Session not active');
    }
    const ext = (data.fileName.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '');
    const path = `${session.user_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from('media')
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error('Could not create signed upload url');
    return { path: signed.path, token: signed.token };
  });

/**
 * Register an uploaded file against a session, then return a long-lived
 * signed read URL. Validates the token server-side.
 */
export const registerSessionUpload = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string;
      path: string;
      fileName: string;
      mimeType: string;
      size: number;
    }) => {
      if (!data?.token || !data?.path || !data?.fileName) throw new Error('invalid input');
      if (typeof data.size !== 'number' || data.size < 0) throw new Error('invalid size');
      return data;
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: session } = await supabaseAdmin
      .from('upload_sessions')
      .select('id, user_id, status, expires_at')
      .eq('token', data.token)
      .maybeSingle();
    if (
      !session ||
      session.status !== 'active' ||
      new Date(session.expires_at) < new Date()
    ) {
      throw new Error('Session not active');
    }
    // Ensure path is inside the session owner's folder
    if (!data.path.startsWith(`${session.user_id}/`)) {
      throw new Error('path not allowed');
    }

    const { data: signedRead } = await supabaseAdmin.storage
      .from('media')
      .createSignedUrl(data.path, TEN_YEARS_SECONDS);
    const fileUrl = signedRead?.signedUrl ?? '';

    const { data: inserted, error } = await supabaseAdmin
      .from('upload_session_files')
      .insert({
        session_id: session.id,
        file_url: fileUrl,
        file_name: data.fileName,
        mime_type: data.mimeType,
        size: data.size,
      })
      .select('id, file_url, file_name, mime_type, size, created_at, session_id')
      .single();
    if (error) throw error;
    return inserted;
  });

/**
 * Authenticated owner polls for files attached to one of their sessions.
 * Avoids needing realtime on upload_session_files.
 */
export const listSessionFiles = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string }) => {
    if (!data?.sessionId || !isUuid(data.sessionId)) throw new Error('invalid sessionId');
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: rows } = await supabaseAdmin
      .from('upload_session_files')
      .select('id, file_url, file_name, mime_type, size, created_at, session_id')
      .eq('session_id', data.sessionId)
      .order('created_at', { ascending: true });
    return rows ?? [];
  });

/**
 * Public poll for session status (used by mobile uploader to detect closure).
 */
export const getSessionStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string }) => {
    if (!data?.token) throw new Error('invalid token');
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: row } = await supabaseAdmin
      .from('upload_sessions')
      .select('status, expires_at')
      .eq('token', data.token)
      .maybeSingle();
    if (!row) return { status: 'error' as const };
    if (new Date(row.expires_at) < new Date()) return { status: 'expired' as const };
    if (row.status === 'closed') return { status: 'closed' as const };
    if (row.status === 'active') return { status: 'active' as const };
    return { status: 'error' as const };
  });
