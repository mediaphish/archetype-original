-- Cleanup: Drop old operators_event_topics table
-- Run this AFTER verifying the migration was successful and scenarios are working

-- Drop the old table (only if migration was successful)
DROP TABLE IF EXISTS operators_event_topics;

-- Verify cleanup (this should return 0 rows if successful)
-- SELECT COUNT(*) FROM operators_event_topics; -- Should fail with "relation does not exist"
