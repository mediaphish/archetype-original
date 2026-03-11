-- AO Automation — Intelligence layer fields for Review items (external + internal)
-- Run in Supabase SQL editor.

ALTER TABLE ao_quote_review_queue
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS source_name TEXT,
ADD COLUMN IF NOT EXISTS source_title TEXT,
ADD COLUMN IF NOT EXISTS source_author TEXT,
ADD COLUMN IF NOT EXISTS source_published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source_excerpt TEXT,
ADD COLUMN IF NOT EXISTS raw_content TEXT,
ADD COLUMN IF NOT EXISTS best_move TEXT,
ADD COLUMN IF NOT EXISTS objectives_by_channel JSONB,
ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
ADD COLUMN IF NOT EXISTS pull_quote TEXT,
ADD COLUMN IF NOT EXISTS risk_flags TEXT[],
ADD COLUMN IF NOT EXISTS summary_interpretation TEXT,
ADD COLUMN IF NOT EXISTS alt_moves JSONB,
ADD COLUMN IF NOT EXISTS similarity_notes JSONB,
ADD COLUMN IF NOT EXISTS quote_card_template TEXT,
ADD COLUMN IF NOT EXISTS quote_card_svg TEXT,
ADD COLUMN IF NOT EXISTS quote_card_caption TEXT,
ADD COLUMN IF NOT EXISTS auto_discarded BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS discard_reason TEXT;

-- AO Automation — v1.5 intelligence fields for quote review candidates
-- Run in Supabase SQL editor.

ALTER TABLE ao_quote_review_queue
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS source_name TEXT,
ADD COLUMN IF NOT EXISTS source_title TEXT,
ADD COLUMN IF NOT EXISTS source_author TEXT,
ADD COLUMN IF NOT EXISTS source_published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source_excerpt TEXT,
ADD COLUMN IF NOT EXISTS raw_content TEXT,
ADD COLUMN IF NOT EXISTS best_move TEXT,
ADD COLUMN IF NOT EXISTS objectives_by_channel JSONB,
ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
ADD COLUMN IF NOT EXISTS pull_quote TEXT,
ADD COLUMN IF NOT EXISTS risk_flags TEXT[],
ADD COLUMN IF NOT EXISTS summary_interpretation TEXT,
ADD COLUMN IF NOT EXISTS alt_moves JSONB,
ADD COLUMN IF NOT EXISTS similarity_notes JSONB,
ADD COLUMN IF NOT EXISTS quote_card_template TEXT,
ADD COLUMN IF NOT EXISTS quote_card_svg TEXT,
ADD COLUMN IF NOT EXISTS quote_card_caption TEXT,
ADD COLUMN IF NOT EXISTS auto_discarded BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS discard_reason TEXT;

