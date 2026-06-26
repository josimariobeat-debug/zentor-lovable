
-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  initials TEXT,
  has_seen_onboarding BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

-- =========================================
-- INSTALLED APPS
-- =========================================
CREATE TABLE public.installed_apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_key TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  app_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'SCRIPT EXTERNO',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ativa',
  is_installed BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, app_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installed_apps TO authenticated;
GRANT ALL ON public.installed_apps TO service_role;
CREATE INDEX idx_installed_apps_user_id ON public.installed_apps(user_id);
CREATE INDEX idx_installed_apps_app_id ON public.installed_apps(app_id);
CREATE INDEX idx_installed_apps_is_installed ON public.installed_apps(is_installed);
ALTER TABLE public.installed_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own apps" ON public.installed_apps FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own apps" ON public.installed_apps FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own apps" ON public.installed_apps FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own apps" ON public.installed_apps FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- =========================================
-- STORIES
-- =========================================
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id UUID REFERENCES public.installed_apps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'widget',
  scroll TEXT NOT NULL DEFAULT 'vertical',
  aparencia TEXT NOT NULL DEFAULT 'padrao-1',
  active BOOLEAN NOT NULL DEFAULT true,
  cta TEXT,
  urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail_url TEXT,
  cover_url TEXT,
  cover_type TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
CREATE INDEX idx_stories_user_id ON public.stories(user_id);
CREATE INDEX idx_stories_app_id ON public.stories(app_id);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own stories" ON public.stories FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own stories" ON public.stories FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own stories" ON public.stories FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own stories" ON public.stories FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- =========================================
-- STORY MEDIA
-- =========================================
CREATE TABLE public.story_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'image')),
  name TEXT,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_media TO authenticated;
GRANT ALL ON public.story_media TO service_role;
CREATE INDEX idx_story_media_story_id ON public.story_media(story_id);
CREATE INDEX idx_story_media_user_id ON public.story_media(user_id);
ALTER TABLE public.story_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own media" ON public.story_media FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own media" ON public.story_media FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own media" ON public.story_media FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own media" ON public.story_media FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- =========================================
-- MEDIA GALLERY
-- =========================================
CREATE TABLE public.media_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_gallery TO authenticated;
GRANT ALL ON public.media_gallery TO service_role;
CREATE INDEX media_gallery_user_id_idx ON public.media_gallery(user_id);
CREATE INDEX media_gallery_created_at_idx ON public.media_gallery(created_at DESC);
ALTER TABLE public.media_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own media" ON public.media_gallery FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own media" ON public.media_gallery FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own media" ON public.media_gallery FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- =========================================
-- UPLOAD SESSIONS (QR code mobile upload)
-- =========================================
CREATE TABLE public.upload_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'closed')),
  expires_at TIMESTAMPTZ NOT NULL,
  app_id UUID REFERENCES public.installed_apps(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upload_sessions TO authenticated;
GRANT SELECT ON public.upload_sessions TO anon;
GRANT ALL ON public.upload_sessions TO service_role;
CREATE INDEX idx_upload_sessions_token ON public.upload_sessions(token);
CREATE INDEX idx_upload_sessions_user_id ON public.upload_sessions(user_id);
CREATE INDEX idx_upload_sessions_status ON public.upload_sessions(status);
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON public.upload_sessions FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can create sessions" ON public.upload_sessions FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own sessions" ON public.upload_sessions FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Anyone can read session by token" ON public.upload_sessions FOR SELECT TO anon USING (status = 'active' AND expires_at > now());

CREATE TABLE public.upload_session_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.upload_sessions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.upload_session_files TO authenticated, anon;
GRANT ALL ON public.upload_session_files TO service_role;
CREATE INDEX idx_upload_session_files_session_id ON public.upload_session_files(session_id);
ALTER TABLE public.upload_session_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view files from own sessions" ON public.upload_session_files FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.upload_sessions s WHERE s.id = session_id AND s.user_id = (select auth.uid())));
CREATE POLICY "Anyone can insert files to active sessions" ON public.upload_session_files FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.upload_sessions s WHERE s.id = session_id AND s.status = 'active' AND s.expires_at > now()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.upload_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.upload_session_files;

-- =========================================
-- SUBSCRIPTIONS
-- =========================================
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'mensal',
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'expired', 'cancelled')),
  price DECIMAL(10, 2) NOT NULL DEFAULT 29.90,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON public.subscriptions(expires_at);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "subscriptions_insert_own" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "subscriptions_update_own" ON public.subscriptions FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- =========================================
-- PAYMENTS
-- =========================================
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_method TEXT DEFAULT 'simulated',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_subscription_id ON public.payments(subscription_id);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_select_own" ON public.payments FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "payments_insert_own" ON public.payments FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- =========================================
-- FUNCTIONS & TRIGGERS
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    NEW.id,
    'stories-videos',
    'stories-videos',
    'Stories Vídeos',
    'SCRIPT EXTERNO',
    'Crie e gerencie stories e vídeos com player flutuante e carrossel na sua loja.',
    now() + interval '30 days'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
