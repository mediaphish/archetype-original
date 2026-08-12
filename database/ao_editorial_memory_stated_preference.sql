-- Auto Phase 2: cross-thread stated preferences (owner-scoped memory).
-- Extends ao_editorial_memory_items with kind = 'stated_preference'.
-- Preference payload lives in body_text + extra JSONB.

ALTER TABLE public.ao_editorial_memory_items
  DROP CONSTRAINT IF EXISTS ao_editorial_memory_items_kind_check;

ALTER TABLE public.ao_editorial_memory_items
  ADD CONSTRAINT ao_editorial_memory_items_kind_check
  CHECK (kind = ANY (ARRAY[
    'corpus_doc'::text,
    'social_post'::text,
    'image_series'::text,
    'series_plan'::text,
    'standing_rule'::text,
    'stated_preference'::text
  ]));

CREATE INDEX IF NOT EXISTS idx_ao_editorial_memory_items_stated_pref
  ON public.ao_editorial_memory_items (created_by_email, published_at DESC)
  WHERE kind = 'stated_preference';
