-- AO Automation — Import inbox: binary items (featured images)
-- Run in Supabase SQL editor AFTER database/ao_imports.sql.

ALTER TABLE ao_import_items
  ADD COLUMN IF NOT EXISTS is_binary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS content_base64 TEXT;

