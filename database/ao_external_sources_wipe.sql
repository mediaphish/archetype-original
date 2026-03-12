-- AO Automation — wipe watched external sources (start over)
-- Run in Supabase SQL editor.

-- IMPORTANT: This keeps your manually-added protected sources.
-- It deletes only AI-added sources.

DELETE FROM ao_external_sources
WHERE COALESCE(is_protected, false) = false;

