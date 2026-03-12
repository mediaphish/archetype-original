-- AO Automation — Scout trail fields on Analyst items
-- Run in Supabase SQL editor.
--
-- These fields let Analyst show where Scout started, what it followed, and what run produced the item.

ALTER TABLE ao_quote_review_queue
  ADD COLUMN IF NOT EXISTS scout_run_id TEXT,
  ADD COLUMN IF NOT EXISTS scout_depth INTEGER,
  ADD COLUMN IF NOT EXISTS scout_discovered_from_url TEXT,
  ADD COLUMN IF NOT EXISTS scout_watched_source_id UUID,
  ADD COLUMN IF NOT EXISTS scout_watched_source_url TEXT;

