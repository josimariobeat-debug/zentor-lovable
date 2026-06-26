
GRANT EXECUTE ON FUNCTION public.has_active_upload_session(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.has_active_upload_session(uuid) IS
'Boolean existence check used by storage.objects RLS to allow anon uploads only when a valid upload session exists. Returns no row data; safe to expose to anon/authenticated.';
