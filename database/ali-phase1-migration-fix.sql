-- ALI Phase 1: Migration Fix
-- Run this FIRST if you get an error about missing "status" column
-- This updates the existing ali_applications table

-- Add missing columns to ali_applications if they don't exist
DO $$ 
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ali_applications' AND column_name = 'status'
  ) THEN
    ALTER TABLE ali_applications ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted'));
  END IF;

  -- Add converted_to_company_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ali_applications' AND column_name = 'converted_to_company_id'
  ) THEN
    ALTER TABLE ali_applications ADD COLUMN converted_to_company_id UUID REFERENCES ali_companies(id);
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ali_applications' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE ali_applications ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Now run the main schema file

