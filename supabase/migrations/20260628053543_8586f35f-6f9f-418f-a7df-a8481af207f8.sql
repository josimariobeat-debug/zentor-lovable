
CREATE TABLE public.measure_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.measure_models TO authenticated;
GRANT ALL ON public.measure_models TO service_role;
ALTER TABLE public.measure_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own measure_models" ON public.measure_models FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX measure_models_user_idx ON public.measure_models(user_id);

CREATE TABLE public.measure_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES public.measure_models(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  size_name TEXT NOT NULL,
  measure_type TEXT NOT NULL,
  value_cm NUMERIC(8,2) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.measure_rows TO authenticated;
GRANT ALL ON public.measure_rows TO service_role;
ALTER TABLE public.measure_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own measure_rows" ON public.measure_rows FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX measure_rows_model_idx ON public.measure_rows(model_id);
CREATE INDEX measure_rows_user_idx ON public.measure_rows(user_id);

CREATE TRIGGER trg_measure_models_updated BEFORE UPDATE ON public.measure_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_measure_rows_updated BEFORE UPDATE ON public.measure_rows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
