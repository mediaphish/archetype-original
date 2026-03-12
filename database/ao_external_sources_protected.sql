-- AO Automation — protect manually-added watched sources
-- Run in Supabase SQL editor.
--
-- Goal:
-- - Manual sources should stay until you delete them.
-- - "Wipe list" should only remove AI-added sources.

ALTER TABLE ao_external_sources
  ADD COLUMN IF NOT EXISTS is_protected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'ai'
    CHECK (origin IN ('manual', 'ai'));

