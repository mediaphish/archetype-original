-- Producer brief + post-recording capture (Prompt 6).
-- Run in Supabase SQL editor once.

ALTER TABLE ao_podcast_guests
  ADD COLUMN IF NOT EXISTS producer_brief text,
  ADD COLUMN IF NOT EXISTS producer_brief_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS post_recording_surprise text,
  ADD COLUMN IF NOT EXISTS post_recording_follow_up text,
  ADD COLUMN IF NOT EXISTS post_recording_landed text,
  ADD COLUMN IF NOT EXISTS post_recording_captured_at timestamptz;

COMMENT ON COLUMN ao_podcast_guests.producer_brief IS 'AI producer brief for Bart on recording day.';
COMMENT ON COLUMN ao_podcast_guests.post_recording_surprise IS 'Post-recording: what surprised Bart.';
COMMENT ON COLUMN ao_podcast_guests.post_recording_follow_up IS 'Post-recording: what to explore further.';
COMMENT ON COLUMN ao_podcast_guests.post_recording_landed IS 'Post-recording: what landed unexpectedly.';
