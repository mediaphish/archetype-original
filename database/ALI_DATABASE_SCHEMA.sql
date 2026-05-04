-- ALI Applications Table Schema
-- Run this SQL in your Supabase SQL Editor to create the table

CREATE TABLE IF NOT EXISTS ali_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_size TEXT NOT NULL CHECK (company_size IN ('10-20', '21-50', '51-100', '101-250')),
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  role TEXT,
  why_interested TEXT,
  consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_ali_applications_email ON ali_applications(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_ali_applications_created_at ON ali_applications(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE ali_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to insert (for API)
-- Note: This assumes you're using the service role key in your API
-- If using anon key, you'll need to adjust the policy
CREATE POLICY "Allow service role to insert applications"
  ON ali_applications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Allow service role to read all applications (for admin)
CREATE POLICY "Allow service role to read applications"
  ON ali_applications
  FOR SELECT
  TO service_role
  USING (true);

-- If you need to allow anon key access, use this instead:
-- CREATE POLICY "Allow anon to insert applications"
--   ON ali_applications
--   FOR INSERT
--   TO anon
--   WITH CHECK (true);

