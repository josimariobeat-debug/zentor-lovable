
REVOKE EXECUTE ON FUNCTION public.has_active_upload_session(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_upload_session(uuid) TO service_role;
