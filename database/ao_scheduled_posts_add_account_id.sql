-- Fix: missing account_id only (narrow case).
-- If other columns are missing too (e.g. platform), use database/ao_scheduled_posts_align_to_app.sql instead.
-- Run once in the Supabase SQL editor. Safe to re-run: IF NOT EXISTS guards the add.

ALTER TABLE ao_scheduled_posts
  ADD COLUMN IF NOT EXISTS account_id TEXT;

-- Backfill without assuming every install has the same columns. Some older tables have no
-- `platform` column; in that case default every row to 'personal' (LinkedIn/X style).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ao_scheduled_posts'
      AND column_name = 'platform'
  ) THEN
    UPDATE ao_scheduled_posts
    SET account_id = CASE
      WHEN platform IN ('facebook', 'instagram') THEN 'meta'
      ELSE 'personal'
    END
    WHERE account_id IS NULL;
  ELSE
    UPDATE ao_scheduled_posts
    SET account_id = 'personal'
    WHERE account_id IS NULL;
  END IF;
END $$;

ALTER TABLE ao_scheduled_posts
  ALTER COLUMN account_id SET DEFAULT 'personal';

ALTER TABLE ao_scheduled_posts
  ALTER COLUMN account_id SET NOT NULL;

COMMENT ON COLUMN ao_scheduled_posts.account_id IS 'Which connected account to post with: meta (FB/IG), personal (LinkedIn/X), etc.';
