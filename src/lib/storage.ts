import { supabase } from '@/integrations/supabase/client';

/**
 * Upload to the private "media" bucket and return a long-lived signed URL.
 * Mantém compatibilidade com o comportamento do Zentor (URLs públicas).
 */
export async function uploadMedia(file: File, userId: string): Promise<{ url: string; path: string }> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from('media').upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;

  // Signed URL valid for 10 years (effectively permanent)
  const { data, error: signedErr } = await supabase.storage
    .from('media')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signedErr) throw signedErr;

  return { url: data.signedUrl, path };
}
