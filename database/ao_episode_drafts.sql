-- Podcast episode drafts (Auto episode processing pipeline).
-- Run in Supabase SQL editor when deploying episode-process / episode-publish.

CREATE TABLE IF NOT EXISTS ao_episode_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'rejected')),
  episode_type TEXT NOT NULL DEFAULT 'solo' CHECK (episode_type IN ('solo', 'guest')),
  recorded_date DATE,
  transcript TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  body_md TEXT NOT NULL DEFAULT '',
  show_notes TEXT[] DEFAULT '{}',
  key_takeaways TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  related TEXT[] DEFAULT '{}',
  guest JSONB DEFAULT NULL,
  slug TEXT,
  youtube_id TEXT,
  spotify_embed_url TEXT,
  duration TEXT,
  target_path TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ao_episode_drafts_email ON ao_episode_drafts(created_by_email);
CREATE INDEX IF NOT EXISTS idx_ao_episode_drafts_status ON ao_episode_drafts(status);

COMMENT ON TABLE ao_episode_drafts IS 'Auto: processed podcast transcripts awaiting Bart approval and publish.';
