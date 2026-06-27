
CREATE OR REPLACE FUNCTION public.generate_store_id()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  candidate text;
  exists_count int;
BEGIN
  LOOP
    candidate := 'zt_' || lower(substring(replace(gen_random_uuid()::text,'-','') from 1 for 10));
    SELECT count(*) INTO exists_count FROM public.stores WHERE store_id = candidate;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN candidate;
END;
$$;
