-- Scenario Insights System Schema Changes
-- Extends Operators system with AI-powered scenario generation

-- 1. Add current_challenge to operators_rsvps table
ALTER TABLE operators_rsvps
ADD COLUMN IF NOT EXISTS current_challenge TEXT;

-- 2. Create operators_event_scenarios table (renamed from operators_event_topics)
CREATE TABLE IF NOT EXISTS operators_event_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES operators_events(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 5),
  scenario_title TEXT NOT NULL,
  scenario_story TEXT NOT NULL, -- 1 paragraph story (3-5 sentences)
  why_this_fits_this_room TEXT NOT NULL, -- 1 sentence
  starter_prompts JSONB NOT NULL, -- Array of 3-5 questions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT NOT NULL DEFAULT 'AI' CHECK (generated_by = 'AI'),
  is_locked BOOLEAN DEFAULT false,
  previous_scenarios JSONB DEFAULT '[]'::jsonb, -- Array of scenario IDs from previous events with overlapping attendees
  UNIQUE(event_id, rank)
);

-- Create index on event_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_operators_event_scenarios_event_id ON operators_event_scenarios(event_id);

-- Create index on previous_scenarios for duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_operators_event_scenarios_previous ON operators_event_scenarios USING GIN(previous_scenarios);
