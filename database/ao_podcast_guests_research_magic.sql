-- Podcast guest show page: research, questions, magic link fields.
-- Run in Supabase SQL editor once after ao_podcast_guests.sql.

ALTER TABLE ao_podcast_guests
  ADD COLUMN IF NOT EXISTS research_brief TEXT,
  ADD COLUMN IF NOT EXISTS research_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suggested_questions JSONB,
  ADD COLUMN IF NOT EXISTS questions_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS magic_link_token TEXT,
  ADD COLUMN IF NOT EXISTS magic_link_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN ao_podcast_guests.research_brief IS 'AI-generated guest research brief for Bart prep.';
COMMENT ON COLUMN ao_podcast_guests.suggested_questions IS 'AI-generated interview questions JSON (person_specific + ao_theology).';
