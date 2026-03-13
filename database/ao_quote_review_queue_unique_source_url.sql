-- AO Automation — prevent duplicate discoveries by exact URL
-- Run in Supabase SQL editor.

-- External items: avoid inserting the same source_url repeatedly.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ao_quote_review_queue_unique_source_url_external
  ON ao_quote_review_queue(source_url)
  WHERE source_url IS NOT NULL AND is_internal = false;

-- Internal items: avoid inserting the same internal source link repeatedly (when present).
CREATE UNIQUE INDEX IF NOT EXISTS idx_ao_quote_review_queue_unique_source_url_internal
  ON ao_quote_review_queue(source_slug_or_url)
  WHERE source_slug_or_url IS NOT NULL AND is_internal = true;

