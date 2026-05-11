-- Idempotency for devotional broadcast emails (cron, CI, manual notify).
-- One row per (post_slug, publish_calendar_date) after a successful claim; duplicate inserts are rejected.

CREATE TABLE IF NOT EXISTS journal_devotional_notify_sent (
  post_slug TEXT NOT NULL,
  publish_calendar_date DATE NOT NULL,
  source TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_slug, publish_calendar_date)
);

CREATE INDEX IF NOT EXISTS idx_journal_devotional_notify_sent_sent_at
  ON journal_devotional_notify_sent (sent_at DESC);

COMMENT ON TABLE journal_devotional_notify_sent IS
  'Prevents duplicate devotional mass emails: first sender wins per slug + publish calendar day; release row if zero sends succeeded.';
