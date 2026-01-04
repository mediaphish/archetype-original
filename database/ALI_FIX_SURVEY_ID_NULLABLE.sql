-- Fix: Make survey_id nullable in ali_survey_deployments
-- This column is deprecated in favor of snapshot_id, but still exists for backward compatibility
-- It needs to be nullable so we can create deployments using snapshots

ALTER TABLE ali_survey_deployments 
  ALTER COLUMN survey_id DROP NOT NULL;

-- Verify the change
SELECT 
  column_name, 
  is_nullable, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'ali_survey_deployments' 
  AND column_name = 'survey_id';

