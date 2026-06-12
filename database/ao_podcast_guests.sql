-- Podcast guest intake submissions (public guest-intake form).
-- Run in Supabase SQL editor once.

CREATE TABLE IF NOT EXISTS ao_podcast_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  text_ok BOOLEAN NOT NULL DEFAULT FALSE,
  website TEXT,
  company TEXT,
  image_url TEXT,
  social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  bio_md TEXT NOT NULL DEFAULT '',
  question_1 TEXT NOT NULL DEFAULT '',
  question_2 TEXT NOT NULL DEFAULT '',
  question_3 TEXT NOT NULL DEFAULT '',
  question_4 TEXT NOT NULL DEFAULT '',
  question_5 TEXT NOT NULL DEFAULT '',
  release_agreed BOOLEAN NOT NULL DEFAULT FALSE,
  release_agreed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ao_podcast_guests_email ON ao_podcast_guests(email);
CREATE INDEX IF NOT EXISTS idx_ao_podcast_guests_name ON ao_podcast_guests(name);
CREATE INDEX IF NOT EXISTS idx_ao_podcast_guests_submitted_at ON ao_podcast_guests(submitted_at DESC);

COMMENT ON TABLE ao_podcast_guests IS 'Public podcast guest intake form submissions.';
