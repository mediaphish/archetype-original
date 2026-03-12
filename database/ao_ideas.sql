-- AO Automation — Ideas inbox
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS ao_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  raw_input TEXT NOT NULL,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'brief_ready', 'held', 'archived')),

  -- Suggested classification (editable later in UI)
  suggested_content_kind TEXT,
  suggested_ao_lane TEXT,
  suggested_topic_tags TEXT[],

  -- Brief output
  why_it_matters TEXT,
  angles JSONB,
  risks JSONB,
  recommended_next_step TEXT,

  -- Hold metadata
  held_at TIMESTAMPTZ,
  hold_reason TEXT,

  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_ideas_status ON ao_ideas(status);
CREATE INDEX IF NOT EXISTS idx_ao_ideas_created_at ON ao_ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ao_ideas_created_by_email ON ao_ideas(created_by_email);

COMMENT ON TABLE ao_ideas IS 'AO Automation: capture and develop your own content ideas.';

