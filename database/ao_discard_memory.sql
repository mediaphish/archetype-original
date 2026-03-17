-- AO Automation — Discard memory (prevents rediscovery after delete)
-- Run in Supabase SQL editor.
--
-- Purpose:
-- - When you Reject/Delete items, we still keep a small record so the same URL/slug
--   won't keep coming back from Scout/external/internal scans.

CREATE TABLE IF NOT EXISTS public.ao_discard_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_email TEXT NOT NULL,
  item_kind TEXT NOT NULL DEFAULT 'quote', -- quote | idea | other
  canonical_url TEXT NULL,
  canonical_slug TEXT NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Require at least one key.
DO $$
BEGIN
  ALTER TABLE public.ao_discard_memory
    ADD CONSTRAINT ao_discard_memory_key_check
      CHECK (canonical_url IS NOT NULL OR canonical_slug IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- External URL uniqueness per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ao_discard_memory_user_url
  ON public.ao_discard_memory(created_by_email, canonical_url)
  WHERE canonical_url IS NOT NULL;

-- Internal slug uniqueness per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ao_discard_memory_user_slug
  ON public.ao_discard_memory(created_by_email, canonical_slug)
  WHERE canonical_slug IS NOT NULL;

