-- 2026-10-30: the Riverside studio link email goes out on its own five days
-- before each booked recording. This marks a slot as sent so it goes once.
ALTER TABLE ao_podcast_schedule ADD COLUMN IF NOT EXISTS recording_link_sent_at timestamptz;
COMMENT ON COLUMN ao_podcast_schedule.recording_link_sent_at IS 'When the studio link email went to the guest (lib/ao/podcastRecordingLinks.js).';

-- Same day: notices to Bart, each once per recording.
ALTER TABLE ao_podcast_schedule ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
ALTER TABLE ao_podcast_schedule ADD COLUMN IF NOT EXISTS followup_sent_at timestamptz;
ALTER TABLE ao_podcast_schedule ADD COLUMN IF NOT EXISTS nudge_sent_at timestamptz;
