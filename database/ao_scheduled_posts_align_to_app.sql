-- Align ao_scheduled_posts with the app (Vite + Publisher + Auto Hub).
-- Run once in the Supabase SQL editor if inserts fail with "schema cache" / missing column
-- (e.g. platform, text, scheduled_at). Idempotent: safe to re-run.
--
-- Prefer this over piecemeal migrations when the table was created manually or is incomplete.

ALTER TABLE ao_scheduled_posts
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS account_id TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS text TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_comment TEXT,
  ADD COLUMN IF NOT EXISTS first_comment_status TEXT,
  ADD COLUMN IF NOT EXISTS first_comment_error_message TEXT,
  ADD COLUMN IF NOT EXISTS source_kind TEXT,
  ADD COLUMN IF NOT EXISTS source_quote_id UUID,
  ADD COLUMN IF NOT EXISTS source_idea_id UUID,
  ADD COLUMN IF NOT EXISTS intent JSONB,
  ADD COLUMN IF NOT EXISTS best_move TEXT,
  ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
  ADD COLUMN IF NOT EXISTS ao_lane TEXT,
  ADD COLUMN IF NOT EXISTS topic_tags TEXT[],
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS feedback_rating TEXT,
  ADD COLUMN IF NOT EXISTS feedback_notes TEXT,
  ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

-- Legacy rows: fill required fields so NOT NULL can apply.
UPDATE ao_scheduled_posts SET platform = 'linkedin' WHERE platform IS NULL;
UPDATE ao_scheduled_posts
  SET account_id = CASE
    WHEN platform IN ('facebook', 'instagram') THEN 'meta'
    ELSE 'personal'
  END
  WHERE account_id IS NULL;
UPDATE ao_scheduled_posts SET scheduled_at = now() WHERE scheduled_at IS NULL;
UPDATE ao_scheduled_posts SET text = '[legacy row — fix or delete in Supabase]' WHERE text IS NULL;
UPDATE ao_scheduled_posts SET status = 'scheduled' WHERE status IS NULL;
UPDATE ao_scheduled_posts SET created_at = now() WHERE created_at IS NULL;
UPDATE ao_scheduled_posts SET updated_at = now() WHERE updated_at IS NULL;

UPDATE ao_scheduled_posts
SET platform = 'linkedin'
WHERE platform IS NOT NULL
  AND platform NOT IN ('linkedin', 'facebook', 'instagram', 'twitter');

UPDATE ao_scheduled_posts
SET status = 'scheduled'
WHERE status IS NOT NULL
  AND status NOT IN ('scheduled', 'publishing', 'posted', 'failed');

ALTER TABLE ao_scheduled_posts ALTER COLUMN platform SET DEFAULT 'linkedin';
ALTER TABLE ao_scheduled_posts ALTER COLUMN account_id SET DEFAULT 'personal';
ALTER TABLE ao_scheduled_posts ALTER COLUMN status SET DEFAULT 'scheduled';
ALTER TABLE ao_scheduled_posts ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE ao_scheduled_posts ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE ao_scheduled_posts ALTER COLUMN platform SET NOT NULL;
ALTER TABLE ao_scheduled_posts ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE ao_scheduled_posts ALTER COLUMN scheduled_at SET NOT NULL;
ALTER TABLE ao_scheduled_posts ALTER COLUMN text SET NOT NULL;
ALTER TABLE ao_scheduled_posts ALTER COLUMN status SET NOT NULL;
ALTER TABLE ao_scheduled_posts ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE ao_scheduled_posts ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE ao_scheduled_posts DROP CONSTRAINT IF EXISTS ao_scheduled_posts_platform_check;
ALTER TABLE ao_scheduled_posts ADD CONSTRAINT ao_scheduled_posts_platform_check
  CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'twitter'));

ALTER TABLE ao_scheduled_posts DROP CONSTRAINT IF EXISTS ao_scheduled_posts_status_check;
ALTER TABLE ao_scheduled_posts ADD CONSTRAINT ao_scheduled_posts_status_check
  CHECK (status IN ('scheduled', 'publishing', 'posted', 'failed'));

CREATE INDEX IF NOT EXISTS idx_ao_scheduled_posts_status_scheduled_at
  ON ao_scheduled_posts (status, scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_ao_scheduled_posts_source_quote_id ON ao_scheduled_posts(source_quote_id);
CREATE INDEX IF NOT EXISTS idx_ao_scheduled_posts_source_idea_id ON ao_scheduled_posts(source_idea_id);

COMMENT ON TABLE ao_scheduled_posts IS 'AO Social: scheduled posts for internal publisher (LinkedIn, Facebook, Instagram, Twitter).';
