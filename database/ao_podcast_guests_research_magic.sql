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

-- Added 2026-07-25 (task #43): Auto-curated subset of suggested_questions actually
-- sent to the guest pre-recording, distinct from Bart's own full internal prep set.
-- Applied directly via the Supabase MCP connection, verified via information_schema
-- read-back — not just a "success" response.
ALTER TABLE ao_podcast_guests
  ADD COLUMN IF NOT EXISTS guest_brief_questions JSONB;

COMMENT ON COLUMN ao_podcast_guests.guest_brief_questions IS
  'Auto-curated subset of suggested_questions actually sent to the guest pre-recording. Smaller and gentler than the full internal suggested_questions set Bart uses to prep.';
