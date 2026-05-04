-- Table to track failed email sends for journal/devotional notifications
-- This allows us to retry failed emails later, especially those that failed due to rate limiting (429)

CREATE TABLE IF NOT EXISTS journal_email_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES journal_subscriptions(id),
  email TEXT NOT NULL,
  post_slug TEXT NOT NULL,
  post_type TEXT NOT NULL, -- 'journal-post' or 'devotional'
  post_title TEXT,
  error_type TEXT, -- 'rate_limit_exceeded', 'invalid_email', 'server_error', etc.
  error_message TEXT,
  error_code INTEGER, -- HTTP status code (e.g., 429)
  resend_email_id TEXT, -- Resend email ID if available
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'retried', 'failed', 'sent'
  last_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ -- When the email was successfully sent or marked as failed
);

-- Index for querying pending retries
CREATE INDEX IF NOT EXISTS idx_journal_email_failures_status ON journal_email_failures(status, created_at);
CREATE INDEX IF NOT EXISTS idx_journal_email_failures_email ON journal_email_failures(email);
CREATE INDEX IF NOT EXISTS idx_journal_email_failures_post_slug ON journal_email_failures(post_slug, post_type);

-- Add comment
COMMENT ON TABLE journal_email_failures IS 'Tracks failed email sends for journal/devotional notifications, allowing retry of rate-limited or failed emails';

