-- Append-only style audit trail for actions that can change what appears on the public site
-- (Git pushes from AO Import / Corpus publish, knowledge rebuild summaries, etc.).
-- Run once in Supabase SQL editor against the project that backs AO Auto.

CREATE TABLE IF NOT EXISTS ao_publication_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'success',
  actor_email TEXT,
  resource_paths TEXT[],
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  vercel_id TEXT,
  github_commit_sha TEXT
);

CREATE INDEX IF NOT EXISTS ao_publication_audit_created_at_idx ON ao_publication_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS ao_publication_audit_source_idx ON ao_publication_audit (source);
CREATE INDEX IF NOT EXISTS ao_publication_audit_actor_idx ON ao_publication_audit (actor_email);

COMMENT ON TABLE ao_publication_audit IS 'Who did what that could affect the live site (imports, corpus publish, knowledge builds).';
