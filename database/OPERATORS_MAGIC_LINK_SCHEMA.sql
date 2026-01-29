-- Operators Platform Magic Link Authentication Schema
-- Run this SQL in Supabase SQL Editor

-- ============================================
-- MAGIC LINK TOKENS
-- ============================================
CREATE TABLE IF NOT EXISTS operators_magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_operators_magic_link_tokens_email ON operators_magic_link_tokens(email);
CREATE INDEX idx_operators_magic_link_tokens_token ON operators_magic_link_tokens(token);
CREATE INDEX idx_operators_magic_link_tokens_expires ON operators_magic_link_tokens(expires_at);

-- Clean up expired tokens (optional - can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_operators_magic_links()
RETURNS void AS $$
BEGIN
  DELETE FROM operators_magic_link_tokens
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

ALTER TABLE operators_magic_link_tokens ENABLE ROW LEVEL SECURITY;
