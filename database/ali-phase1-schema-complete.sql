-- ALI Phase 1: Complete Database Setup
-- Run this entire script in Supabase SQL Editor
-- It handles existing tables and adds missing columns

-- ============================================
-- STEP 1: Add missing columns to existing ali_applications table
-- (Without foreign key constraint yet - we'll add that after creating ali_companies)
-- ============================================
DO $$ 
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ali_applications' AND column_name = 'status'
  ) THEN
    ALTER TABLE ali_applications ADD COLUMN status TEXT DEFAULT 'pending';
    ALTER TABLE ali_applications ADD CONSTRAINT ali_applications_status_check 
      CHECK (status IN ('pending', 'approved', 'rejected', 'converted'));
  END IF;

  -- Add converted_to_company_id column if it doesn't exist (without foreign key yet)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ali_applications' AND column_name = 'converted_to_company_id'
  ) THEN
    ALTER TABLE ali_applications ADD COLUMN converted_to_company_id UUID;
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ali_applications' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE ali_applications ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- STEP 2: Create all tables (including ali_companies first)
-- ============================================

-- COMPANIES (must be created first since other tables reference it)
CREATE TABLE IF NOT EXISTS ali_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_size TEXT,
  website TEXT,
  industry TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pilot')),
  pilot_program BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

-- DIVISIONS
CREATE TABLE IF NOT EXISTS ali_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES ali_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_division_id UUID REFERENCES ali_divisions(id),
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- CONTACTS
CREATE TABLE IF NOT EXISTS ali_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES ali_companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT,
  permission_level TEXT DEFAULT 'view_only' CHECK (permission_level IN ('account_owner', 'view_only')),
  auth_provider TEXT,
  auth_provider_id TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, email)
);

-- SURVEYS
CREATE TABLE IF NOT EXISTS ali_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  description TEXT,
  questions JSONB NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  auto_deploy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SURVEY DEPLOYMENTS
CREATE TABLE IF NOT EXISTS ali_survey_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES ali_surveys(id),
  company_id UUID NOT NULL REFERENCES ali_companies(id) ON DELETE CASCADE,
  division_id UUID REFERENCES ali_divisions(id),
  deployment_token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed', 'archived')),
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  minimum_responses INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SURVEY RESPONSES
CREATE TABLE IF NOT EXISTS ali_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES ali_survey_deployments(id) ON DELETE CASCADE,
  division_id UUID REFERENCES ali_divisions(id),
  responses JSONB NOT NULL,
  device_type TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 3: Now add the foreign key constraint to ali_applications
-- (ali_companies now exists, so this will work)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ali_applications_converted_to_company_id_fkey'
  ) THEN
    ALTER TABLE ali_applications 
    ADD CONSTRAINT ali_applications_converted_to_company_id_fkey 
    FOREIGN KEY (converted_to_company_id) REFERENCES ali_companies(id);
  END IF;
END $$;

-- ============================================
-- STEP 4: Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ali_companies_status ON ali_companies(status);
CREATE INDEX IF NOT EXISTS idx_ali_companies_pilot ON ali_companies(pilot_program);
CREATE INDEX IF NOT EXISTS idx_ali_applications_status ON ali_applications(status);
CREATE INDEX IF NOT EXISTS idx_ali_applications_email ON ali_applications(email);
CREATE INDEX IF NOT EXISTS idx_ali_divisions_company ON ali_divisions(company_id);
CREATE INDEX IF NOT EXISTS idx_ali_divisions_parent ON ali_divisions(parent_division_id);
CREATE INDEX IF NOT EXISTS idx_ali_contacts_company ON ali_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_ali_contacts_email ON ali_contacts(email);
CREATE INDEX IF NOT EXISTS idx_ali_contacts_permission ON ali_contacts(permission_level);
CREATE INDEX IF NOT EXISTS idx_ali_surveys_status ON ali_surveys(status);
CREATE INDEX IF NOT EXISTS idx_ali_survey_deployments_company ON ali_survey_deployments(company_id);
CREATE INDEX IF NOT EXISTS idx_ali_survey_deployments_division ON ali_survey_deployments(division_id);
CREATE INDEX IF NOT EXISTS idx_ali_survey_deployments_token ON ali_survey_deployments(deployment_token);
CREATE INDEX IF NOT EXISTS idx_ali_survey_deployments_status ON ali_survey_deployments(status);
CREATE INDEX IF NOT EXISTS idx_ali_survey_responses_deployment ON ali_survey_responses(deployment_id);
CREATE INDEX IF NOT EXISTS idx_ali_survey_responses_division ON ali_survey_responses(division_id);
CREATE INDEX IF NOT EXISTS idx_ali_survey_responses_completed ON ali_survey_responses(completed_at);

-- ============================================
-- STEP 5: Create auto-update function and triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ali_companies_updated_at ON ali_companies;
CREATE TRIGGER update_ali_companies_updated_at BEFORE UPDATE ON ali_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ali_applications_updated_at ON ali_applications;
CREATE TRIGGER update_ali_applications_updated_at BEFORE UPDATE ON ali_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ali_divisions_updated_at ON ali_divisions;
CREATE TRIGGER update_ali_divisions_updated_at BEFORE UPDATE ON ali_divisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ali_contacts_updated_at ON ali_contacts;
CREATE TRIGGER update_ali_contacts_updated_at BEFORE UPDATE ON ali_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ali_surveys_updated_at ON ali_surveys;
CREATE TRIGGER update_ali_surveys_updated_at BEFORE UPDATE ON ali_surveys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ali_survey_deployments_updated_at ON ali_survey_deployments;
CREATE TRIGGER update_ali_survey_deployments_updated_at BEFORE UPDATE ON ali_survey_deployments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: Enable Row Level Security
-- ============================================
ALTER TABLE ali_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_survey_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_survey_responses ENABLE ROW LEVEL SECURITY;
