-- AO Automation — Ideas inbox (Path B: Ready Posts)
-- Run in Supabase SQL editor AFTER database/ao_ideas.sql.

ALTER TABLE ao_ideas
  ADD COLUMN IF NOT EXISTS path TEXT NOT NULL DEFAULT 'idea_seed'
    CHECK (path IN ('idea_seed', 'ready_post'));

-- Ready Post fields
ALTER TABLE ao_ideas
  ADD COLUMN IF NOT EXISTS markdown_content TEXT,
  ADD COLUMN IF NOT EXISTS ready_target_site BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ready_target_social BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ready_social_channels TEXT[] NOT NULL DEFAULT ARRAY['linkedin','facebook','instagram','x'],
  ADD COLUMN IF NOT EXISTS ready_featured_image_filename TEXT,
  ADD COLUMN IF NOT EXISTS ready_featured_image_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS ready_social_drafts JSONB;

-- Store one featured image (base64) without bloating ao_ideas rows.
CREATE TABLE IF NOT EXISTS ao_idea_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ao_ideas(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'featured_image' CHECK (kind IN ('featured_image')),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  content_base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ao_idea_assets_idea_id ON ao_idea_assets(idea_id);

