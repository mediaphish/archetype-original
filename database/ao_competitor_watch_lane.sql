-- AO Automation — competitor watch lane (tagging + digest runs)
-- Run in Supabase SQL editor.
--
-- What this enables:
-- - Tag watched URLs + followed people as: none | friendly | competitor
-- - Store a simple daily digest run log (so Scout can show “last ran” + coverage)

-- Tagging on watched URLs.
ALTER TABLE public.ao_external_sources
  ADD COLUMN IF NOT EXISTS competitor_tier TEXT NOT NULL DEFAULT 'none'
    CHECK (competitor_tier IN ('none', 'friendly', 'competitor'));

CREATE INDEX IF NOT EXISTS idx_ao_external_sources_competitor_tier
  ON public.ao_external_sources(competitor_tier);

-- Tagging on followed people.
ALTER TABLE public.ao_brain_trust_sources
  ADD COLUMN IF NOT EXISTS competitor_tier TEXT NOT NULL DEFAULT 'none'
    CHECK (competitor_tier IN ('none', 'friendly', 'competitor'));

CREATE INDEX IF NOT EXISTS idx_ao_brain_trust_sources_competitor_tier
  ON public.ao_brain_trust_sources(competitor_tier);

-- Digest run log (per owner email).
CREATE TABLE IF NOT EXISTS public.ao_competitor_digest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_email TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ NULL,
  sources_count INTEGER NOT NULL DEFAULT 0,
  people_count INTEGER NOT NULL DEFAULT 0,
  attempted_platforms JSONB NULL,
  reachable_platforms JSONB NULL,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_ao_competitor_digest_runs_owner_started
  ON public.ao_competitor_digest_runs(created_by_email, started_at DESC);

