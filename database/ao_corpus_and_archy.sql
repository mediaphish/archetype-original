-- Corpus drafts (Auto CORPUS mode) + Archy paid thread memory + optional entitlements.
-- Run in Supabase SQL editor when deploying these features.

CREATE TABLE IF NOT EXISTS ao_corpus_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_email TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'published')),
  tldr_markdown TEXT,
  outline_markdown TEXT,
  full_markdown TEXT,
  target_path TEXT,
  tags TEXT[] DEFAULT '{}',
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ao_corpus_drafts_email ON ao_corpus_drafts(created_by_email);
CREATE INDEX IF NOT EXISTS idx_ao_corpus_drafts_status ON ao_corpus_drafts(status);

CREATE TABLE IF NOT EXISTS ao_archy_thread_memory (
  session_id TEXT PRIMARY KEY,
  thread_summary TEXT NOT NULL DEFAULT '',
  last_user_excerpt TEXT,
  message_count INT NOT NULL DEFAULT 0,
  scheduling_quota_used INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: map visitor session to paid tier without env-only session lists (future billing).
CREATE TABLE IF NOT EXISTS archy_chat_entitlements (
  session_id TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ao_corpus_drafts IS 'Auto CORPUS: TL;DR / outlines / publish queue.';
COMMENT ON TABLE ao_archy_thread_memory IS 'Archy paid: rolling thread summary + light scheduling quota.';
COMMENT ON TABLE archy_chat_entitlements IS 'Optional DB-backed Archy tier; env ARCHY_PAID_SESSION_IDS still supported.';
