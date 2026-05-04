-- Journal Email Subscriptions Table
-- Stores email addresses of users who want to be notified when new journal posts are published

CREATE TABLE IF NOT EXISTS journal_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_journal_subscriptions_email ON journal_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_journal_subscriptions_active ON journal_subscriptions(is_active) WHERE is_active = TRUE;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_journal_subscriptions_updated_at
  BEFORE UPDATE ON journal_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

