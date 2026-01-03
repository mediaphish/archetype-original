-- ============================================
-- ALI Question Bank Schema
-- Purpose: Immutable question repository with rich metadata
-- Supports: Deterministic selection, versioning, longitudinal integrity
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
-- Indexes for Performance
-- ============================================
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

-- ============================================
-- Immutability Enforcement Functions
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

CREATE TRIGGER prevent_active_question_updates_trigger
BEFORE UPDATE ON ali_question_bank
FOR EACH ROW
EXECUTE FUNCTION prevent_active_question_updates();

-- Auto-create version history on question text changes (draft only)
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

CREATE TRIGGER track_question_version_changes_trigger
AFTER UPDATE ON ali_question_bank
FOR EACH ROW
EXECUTE FUNCTION track_question_version_changes();

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE ali_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_question_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Read access for all authenticated users
-- (RLS policies to be added with auth system)

-- ============================================
-- Initial Data Constraints
-- ============================================

-- Ensure exactly 3 anchor questions exist per instrument version
-- (Enforced at application level, but documented here)
-- Expected: 1 leader anchor, 1 team anchor, 1 shared anchor

-- Ensure question distribution:
-- - 7 patterns × 10 questions = 70 questions per instrument version
-- - Each pattern: 5 leader questions, 5 team questions
-- - Negative items: ~30% of questions (21 questions)
-- - Anchors: 3 total (1 leader, 1 team, 1 shared)

