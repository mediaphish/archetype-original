-- ALI Phase 1: Database Schema
-- Archetype Leadership Index - Core Infrastructure
-- 
-- This schema supports:
-- - Company signups (auto-creates company record)
-- - Organizational divisions (not location-based)
-- - Multiple contacts per company (Account Owner, View Only)
-- - Survey deployment to specific divisions
-- - Anonymous survey responses
-- - Dashboard access with permission levels
-- - Pilot program support

-- ============================================
-- COMPANIES
-- ============================================
-- Auto-created when someone signs up
-- Fully automated - no manual company creation needed
CREATE TABLE IF NOT EXISTS ali_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_size TEXT, -- e.g., "10-50", "51-100", "101-250"
  website TEXT,
  industry TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pilot')),
  pilot_program BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

-- ============================================
-- APPLICATIONS (Pilot Signups)
-- ============================================
-- Already exists - keeping name as-is per requirements
-- This is where initial pilot applications are stored
CREATE TABLE IF NOT EXISTS ali_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_size TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  role TEXT,
  why_interested TEXT,
  consent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  converted_to_company_id UUID REFERENCES ali_companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DIVISIONS
-- ============================================
-- Organizational divisions (not location-specific)
-- Can have sub-divisions for necessary depth
CREATE TABLE IF NOT EXISTS ali_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES ali_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_division_id UUID REFERENCES ali_divisions(id), -- For sub-divisions
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- ============================================
-- CONTACTS
-- ============================================
-- Multiple contacts per company
-- Permission levels: Account Owner, View Only
CREATE TABLE IF NOT EXISTS ali_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES ali_companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT,
  permission_level TEXT DEFAULT 'view_only' CHECK (permission_level IN ('account_owner', 'view_only')),
  auth_provider TEXT, -- e.g., 'google', 'github', 'email'
  auth_provider_id TEXT, -- External auth ID
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, email)
);

-- ============================================
-- SURVEYS
-- ============================================
-- Survey definitions
-- Survey 1 auto-deploys when company is ready
CREATE TABLE IF NOT EXISTS ali_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  description TEXT,
  questions JSONB NOT NULL, -- Survey questions structure
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  auto_deploy BOOLEAN DEFAULT false, -- Survey 1 auto-deploys
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SURVEY DEPLOYMENTS
-- ============================================
-- Links surveys to companies/divisions
-- Company chooses when to pull the link
CREATE TABLE IF NOT EXISTS ali_survey_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES ali_surveys(id),
  company_id UUID NOT NULL REFERENCES ali_companies(id) ON DELETE CASCADE,
  division_id UUID REFERENCES ali_divisions(id), -- NULL = company-wide
  deployment_token TEXT NOT NULL UNIQUE, -- Unique token for survey link
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed', 'archived')),
  opens_at TIMESTAMPTZ, -- When company chooses to open it
  closes_at TIMESTAMPTZ, -- Optional closing date
  minimum_responses INTEGER DEFAULT 5, -- Best practice threshold
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SURVEY RESPONSES
-- ============================================
-- Anonymous responses
-- Links to deployment, not individual
-- Includes timestamp for metadata
CREATE TABLE IF NOT EXISTS ali_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES ali_survey_deployments(id) ON DELETE CASCADE,
  division_id UUID REFERENCES ali_divisions(id), -- Which division they're in
  responses JSONB NOT NULL, -- Actual survey responses
  device_type TEXT, -- Optional: mobile, desktop, tablet
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
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
-- FUNCTIONS & TRIGGERS
-- ============================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ali_companies_updated_at
  BEFORE UPDATE ON ali_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ali_applications_updated_at
  BEFORE UPDATE ON ali_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ali_divisions_updated_at
  BEFORE UPDATE ON ali_divisions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ali_contacts_updated_at
  BEFORE UPDATE ON ali_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ali_surveys_updated_at
  BEFORE UPDATE ON ali_surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ali_survey_deployments_updated_at
  BEFORE UPDATE ON ali_survey_deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE ali_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_survey_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_survey_responses ENABLE ROW LEVEL SECURITY;

-- Policies will be added based on authentication strategy
-- For now, service role has full access via service_role_key
-- Contact-based policies will be added when auth is implemented

