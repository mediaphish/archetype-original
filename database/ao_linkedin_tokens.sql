-- AO Automation — Store LinkedIn OAuth tokens (single-owner).
-- Access and refresh tokens stored server-side only; never exposed to client.
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS ao_linkedin_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single row for single-owner; use upsert by id or limit 1.
COMMENT ON TABLE ao_linkedin_tokens IS 'AO Automation: LinkedIn OAuth tokens for single owner. One row.';
