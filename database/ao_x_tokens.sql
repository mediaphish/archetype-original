-- AO Automation — X (Twitter) connection storage.
-- Stores OAuth 2.0 user tokens (Authorization Code Flow with PKCE) so the site
-- can post as @archetypeog without manual token copying.
--
-- Run this in Supabase SQL editor once.

CREATE TABLE IF NOT EXISTS ao_x_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  token_type TEXT,

  user_id TEXT,
  username TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ao_x_tokens_updated_at_idx ON ao_x_tokens(updated_at DESC);

