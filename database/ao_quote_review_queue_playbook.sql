-- AO Automation — Analyst → Studio playbook
-- Run in Supabase SQL editor.

ALTER TABLE ao_quote_review_queue
  ADD COLUMN IF NOT EXISTS studio_playbook JSONB;

