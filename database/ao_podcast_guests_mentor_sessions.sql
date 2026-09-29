-- Mentor sessions on the podcast guest intake (2026-09-28).
--
-- Bart offered free recorded mentor sessions, published as episodes, and had
-- 8 to 10 people interested inside a day. The intake form was built for a guest
-- with a bio and a book to promote, which is the wrong form for someone
-- bringing a problem they have not solved. The form now branches and the mentor
-- answers land in these columns. See lib/ao/podcastSessionTracks.js.
--
-- Guests keep question_1 through question_5 untouched. Every mentor column is
-- nullable, so existing rows and every downstream reader are unaffected.
--
-- Applied via the Supabase MCP connection and verified by reading back
-- information_schema. This file exists so a fresh database matches production:
-- the columns were live for a day before it was written, which would have
-- broken insertGuestIntake on any new environment.

ALTER TABLE ao_podcast_guests
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'guest',
  ADD COLUMN IF NOT EXISTS mentor_situation TEXT,
  ADD COLUMN IF NOT EXISTS mentor_tried TEXT,
  ADD COLUMN IF NOT EXISTS mentor_honest_answer TEXT,
  ADD COLUMN IF NOT EXISTS mentor_stakes TEXT,
  ADD COLUMN IF NOT EXISTS mentor_role TEXT,
  ADD COLUMN IF NOT EXISTS mentor_org_size TEXT;

-- The same two values lib/ao/podcastSessionTracks.js enforces in code.
ALTER TABLE ao_podcast_guests
  DROP CONSTRAINT IF EXISTS ao_podcast_guests_session_type_check;

ALTER TABLE ao_podcast_guests
  ADD CONSTRAINT ao_podcast_guests_session_type_check
  CHECK (session_type IN ('guest', 'mentor'));

CREATE INDEX IF NOT EXISTS ao_podcast_guests_session_type_idx
  ON ao_podcast_guests (session_type);

-- The first question set had a third question, "what would make this hour worth
-- it to you", which asked people to define success before they had defined the
-- problem. It was replaced the same day by mentor_honest_answer and
-- mentor_stakes, with zero mentor rows and zero answers ever stored in it.
ALTER TABLE ao_podcast_guests
  DROP COLUMN IF EXISTS mentor_outcome;

COMMENT ON COLUMN ao_podcast_guests.session_type IS
  'guest = a guest episode. mentor = a free recorded mentor session published as an episode.';
COMMENT ON COLUMN ao_podcast_guests.mentor_situation IS
  'Mentor track: what they are working through. The one required mentor field.';
COMMENT ON COLUMN ao_podcast_guests.mentor_tried IS
  'Mentor track: what they have already tried, so the session skips ground they have covered.';
COMMENT ON COLUMN ao_podcast_guests.mentor_honest_answer IS
  'Mentor track: what they think the honest answer probably is. Usually the episode.';
COMMENT ON COLUMN ao_podcast_guests.mentor_stakes IS
  'Mentor track: what happens if nothing changes. Separates the presented problem from the real one.';
