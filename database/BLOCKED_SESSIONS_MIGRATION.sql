-- Migration: Add expiration columns for temporary blocks
-- Run this AFTER the initial schema if tables already exist

-- Add expires_at to blocked_sessions
ALTER TABLE blocked_sessions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add expires_at to blocked_ips
ALTER TABLE blocked_ips 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add block_type and assessment to threats table
ALTER TABLE threats 
ADD COLUMN IF NOT EXISTS block_type TEXT,
ADD COLUMN IF NOT EXISTS assessment TEXT;

-- Clean up expired blocks (optional - can run periodically)
DELETE FROM blocked_sessions 
WHERE expires_at IS NOT NULL AND expires_at < NOW();

DELETE FROM blocked_ips 
WHERE expires_at IS NOT NULL AND expires_at < NOW();

