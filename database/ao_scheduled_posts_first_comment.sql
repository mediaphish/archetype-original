-- First-comment support for ao_scheduled_posts.
-- Run in Supabase SQL editor after ao_scheduled_posts exists.

ALTER TABLE ao_scheduled_posts
  ADD COLUMN IF NOT EXISTS first_comment TEXT,
  ADD COLUMN IF NOT EXISTS first_comment_status TEXT,
  ADD COLUMN IF NOT EXISTS first_comment_error_message TEXT;

COMMENT ON COLUMN ao_scheduled_posts.first_comment IS 'Optional first comment to publish after the main post (platform-dependent).';
COMMENT ON COLUMN ao_scheduled_posts.first_comment_status IS 'Outcome of first comment: pending, posted, failed, skipped, unsupported.';
COMMENT ON COLUMN ao_scheduled_posts.first_comment_error_message IS 'Error message when first_comment_status = failed.';
