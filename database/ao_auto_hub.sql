-- AO Automation — Auto hub memory + sync
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS ao_auto_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_email TEXT NOT NULL,
  title TEXT,
  current_mode TEXT NOT NULL DEFAULT 'plan'
    CHECK (current_mode IN ('plan', 'write', 'package', 'publish', 'recall', 'training', 'general')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ao_auto_threads_owner ON ao_auto_threads(created_by_email, updated_at DESC);

CREATE TABLE IF NOT EXISTS ao_auto_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES ao_auto_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'receipt')),
  mode TEXT CHECK (mode IN ('plan', 'write', 'package', 'publish', 'recall', 'training', 'general')),
  content TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_auto_messages_thread ON ao_auto_messages(thread_id, created_at ASC);

CREATE TABLE IF NOT EXISTS ao_auto_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES ao_auto_threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES ao_auto_messages(id) ON DELETE SET NULL,
  label TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'text')),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  extracted_text TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  public_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_auto_attachments_thread ON ao_auto_attachments(thread_id, created_at ASC);

CREATE TABLE IF NOT EXISTS ao_auto_guardrails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_email TEXT NOT NULL,
  title TEXT,
  rule_text TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global')),
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_auto_guardrails_owner ON ao_auto_guardrails(created_by_email, updated_at DESC);

CREATE TABLE IF NOT EXISTS ao_auto_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_email TEXT NOT NULL,
  thread_id UUID REFERENCES ao_auto_threads(id) ON DELETE SET NULL,
  source_idea_id UUID REFERENCES ao_ideas(id) ON DELETE SET NULL,
  title TEXT,
  summary TEXT,
  original_input TEXT,
  original_input_frozen BOOLEAN NOT NULL DEFAULT true,
  journal_markdown TEXT,
  channel_drafts JSONB,
  pull_quote_companions JSONB,
  schedule_suggestion JSONB,
  attachment_refs JSONB,
  rating TEXT CHECK (rating IN ('good', 'meh', 'bad')),
  rating_reason TEXT,
  bundle_dna JSONB,
  series_name TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ao_auto_bundles_owner ON ao_auto_bundles(created_by_email, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ao_auto_bundles_series ON ao_auto_bundles(created_by_email, series_name);

CREATE TABLE IF NOT EXISTS ao_auto_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_email TEXT NOT NULL,
  thread_id UUID REFERENCES ao_auto_threads(id) ON DELETE SET NULL,
  bundle_id UUID REFERENCES ao_auto_bundles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  payload JSONB,
  undo_payload JSONB,
  undone_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_auto_action_log_owner ON ao_auto_action_log(created_by_email, created_at DESC);
