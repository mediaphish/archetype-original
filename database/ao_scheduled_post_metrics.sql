-- Per-post engagement metrics (joins ao_scheduled_posts by id; optional external_id for channel APIs).
-- Run in Supabase SQL editor after ao_scheduled_posts exists.

CREATE TABLE IF NOT EXISTS ao_scheduled_post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id UUID NOT NULL REFERENCES ao_scheduled_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'twitter')),
  external_id TEXT,
  posted_at_utc TIMESTAMPTZ,
  impressions BIGINT,
  clicks BIGINT,
  reactions BIGINT,
  comments BIGINT,
  shares BIGINT,
  engagement_score NUMERIC,
  raw JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scheduled_post_id)
);

CREATE INDEX IF NOT EXISTS idx_ao_scheduled_post_metrics_platform_posted
  ON ao_scheduled_post_metrics (platform, posted_at_utc);

COMMENT ON TABLE ao_scheduled_post_metrics IS 'AO Social: optional metrics per published scheduled post; used for suggested posting times + benchmarks fallback.';
