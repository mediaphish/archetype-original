-- One-time tokens: Bart explicitly approves pushing a specific journal path as status:published
-- (used by POST /api/ao/corpus/publish with live_on_site + publish_approval_token).

CREATE TABLE IF NOT EXISTS ao_journal_publish_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  created_by_email TEXT NOT NULL,
  target_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS ao_journal_publish_approvals_token_active_idx
  ON ao_journal_publish_approvals (token)
  WHERE consumed_at IS NULL;

COMMENT ON TABLE ao_journal_publish_approvals IS 'Single-use approval to commit a journal .md as status:published via corpus publish API.';
