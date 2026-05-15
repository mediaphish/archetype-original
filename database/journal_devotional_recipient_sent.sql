-- Per-recipient dedupe for devotional broadcast emails.
-- Prevents the same subscriber from receiving the same devotional (slug + publish day) more than once,
-- even if a full broadcast is retried or the broadcast-level lock was released incorrectly.

CREATE TABLE IF NOT EXISTS journal_devotional_recipient_sent (
  post_slug TEXT NOT NULL,
  publish_calendar_date DATE NOT NULL,
  email TEXT NOT NULL,
  source TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_slug, publish_calendar_date, email)
);

CREATE INDEX IF NOT EXISTS idx_journal_devotional_recipient_sent_email
  ON journal_devotional_recipient_sent (email);

COMMENT ON TABLE journal_devotional_recipient_sent IS
  'One row per subscriber per devotional slug + publish calendar day after a successful send.';
