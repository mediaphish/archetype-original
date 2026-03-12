-- AO Automation — Brain Trust registry (people we follow)
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS ao_brain_trust_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  profile_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_brain_trust_sources_active ON ao_brain_trust_sources(active);
CREATE INDEX IF NOT EXISTS idx_ao_brain_trust_sources_created_at ON ao_brain_trust_sources(created_at DESC);

COMMENT ON TABLE ao_brain_trust_sources IS 'AO Automation: identifiable people we follow for leadership signal.';

