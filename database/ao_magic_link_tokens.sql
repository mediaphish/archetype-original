-- AO Automation Dashboard: magic link tokens (single-owner auth).
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS ao_magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_magic_link_tokens_token_email
  ON ao_magic_link_tokens (token, email)
  WHERE used = false;

COMMENT ON TABLE ao_magic_link_tokens IS 'AO Automation Dashboard: magic link tokens for single-owner login.';
