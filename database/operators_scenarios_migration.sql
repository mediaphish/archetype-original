-- Migration: Convert Topic Insights to Scenario-Based System
-- This script migrates data from operators_event_topics to operators_event_scenarios

-- 1. Add current_challenge to operators_rsvps (if not already added)
ALTER TABLE operators_rsvps
ADD COLUMN IF NOT EXISTS current_challenge TEXT;

-- 2. Create new operators_event_scenarios table
CREATE TABLE IF NOT EXISTS operators_event_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES operators_events(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 5),
  scenario_title TEXT NOT NULL,
  scenario_story TEXT NOT NULL,
  why_this_fits_this_room TEXT NOT NULL,
  starter_prompts JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT NOT NULL DEFAULT 'AI' CHECK (generated_by = 'AI'),
  is_locked BOOLEAN DEFAULT false,
  previous_scenarios JSONB DEFAULT '[]'::jsonb,
  UNIQUE(event_id, rank)
);

-- 3. Migrate data from operators_event_topics to operators_event_scenarios
INSERT INTO operators_event_scenarios (
  event_id,
  rank,
  scenario_title,
  scenario_story,
  why_this_fits_this_room,
  starter_prompts,
  created_at,
  generated_by,
  is_locked,
  previous_scenarios
)
SELECT 
  event_id,
  rank,
  topic_title AS scenario_title,
  topic_summary AS scenario_story,
  why_this_fits_this_room,
  starter_prompts,
  created_at,
  generated_by,
  is_locked,
  '[]'::jsonb AS previous_scenarios
FROM operators_event_topics
ON CONFLICT (event_id, rank) DO NOTHING;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_operators_event_scenarios_event_id ON operators_event_scenarios(event_id);
CREATE INDEX IF NOT EXISTS idx_operators_event_scenarios_previous ON operators_event_scenarios USING GIN(previous_scenarios);

-- 5. Drop old table (after verifying migration)
-- Uncomment the following line after verifying the migration was successful:
-- DROP TABLE IF EXISTS operators_event_topics;
