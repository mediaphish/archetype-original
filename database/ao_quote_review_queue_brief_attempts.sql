-- AO Automation — brief retry tracking for Analyst opportunities
-- Run in Supabase SQL editor.

ALTER TABLE ao_quote_review_queue
ADD COLUMN IF NOT EXISTS brief_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS brief_last_attempt_at TIMESTAMPTZ;
