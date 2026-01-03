-- ============================================
-- ALI Phase 2: Complete Schema Migration
-- Purpose: Add question bank, survey snapshots, and baseline_date support
-- 
-- Run this entire script in Supabase SQL Editor
-- It handles existing tables and adds new structures
-- ============================================

-- ============================================
-- STEP 1: Question Bank Schema
-- ============================================

-- QUESTION BANK (Immutable Question Repository)
CREATE TABLE IF NOT EXISTS ali_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stable Identity (Immutable)
  stable_id TEXT NOT NULL UNIQUE, -- e.g., "Q-CLARITY-001", "Q-TRUST-045"
  
  -- Question Content (Immutable once active)
  question_text TEXT NOT NULL,
  
  -- Classification Metadata
  pattern TEXT NOT NULL CHECK (pattern IN (
    'clarity', 'consistency', 'trust', 'communication', 
    'alignment', 'stability', 'leadership_drift'
  )),
  role TEXT NOT NULL CHECK (role IN ('leader', 'team_member')),
  angle TEXT NOT NULL, -- e.g., "intention", "experience", "gap"
  lens TEXT NOT NULL CHECK (lens IN (
    'behavioral_alignment', 'trust_density', 'communication_clarity'
  )),
  
  -- Question Properties
  is_negative BOOLEAN DEFAULT false, -- Reverse-scored item
  is_anchor BOOLEAN DEFAULT false, -- Anchor question (always included)
  
  -- Instrument Versioning
  instrument_version TEXT NOT NULL DEFAULT 'v1.0', -- e.g., "v1.0", "v1.1"
  introduced_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Lifecycle
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'deprecated')),
  deprecated_at TIMESTAMPTZ, -- When question was retired (never deleted)
  deprecated_reason TEXT, -- Why it was retired
  
  -- Audit Trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT, -- System identifier (e.g., "system", "migration-v1.0")
  
  -- Note: Immutability enforced via trigger, not CHECK constraint
  -- CHECK constraints cannot reference other columns in same row effectively
);

-- QUESTION VERSION HISTORY (Track wording changes)
CREATE TABLE IF NOT EXISTS ali_question_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_id TEXT NOT NULL REFERENCES ali_question_bank(stable_id) ON DELETE RESTRICT,
  question_text TEXT NOT NULL,
  instrument_version TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by TEXT,
  change_reason TEXT,
  
  -- Index for quick lookup
  CONSTRAINT question_versions_unique UNIQUE (stable_id, instrument_version)
);

-- ============================================
-- STEP 2: Survey Snapshot Schema
-- ============================================

-- SURVEY SNAPSHOTS (Immutable Generated Surveys)
CREATE TABLE IF NOT EXISTS ali_survey_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Survey Identity
  survey_index TEXT NOT NULL, -- "S1", "S2", "S3", etc.
  instrument_version TEXT NOT NULL DEFAULT 'v1.0', -- e.g., "v1.0", "v1.1"
  
  -- Generation Metadata (Deterministic Seed)
  client_id UUID NOT NULL REFERENCES ali_companies(id) ON DELETE CASCADE,
  generation_seed TEXT NOT NULL, -- hash(client_id + survey_index + instrument_version)
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT DEFAULT 'system', -- Always "system" for deterministic builds
  
  -- Question List (Immutable Ordered Array)
  question_stable_ids TEXT[] NOT NULL, -- Ordered list of stable_ids
  question_order JSONB NOT NULL, -- Full question metadata at generation time
  
  -- Composition Validation
  anchor_count INTEGER NOT NULL CHECK (anchor_count = 3),
  pattern_question_count INTEGER NOT NULL CHECK (pattern_question_count = 7),
  total_question_count INTEGER NOT NULL CHECK (total_question_count = 10),
  negative_item_count INTEGER NOT NULL CHECK (negative_item_count >= 2 AND negative_item_count <= 4),
  
  -- Immutability Enforcement
  is_locked BOOLEAN DEFAULT true, -- Always true for generated surveys
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Audit Trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT survey_snapshot_unique UNIQUE (client_id, survey_index, instrument_version)
  -- Note: Immutability enforced via trigger (is_locked always true)
);

-- ============================================
-- STEP 3: Update Survey Deployments
-- ============================================

-- Add snapshot_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ali_survey_deployments' AND column_name = 'snapshot_id'
  ) THEN
    ALTER TABLE ali_survey_deployments 
    ADD COLUMN snapshot_id UUID REFERENCES ali_survey_snapshots(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Add survey_index to deployments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ali_survey_deployments' AND column_name = 'survey_index'
  ) THEN
    ALTER TABLE ali_survey_deployments 
    ADD COLUMN survey_index TEXT;
  END IF;
END $$;

