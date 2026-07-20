-- Link each podcast guest to their Auto episode-build conversation.
-- Run in Supabase SQL editor (already applied for 5-I).

ALTER TABLE ao_podcast_guests
ADD COLUMN IF NOT EXISTS episode_thread_id uuid DEFAULT NULL;

COMMENT ON COLUMN ao_podcast_guests.episode_thread_id IS
  'Auto thread id for this guest episode build; resume on later Build episode clicks.';
