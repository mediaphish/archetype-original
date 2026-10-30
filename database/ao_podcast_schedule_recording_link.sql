-- 2026-10-30: the Riverside studio link email goes out on its own five days
-- before each booked recording. This marks a slot as sent so it goes once.
ALTER TABLE ao_podcast_schedule ADD COLUMN IF NOT EXISTS recording_link_sent_at timestamptz;
COMMENT ON COLUMN ao_podcast_schedule.recording_link_sent_at IS 'When the studio link email went to the guest (lib/ao/podcastRecordingLinks.js).';
