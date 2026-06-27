
CREATE OR REPLACE FUNCTION public.set_story_store_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.store_id IS NULL THEN
    SELECT s.store_id INTO NEW.store_id FROM public.stores s WHERE s.user_id = NEW.user_id LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stories_set_store_id ON public.stories;
CREATE TRIGGER stories_set_store_id
  BEFORE INSERT ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.set_story_store_id();
