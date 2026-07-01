-- Corpus intelligence fields on episode drafts (Prompt 5).
-- Run in Supabase SQL editor once.

ALTER TABLE ao_episode_drafts
  ADD COLUMN IF NOT EXISTS corpus_connections JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS thematic_threads JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ao_episode_drafts.corpus_connections IS 'Archy-mapped links between transcript moments and AO corpus content.';
COMMENT ON COLUMN ao_episode_drafts.thematic_threads IS 'Broader thematic threads for future content planning.';
