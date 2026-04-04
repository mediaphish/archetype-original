-- Fix: "Could not find the 'account_id' column of 'ao_scheduled_posts' in the schema cache"
-- Run once in the Supabase SQL editor if your table predates database/ao_scheduled_posts.sql
-- (which defines account_id). Safe to re-run: IF NOT EXISTS guards the add.

ALTER TABLE ao_scheduled_posts
  ADD COLUMN IF NOT EXISTS account_id TEXT;

-- Backfill: Meta family uses 'meta'; LinkedIn/X use 'personal' (see lib/social/config.js).
UPDATE ao_scheduled_posts
SET account_id = CASE
  WHEN platform IN ('facebook', 'instagram') THEN 'meta'
  ELSE 'personal'
END
WHERE account_id IS NULL;

ALTER TABLE ao_scheduled_posts
  ALTER COLUMN account_id SET DEFAULT 'personal';

ALTER TABLE ao_scheduled_posts
  ALTER COLUMN account_id SET NOT NULL;

COMMENT ON COLUMN ao_scheduled_posts.account_id IS 'Which connected account to post with: meta (FB/IG), personal (LinkedIn/X), etc.';
