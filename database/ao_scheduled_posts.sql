-- AO Scheduled Posts: store posts scheduled for LinkedIn, Facebook, Instagram, Twitter.
-- Run this in your Supabase SQL editor to create the table.

CREATE TABLE IF NOT EXISTS ao_scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'twitter')),
  account_id TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  text TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'publishing', 'posted', 'failed')),
  external_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_scheduled_posts_status_scheduled_at
  ON ao_scheduled_posts (status, scheduled_at)
  WHERE status = 'scheduled';

COMMENT ON TABLE ao_scheduled_posts IS 'AO Social: scheduled posts for internal publisher (LinkedIn, Facebook, Instagram, Twitter).';
