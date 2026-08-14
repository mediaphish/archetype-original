-- Target auto-publish date for approved journal drafts (#127).
-- Cron api/cron/publish-scheduled-journals.js publishes when this is due.

ALTER TABLE ao_content_drafts
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS ao_content_drafts_scheduled_publish_due_idx
  ON ao_content_drafts (scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL
    AND status = 'approved'
    AND published_at IS NULL
    AND kind = 'journal';
