ALTER TABLE public.story_media
  ADD COLUMN IF NOT EXISTS product_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  ADD COLUMN IF NOT EXISTS measure_id uuid NULL,
  ADD COLUMN IF NOT EXISTS products_layout text NOT NULL DEFAULT 'lista';