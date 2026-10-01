-- Archiving finished podcast guests (2026-10-01).
--
-- Bart: "I need a way to archive podcast guests after their episode is
-- complete. Erik and Adam Theis are done. I have no way to remove them from
-- the list." Their episode shipped in August and they were still sitting in
-- the working directory in October.
--
-- Archived, not deleted. A guest's research brief, producer brief and intake
-- answers are per person and should survive forever, so a guest who comes back
-- still has them. Clearing archived_at puts them straight back on the list.
--
-- Applied via the Supabase MCP connection and verified by reading back
-- information_schema. This file exists so a fresh database matches production.

ALTER TABLE ao_podcast_guests
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Every list load filters on this, so the partial index is the one that matters.
CREATE INDEX IF NOT EXISTS ao_podcast_guests_archived_at_idx
  ON ao_podcast_guests (archived_at) WHERE archived_at IS NULL;

COMMENT ON COLUMN ao_podcast_guests.archived_at IS
  'Set when the episode is done and the guest should drop off the working list. Null means active. Reversible: clearing it restores them.';
