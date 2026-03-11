-- AO Automation — add fields for per-channel drafts and first-comment suggestions
-- Run in Supabase SQL editor.

ALTER TABLE ao_quote_review_queue
ADD COLUMN IF NOT EXISTS drafts_by_channel JSONB,
ADD COLUMN IF NOT EXISTS hashtags_by_channel JSONB,
ADD COLUMN IF NOT EXISTS first_comment_suggestions JSONB;

