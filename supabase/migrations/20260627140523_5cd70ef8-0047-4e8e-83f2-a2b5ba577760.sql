
-- 1) STORES
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Minha loja',
  theme jsonb NOT NULL DEFAULT '{"mode":"dark","position":"bottom-left","accent":"#111111"}'::jsonb,
  domain text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own store" ON public.stores
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2) WIDGET EVENTS
CREATE TABLE public.widget_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  story_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('impression','open','view','completed','click')),
  session_id text,
  referrer text,
  url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX widget_events_store_created_idx ON public.widget_events (store_id, created_at DESC);
CREATE INDEX widget_events_story_idx ON public.widget_events (story_id);

GRANT SELECT ON public.widget_events TO authenticated;
GRANT ALL ON public.widget_events TO service_role;

ALTER TABLE public.widget_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own widget events" ON public.widget_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.store_id = widget_events.store_id AND s.user_id = auth.uid()
    )
  );

-- 3) STORIES: link to store
ALTER TABLE public.stories ADD COLUMN store_id text;
CREATE INDEX stories_store_id_idx ON public.stories (store_id);

-- 4) Helper to generate store_id
CREATE OR REPLACE FUNCTION public.generate_store_id()
RETURNS text LANGUAGE plpgsql AS $$
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

-- 5) Update handle_new_user to also create a store
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_store_id text;
BEGIN
  INSERT INTO public.profiles (id, name, email, initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 2))
  );
  INSERT INTO public.installed_apps (user_id, app_key, app_id, name, type, description, expires_at)
  VALUES (
    NEW.id, 'stories-videos', 'stories-videos', 'Stories Vídeos', 'SCRIPT EXTERNO',
    'Crie e gerencie stories e vídeos com player flutuante e carrossel na sua loja.',
    now() + interval '30 days'
  );

  new_store_id := public.generate_store_id();
  INSERT INTO public.stores (user_id, store_id, name)
  VALUES (NEW.id, new_store_id, COALESCE(NEW.raw_user_meta_data->>'name','Minha loja'));

  RETURN NEW;
END;
$$;

-- 6) Backfill stores for existing users
INSERT INTO public.stores (user_id, store_id, name)
SELECT u.id, public.generate_store_id(), COALESCE(p.name, 'Minha loja')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.user_id = u.id);

-- 7) Backfill stories.store_id from the user's store
UPDATE public.stories st
SET store_id = s.store_id
FROM public.stores s
WHERE st.user_id = s.user_id AND st.store_id IS NULL;
