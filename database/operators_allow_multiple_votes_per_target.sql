-- Allow multiple votes for the same target
-- Remove the unique constraint that prevents voting multiple times for the same person

ALTER TABLE operators_votes 
DROP CONSTRAINT IF EXISTS unique_vote_per_target;

-- Note: Users can now vote multiple times for the same target (up to 10 total votes per event)
-- This allows users to use all 10 votes on a single person if they want
