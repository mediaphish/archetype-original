-- AO Automation — “researcher brief” fields + hold metadata
-- Run in Supabase SQL editor.

ALTER TABLE ao_quote_review_queue
ADD COLUMN IF NOT EXISTS content_kind TEXT,
ADD COLUMN IF NOT EXISTS ao_lane TEXT,
ADD COLUMN IF NOT EXISTS topic_tags TEXT[],
ADD COLUMN IF NOT EXISTS held_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hold_reason TEXT;

