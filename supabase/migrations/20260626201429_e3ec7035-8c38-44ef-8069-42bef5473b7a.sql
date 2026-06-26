
CREATE OR REPLACE FUNCTION public.has_active_upload_session(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.upload_sessions
    WHERE user_id = _user_id
      AND status = 'active'
      AND expires_at > now()
  )
$$;

DROP POLICY IF EXISTS "Anon can upload media to upload sessions" ON storage.objects;

CREATE POLICY "Anon can upload media to active upload sessions"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.has_active_upload_session(((storage.foldername(name))[1])::uuid)
);
