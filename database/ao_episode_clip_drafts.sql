-- Episode clip drafts (Riverside Magic Clips scaffolding — not wired into Auto UI yet).
-- Run in Supabase SQL editor when activating the clip caption pipeline.

CREATE TABLE IF NOT EXISTS ao_episode_clip_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'rejected')),
  parent_episode_slug TEXT,
  parent_episode_draft_id UUID,
  clip_video_url TEXT,
  storage_path TEXT,
  clip_hint TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] DEFAULT '{}',
  cta TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ao_episode_clip_drafts_email ON ao_episode_clip_drafts(created_by_email);
CREATE INDEX IF NOT EXISTS idx_ao_episode_clip_drafts_parent_slug ON ao_episode_clip_drafts(parent_episode_slug);

COMMENT ON TABLE ao_episode_clip_drafts IS 'Auto scaffolding: short-form clip captions for Riverside exports. Approval-gated; not in main UI yet.';