-- Add available_at to deployments (when survey becomes available)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ali_survey_deployments' AND column_name = 'available_at'
  ) THEN
    ALTER TABLE ali_survey_deployments 
    ADD COLUMN available_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add sent_at to deployments (when survey was actually sent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ali_survey_deployments' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE ali_survey_deployments 
    ADD COLUMN sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- STEP 4: Add Baseline Date to Companies
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
-- STEP 5: Create Indexes
-- ============================================

-- Question Bank Indexes
CREATE INDEX IF NOT EXISTS idx_question_bank_stable_id ON ali_question_bank(stable_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_pattern ON ali_question_bank(pattern);
CREATE INDEX IF NOT EXISTS idx_question_bank_role ON ali_question_bank(role);
CREATE INDEX IF NOT EXISTS idx_question_bank_lens ON ali_question_bank(lens);
CREATE INDEX IF NOT EXISTS idx_question_bank_status ON ali_question_bank(status);
CREATE INDEX IF NOT EXISTS idx_question_bank_instrument_version ON ali_question_bank(instrument_version);
CREATE INDEX IF NOT EXISTS idx_question_bank_anchor ON ali_question_bank(is_anchor) WHERE is_anchor = true;
CREATE INDEX IF NOT EXISTS idx_question_bank_active ON ali_question_bank(status, instrument_version) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_question_versions_stable_id ON ali_question_versions(stable_id);
CREATE INDEX IF NOT EXISTS idx_question_versions_instrument ON ali_question_versions(instrument_version);

-- Survey Snapshot Indexes
CREATE INDEX IF NOT EXISTS idx_survey_snapshots_client ON ali_survey_snapshots(client_id);
CREATE INDEX IF NOT EXISTS idx_survey_snapshots_index ON ali_survey_snapshots(survey_index);
CREATE INDEX IF NOT EXISTS idx_survey_snapshots_instrument ON ali_survey_snapshots(instrument_version);
CREATE INDEX IF NOT EXISTS idx_survey_snapshots_seed ON ali_survey_snapshots(generation_seed);
CREATE INDEX IF NOT EXISTS idx_survey_snapshots_unique ON ali_survey_snapshots(client_id, survey_index, instrument_version);

-- Deployment Indexes
CREATE INDEX IF NOT EXISTS idx_survey_deployments_snapshot ON ali_survey_deployments(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_survey_deployments_index ON ali_survey_deployments(survey_index);

-- Company Baseline Date Index
CREATE INDEX IF NOT EXISTS idx_ali_companies_baseline_date ON ali_companies(baseline_date) WHERE baseline_date IS NOT NULL;

-- ============================================
-- STEP 6: Create Immutability Triggers
-- ============================================

-- Prevent updates to active questions
CREATE OR REPLACE FUNCTION prevent_active_question_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- If question is active or deprecated, prevent changes to immutable fields
  IF OLD.status IN ('active', 'deprecated') THEN
    IF NEW.question_text != OLD.question_text OR
       NEW.pattern != OLD.pattern OR
       NEW.role != OLD.role OR
       NEW.angle != OLD.angle OR
       NEW.lens != OLD.lens OR
       NEW.is_negative != OLD.is_negative OR
       NEW.is_anchor != OLD.is_anchor OR
       NEW.stable_id != OLD.stable_id THEN
      RAISE EXCEPTION 'Cannot modify immutable fields of active/deprecated question. Use versioning instead.';
    END IF;
  END IF;
  
  -- If deprecating, record timestamp
  IF NEW.status = 'deprecated' AND OLD.status != 'deprecated' THEN
    NEW.deprecated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_active_question_updates_trigger ON ali_question_bank;
CREATE TRIGGER prevent_active_question_updates_trigger
BEFORE UPDATE ON ali_question_bank
FOR EACH ROW
EXECUTE FUNCTION prevent_active_question_updates();

-- Auto-create version history on question activation
CREATE OR REPLACE FUNCTION track_question_version_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track changes while in draft status
  IF OLD.status = 'draft' AND NEW.status = 'active' THEN
    INSERT INTO ali_question_versions (
      stable_id,
      question_text,
      instrument_version,
      changed_at,
      changed_by,
      change_reason
    ) VALUES (
      NEW.stable_id,
      NEW.question_text,
      NEW.instrument_version,
      NOW(),
      'system',
      'Question activated'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_question_version_changes_trigger ON ali_question_bank;
CREATE TRIGGER track_question_version_changes_trigger
AFTER UPDATE ON ali_question_bank
FOR EACH ROW
EXECUTE FUNCTION track_question_version_changes();

-- Prevent any updates to locked survey snapshots
CREATE OR REPLACE FUNCTION prevent_survey_snapshot_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_locked = true THEN
    RAISE EXCEPTION 'Survey snapshot is immutable. Cannot modify locked survey.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_survey_snapshot_updates_trigger ON ali_survey_snapshots;
CREATE TRIGGER prevent_survey_snapshot_updates_trigger
BEFORE UPDATE ON ali_survey_snapshots
FOR EACH ROW
EXECUTE FUNCTION prevent_survey_snapshot_updates();

-- Prevent baseline_date changes after first survey
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

DROP TRIGGER IF EXISTS prevent_baseline_date_changes_trigger ON ali_companies;
CREATE TRIGGER prevent_baseline_date_changes_trigger
BEFORE UPDATE ON ali_companies
FOR EACH ROW
EXECUTE FUNCTION prevent_baseline_date_changes();

-- ============================================
-- STEP 7: Helper Functions
-- ============================================

-- Get Survey Snapshot by Client and Index
CREATE OR REPLACE FUNCTION get_survey_snapshot(
  p_client_id UUID,
  p_survey_index TEXT,
  p_instrument_version TEXT DEFAULT 'v1.0'
)
RETURNS ali_survey_snapshots AS $$
  SELECT * FROM ali_survey_snapshots
  WHERE client_id = p_client_id
    AND survey_index = p_survey_index
    AND instrument_version = p_instrument_version
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ============================================
-- STEP 8: Enable Row Level Security
-- ============================================
ALTER TABLE ali_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_question_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_survey_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Read access for all authenticated users
-- (RLS policies to be added with auth system)

-- ============================================
-- Migration Complete
-- ============================================
-- 
-- Next Steps:
-- 1. Populate ali_question_bank with 70 questions (7 patterns × 10 questions)
-- 2. Test survey generation via /api/ali/build-survey
-- 3. Test deployment via /api/ali/deploy-survey
-- 4. Verify immutability (attempt updates → should fail)
-- ============================================

