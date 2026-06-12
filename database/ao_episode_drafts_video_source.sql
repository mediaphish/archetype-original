-- Add video_source_url for YouTube auto-upload on episode publish.
-- Run in Supabase SQL editor once.

ALTER TABLE ao_episode_drafts
ADD COLUMN IF NOT EXISTS video_source_url TEXT;

COMMENT ON COLUMN ao_episode_drafts.video_source_url IS 'Public HTTPS URL to episode video file for YouTube upload on publish.';
