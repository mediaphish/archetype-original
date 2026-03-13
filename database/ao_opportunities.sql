-- AO Automation — Opportunities (first-class objects)
-- Run in Supabase SQL editor WHEN you are ready to turn this on.
--
-- This is intentionally minimal: it supports "one lead → multiple opportunities"
-- without forcing a full re-architecture.

CREATE TABLE IF NOT EXISTS ao_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- lineage
  source_quote_id UUID,
  source_idea_id UUID,

  -- core brief
  title TEXT,
  opportunity_brief TEXT,
  why_it_matters TEXT,
  recommended_next_stage TEXT CHECK (recommended_next_stage IN ('analyst', 'library', 'studio', 'publisher')),

  -- routing
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'held', 'studio', 'publisher', 'archived')),
  held_at TIMESTAMPTZ,
  hold_reason TEXT,

  -- tags (future theme graph friendliness)
  ao_lane TEXT,
  topic_tags TEXT[],

  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_opportunities_created_by_email ON ao_opportunities(created_by_email);
CREATE INDEX IF NOT EXISTS idx_ao_opportunities_status ON ao_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_ao_opportunities_created_at ON ao_opportunities(created_at DESC);

