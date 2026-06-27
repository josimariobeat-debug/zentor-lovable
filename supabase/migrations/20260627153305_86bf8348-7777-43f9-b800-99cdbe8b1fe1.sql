
CREATE TABLE public.appearance_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('floating','carousel')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appearance_presets TO authenticated;
GRANT ALL ON public.appearance_presets TO service_role;

ALTER TABLE public.appearance_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own appearance presets"
  ON public.appearance_presets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_appearance_presets_updated
  BEFORE UPDATE ON public.appearance_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_appearance_presets_user_kind
  ON public.appearance_presets (user_id, kind, created_at DESC);

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS appearance_preset_id uuid REFERENCES public.appearance_presets(id) ON DELETE SET NULL;
