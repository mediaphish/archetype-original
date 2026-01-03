-- ============================================
-- ALI Companies: Add Baseline Date Support
-- Purpose: Track when Survey 1 is sent for client-paced cadence
-- ============================================

-- Add baseline_date column to ali_companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ali_companies' AND column_name = 'baseline_date'
  ) THEN
    ALTER TABLE ali_companies 
    ADD COLUMN baseline_date DATE;
    
    -- Add comment
    COMMENT ON COLUMN ali_companies.baseline_date IS 
      'Date Survey 1 was sent. Used to calculate future survey dates (S2 = baseline + 3 months, etc.). Month-end rule: If target month lacks baseline day, snap to last valid day.';
  END IF;
END $$;

-- ============================================
-- Prevent Baseline Date Changes After First Survey
-- ============================================

CREATE OR REPLACE FUNCTION prevent_baseline_date_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- If company has any surveys, prevent baseline_date changes
  IF EXISTS (
    SELECT 1 FROM ali_survey_snapshots 
    WHERE client_id = NEW.id
    LIMIT 1
  ) THEN
    IF NEW.baseline_date IS DISTINCT FROM OLD.baseline_date THEN
      RAISE EXCEPTION 'Cannot change baseline_date after first survey. Contact admin if correction needed.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS prevent_baseline_date_changes_trigger ON ali_companies;
CREATE TRIGGER prevent_baseline_date_changes_trigger
BEFORE UPDATE ON ali_companies
FOR EACH ROW
EXECUTE FUNCTION prevent_baseline_date_changes();

-- ============================================
-- Index for Baseline Date Queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ali_companies_baseline_date ON ali_companies(baseline_date) WHERE baseline_date IS NOT NULL;

