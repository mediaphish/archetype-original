-- Link episode drafts to guest intake records.
-- Run in Supabase SQL editor after ao_podcast_guests.sql.

ALTER TABLE ao_episode_drafts
ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES ao_podcast_guests(id);

COMMENT ON COLUMN ao_episode_drafts.guest_id IS 'Optional link to ao_podcast_guests intake record.';
