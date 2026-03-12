-- AO Automation — Scout reporter mode tables
-- Run in Supabase SQL editor.
--
-- Purpose:
-- - Let Scout follow leads over time without trying to do everything in one run.
-- - Persist a frontier (URLs to visit), page extracts, run history, and pending new domains (needs approval).

CREATE TABLE IF NOT EXISTS ao_scout_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  pages_fetched INTEGER NOT NULL DEFAULT 0,
  leads_followed INTEGER NOT NULL DEFAULT 0,
  discoveries_created INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_ao_scout_runs_started_at ON ao_scout_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS ao_scout_frontier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  discovered_from_url TEXT,
  depth INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'skipped')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ao_scout_frontier_url ON ao_scout_frontier(url);
CREATE INDEX IF NOT EXISTS idx_ao_scout_frontier_status_priority ON ao_scout_frontier(status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ao_scout_frontier_created_at ON ao_scout_frontier(created_at DESC);

CREATE TABLE IF NOT EXISTS ao_scout_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  final_url TEXT,
  title TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  excerpt TEXT,
  raw_text TEXT,
  is_paywalled BOOLEAN NOT NULL DEFAULT false,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ao_scout_pages_url ON ao_scout_pages(url);
CREATE INDEX IF NOT EXISTS idx_ao_scout_pages_fetched_at ON ao_scout_pages(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_ao_scout_pages_paywalled ON ao_scout_pages(is_paywalled);

CREATE TABLE IF NOT EXISTS ao_scout_pending_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  example_url TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ao_scout_pending_sources_domain ON ao_scout_pending_sources(domain);
CREATE INDEX IF NOT EXISTS idx_ao_scout_pending_sources_status ON ao_scout_pending_sources(status);

COMMENT ON TABLE ao_scout_runs IS 'AO Scout: run history for reporter-style passes.';
COMMENT ON TABLE ao_scout_frontier IS 'AO Scout: URLs to visit next (frontier) for lead-following scanning.';
COMMENT ON TABLE ao_scout_pages IS 'AO Scout: extracted page text and metadata.';
COMMENT ON TABLE ao_scout_pending_sources IS 'AO Scout: newly discovered domains requiring owner approval before becoming watched sources.';

