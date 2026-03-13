-- AO Automation — Scheduled posts: preserve intent + capture feedback
-- Run in Supabase SQL editor.

ALTER TABLE ao_scheduled_posts
ADD COLUMN IF NOT EXISTS source_kind TEXT,
ADD COLUMN IF NOT EXISTS source_quote_id UUID,
ADD COLUMN IF NOT EXISTS source_idea_id UUID,
ADD COLUMN IF NOT EXISTS intent JSONB,
ADD COLUMN IF NOT EXISTS best_move TEXT,
ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
ADD COLUMN IF NOT EXISTS ao_lane TEXT,
ADD COLUMN IF NOT EXISTS topic_tags TEXT[],
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS feedback_rating TEXT,
ADD COLUMN IF NOT EXISTS feedback_notes TEXT,
ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ao_scheduled_posts_source_quote_id ON ao_scheduled_posts(source_quote_id);
CREATE INDEX IF NOT EXISTS idx_ao_scheduled_posts_source_idea_id ON ao_scheduled_posts(source_idea_id);

