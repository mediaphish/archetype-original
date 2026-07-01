-- Manual podcast recording schedule (Calendly integration comes later).
-- Run in Supabase SQL editor once.

CREATE TABLE IF NOT EXISTS ao_podcast_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES ao_podcast_guests(id) ON DELETE SET NULL,
  episode_title TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ao_podcast_schedule_scheduled_at ON ao_podcast_schedule(scheduled_at ASC);

COMMENT ON TABLE ao_podcast_schedule IS 'Manual upcoming podcast recording slots for AO dashboard.';
