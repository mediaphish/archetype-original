-- Add Start Time and Finish Time to Operators Events
-- Run this in Supabase SQL Editor

ALTER TABLE operators_events
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS finish_time TIME;

-- Add a check constraint to ensure finish_time is after start_time (if both are provided)
ALTER TABLE operators_events
DROP CONSTRAINT IF EXISTS check_event_times;

ALTER TABLE operators_events
ADD CONSTRAINT check_event_times 
CHECK (
  start_time IS NULL 
  OR finish_time IS NULL 
  OR finish_time > start_time
);

-- Add comment for documentation
COMMENT ON COLUMN operators_events.start_time IS 'Time when the event starts (time of day)';
COMMENT ON COLUMN operators_events.finish_time IS 'Time when the event ends (time of day)';
