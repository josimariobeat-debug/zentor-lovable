
-- Subscriptions: remove client write policies
DROP POLICY IF EXISTS subscriptions_insert_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_update_own ON public.subscriptions;

-- Payments: remove client insert policy (read-only for users)
DROP POLICY IF EXISTS payments_insert_own ON public.payments;

-- installed_apps: remove client write policies; keep SELECT and DELETE
DROP POLICY IF EXISTS "Users can insert own apps" ON public.installed_apps;
DROP POLICY IF EXISTS "Users can update own apps" ON public.installed_apps;

-- upload_sessions: remove broad anon read; remove from realtime
DROP POLICY IF EXISTS "Anyone can read session by token" ON public.upload_sessions;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.upload_sessions';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- upload_session_files: remove anon insert; writes will go through server function
DROP POLICY IF EXISTS "Anyone can insert files to active sessions" ON public.upload_session_files;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.upload_session_files';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Storage: restrict media SELECT to owner; signed URLs still work via service role
DROP POLICY IF EXISTS "Public can read media" ON storage.objects;
CREATE POLICY "Owners can read own media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Drop anon upload storage policy and the helper function (anon uploads
-- now use signed upload URLs minted by a server function)
DROP POLICY IF EXISTS "Anon can upload media to active upload sessions" ON storage.objects;
DROP FUNCTION IF EXISTS public.has_active_upload_session(uuid);
