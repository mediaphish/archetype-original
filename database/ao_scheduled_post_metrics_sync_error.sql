-- Add sync_error so silent metrics-sync failures become queryable.
ALTER TABLE ao_scheduled_post_metrics
  ADD COLUMN IF NOT EXISTS sync_error TEXT;

COMMENT ON COLUMN ao_scheduled_post_metrics.sync_error IS
  'Last metrics sync failure message/status; null when last sync succeeded.';
