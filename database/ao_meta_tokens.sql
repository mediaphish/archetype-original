-- AO Automation — Meta (Facebook + Instagram) connection storage.
-- Stores Page token (for posting) plus helpful IDs for status and publishing.
--
-- Run this in Supabase SQL editor once.

CREATE TABLE IF NOT EXISTS ao_meta_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Page access token used for Facebook Page + Instagram publishing (via linked Page).
  page_access_token TEXT NOT NULL,

  -- Long-lived user token used to fetch/refresh page tokens when needed.
  user_access_token TEXT,
  user_expires_at TIMESTAMPTZ,

  facebook_page_id TEXT,
  facebook_page_name TEXT,

  instagram_business_id TEXT,
  instagram_username TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ao_meta_tokens_updated_at_idx ON ao_meta_tokens(updated_at DESC);

