-- AO Automation — Studio chat sessions (message history per quote item)
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS ao_studio_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ao_studio_sessions_quote_id ON ao_studio_sessions(quote_id);

