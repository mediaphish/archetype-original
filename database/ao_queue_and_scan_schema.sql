-- AO Automation — Queue and scan tables.
-- Run in Supabase SQL editor (archetype-original project).
-- Depends on: ao_magic_link_tokens and ao_scheduled_posts already exist.

-- Quote review queue: candidates from internal/external scan
CREATE TABLE IF NOT EXISTS ao_quote_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_text TEXT NOT NULL,
  author TEXT,
  source_slug_or_url TEXT,
  source_type TEXT,
  is_internal BOOLEAN DEFAULT true,
  alignment_score INTEGER,
  clarity_score INTEGER,
  shareability_score INTEGER,
  brand_fit_score INTEGER,
  depth_score INTEGER,
  composite_score INTEGER,
  classification TEXT,
  caption_suggestions JSONB,
  preview_image_url TEXT,
  suggested_channels TEXT[],
  suggested_schedule JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  duplicate_flag TEXT,
  embedding JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_quote_review_queue_status ON ao_quote_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_ao_quote_review_queue_created ON ao_quote_review_queue(created_at DESC);

-- Journal topic queue
CREATE TABLE IF NOT EXISTS ao_journal_topic_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_title TEXT NOT NULL,
  why_it_matters TEXT,
  corpus_relationship_type TEXT,
  related_ao_passages JSONB,
  suggested_angle TEXT,
  suggested_voice TEXT,
  suggested_length TEXT,
  priority_score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  source_slug_or_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_journal_topic_queue_status ON ao_journal_topic_queue(status);

-- Writing queue: approved journal topics to draft
CREATE TABLE IF NOT EXISTS ao_writing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_topic_id UUID REFERENCES ao_journal_topic_queue(id),
  title TEXT,
  angle TEXT,
  voice TEXT,
  length TEXT,
  source_notes TEXT,
  corpus_refs JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'drafting', 'drafted', 'discarded')),
  scheduled_for DATE,
  draft_content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_writing_queue_status ON ao_writing_queue(status);

-- Duplicate detection: stored hashes of normalized quote text
CREATE TABLE IF NOT EXISTS ao_quote_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_hash TEXT NOT NULL,
  quote_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ao_quote_hashes_hash ON ao_quote_hashes(normalized_hash);

-- External sources (curated list for external scan)
CREATE TABLE IF NOT EXISTS ao_external_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'rss' CHECK (source_type IN ('rss', 'article')),
  name TEXT,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scan log for automation status
CREATE TABLE IF NOT EXISTS ao_scan_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type TEXT NOT NULL CHECK (scan_type IN ('internal', 'external', 'full_corpus')),
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  candidates_found INTEGER DEFAULT 0,
  candidates_inserted INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_ao_scan_log_started ON ao_scan_log(started_at DESC);

COMMENT ON TABLE ao_quote_review_queue IS 'AO Automation: quote candidates from internal/external scan.';
COMMENT ON TABLE ao_journal_topic_queue IS 'AO Automation: journal topic candidates.';
COMMENT ON TABLE ao_writing_queue IS 'AO Automation: approved topics to draft.';
COMMENT ON TABLE ao_quote_hashes IS 'AO Automation: normalized quote hashes for duplicate detection.';
COMMENT ON TABLE ao_external_sources IS 'AO Automation: curated external URLs for scan.';
COMMENT ON TABLE ao_scan_log IS 'AO Automation: scan run history.';
