-- AO Automation — routing between bot stages
-- Run in Supabase SQL editor.

-- Quote review queue routing (Analyst -> Studio/Publisher)
ALTER TABLE ao_quote_review_queue
  ADD COLUMN IF NOT EXISTS next_stage TEXT;

-- Journal topics routing (Analyst -> Studio/Writing/Publisher)
ALTER TABLE ao_journal_topic_queue
  ADD COLUMN IF NOT EXISTS next_stage TEXT;

-- Writing queue routing (Studio -> Publisher)
ALTER TABLE ao_writing_queue
  ADD COLUMN IF NOT EXISTS next_stage TEXT;

