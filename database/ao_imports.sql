-- AO Automation — Import inbox tables
-- This supports multi-file uploads (e.g., devotionals) into an inbox batch,
-- and then a controlled "publish" step that commits them into the repo.

CREATE TABLE IF NOT EXISTS ao_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'devotional',
  status TEXT NOT NULL DEFAULT 'uploaded', -- uploaded | published | failed
  created_by_email TEXT,
  notes TEXT,
  publish_commit_sha TEXT,
  publish_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ao_import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES ao_import_batches(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'devotional',
  filename TEXT NOT NULL,
  target_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded', -- uploaded | validated | rejected | published
  frontmatter JSONB,
  validation_errors JSONB,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ao_import_items_batch_id_idx ON ao_import_items(batch_id);

