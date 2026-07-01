-- Guest scheduling preferences (intake form) + timezone on schedule slots.
-- Run in Supabase SQL editor once.

ALTER TABLE ao_podcast_guests
  ADD COLUMN IF NOT EXISTS schedule_preferred_days jsonb,
  ADD COLUMN IF NOT EXISTS schedule_preferred_time text,
  ADD COLUMN IF NOT EXISTS schedule_avoid_dates text,
  ADD COLUMN IF NOT EXISTS schedule_timezone text;

ALTER TABLE ao_podcast_schedule
  ADD COLUMN IF NOT EXISTS timezone text;

COMMENT ON COLUMN ao_podcast_guests.schedule_preferred_days IS 'Guest preferred weekdays from intake (json array of day names).';
COMMENT ON COLUMN ao_podcast_guests.schedule_preferred_time IS 'Guest preferred time of day from intake.';
COMMENT ON COLUMN ao_podcast_guests.schedule_avoid_dates IS 'Guest dates to avoid (freeform text).';
COMMENT ON COLUMN ao_podcast_guests.schedule_timezone IS 'Guest IANA timezone from intake.';
COMMENT ON COLUMN ao_podcast_schedule.timezone IS 'IANA timezone for scheduled_at display and confirmation emails.';
