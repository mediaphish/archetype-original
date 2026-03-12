-- AO Automation — prevent duplicate watched URLs
-- Run in Supabase SQL editor.

CREATE UNIQUE INDEX IF NOT EXISTS idx_ao_external_sources_url ON ao_external_sources(url);

