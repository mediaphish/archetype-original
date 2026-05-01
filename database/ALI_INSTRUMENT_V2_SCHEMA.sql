-- ============================================
-- ALI Instrument v2.0 Schema (additive migration)
-- ============================================
-- What this migration introduces (in plain language):
--
-- The pilot needs leader and team-member to answer the same underlying idea
-- ("construct") in role-appropriate words on the same scale. This migration
-- adds the columns and the integrity checks that make that possible without
-- rewriting the existing schema or breaking v1.x questions.
--
-- Nothing destructive. v1.x rows continue to work. v2.0 rows must satisfy
-- a stricter "every active construct has a leader stem AND a team-member
-- stem on identical response scales" rule, enforced at write time and
-- verifiable on demand.
-- ============================================

-- ------------------------------------------------------------------
-- 1. Extend ali_question_bank with paired-architecture columns
-- ------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ali_question_bank' AND column_name = 'construct_id'
  ) THEN
    ALTER TABLE ali_question_bank
      ADD COLUMN construct_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ali_question_bank' AND column_name = 'equivalence_note'
  ) THEN
    ALTER TABLE ali_question_bank
      ADD COLUMN equivalence_note TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ali_question_bank' AND column_name = 'lineage_source_ids'
  ) THEN
    ALTER TABLE ali_question_bank
      ADD COLUMN lineage_source_ids TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ali_question_bank' AND column_name = 'lineage_action'
  ) THEN
    ALTER TABLE ali_question_bank
      ADD COLUMN lineage_action TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ali_question_bank' AND column_name = 'response_scale'
  ) THEN
    ALTER TABLE ali_question_bank
      ADD COLUMN response_scale TEXT NOT NULL DEFAULT '1_5_likert';
  END IF;
END $$;

-- ------------------------------------------------------------------
-- 2. Soft-validate values for the new lineage_action column
-- ------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'ali_question_bank'
      AND constraint_name = 'ali_question_bank_lineage_action_check'
  ) THEN
    ALTER TABLE ali_question_bank
      ADD CONSTRAINT ali_question_bank_lineage_action_check
      CHECK (
        lineage_action IS NULL
        OR lineage_action IN ('preserved', 'edited', 'rewritten', 'new')
      );
  END IF;
END $$;

-- ------------------------------------------------------------------
-- 3. Indexes for v2.0 access patterns
-- ------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_question_bank_construct_id
  ON ali_question_bank(construct_id);

CREATE INDEX IF NOT EXISTS idx_question_bank_construct_role
  ON ali_question_bank(construct_id, role)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_question_bank_v2_active
  ON ali_question_bank(instrument_version, status)
  WHERE instrument_version = 'v2.0' AND status = 'active';

-- ------------------------------------------------------------------
-- 4. Require construct_id on v2.0 active items (paired enforcement)
-- ------------------------------------------------------------------
-- Older instruments (v1.x) are exempt to preserve history. New work
-- (v2.0+) must always carry a construct_id when active.

CREATE OR REPLACE FUNCTION ali_question_bank_require_construct_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active'
     AND NEW.instrument_version IS NOT NULL
     AND NEW.instrument_version <> 'v1.0'
     AND NEW.instrument_version NOT LIKE 'v1.%'
     AND (NEW.construct_id IS NULL OR NEW.construct_id = '')
  THEN
    RAISE EXCEPTION
      'construct_id is required for active questions in instrument_version %',
      NEW.instrument_version;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ali_question_bank_require_construct_id_trigger
  ON ali_question_bank;

CREATE TRIGGER ali_question_bank_require_construct_id_trigger
BEFORE INSERT OR UPDATE ON ali_question_bank
FOR EACH ROW
EXECUTE FUNCTION ali_question_bank_require_construct_id();

-- ------------------------------------------------------------------
-- 5. Verification view: paired coverage per construct in v2.0
-- ------------------------------------------------------------------
-- For each active v2.0 construct, this view shows whether a leader
-- stem and a team_member stem both exist and whether they share
-- the same response_scale. Anything that returns is_paired=false
-- or has scales_match=false is a launch blocker.

CREATE OR REPLACE VIEW ali_v2_construct_coverage AS
WITH active_v2 AS (
  SELECT
    construct_id,
    role,
    response_scale
  FROM ali_question_bank
  WHERE status = 'active'
    AND instrument_version = 'v2.0'
    AND construct_id IS NOT NULL
)
SELECT
  construct_id,
  COUNT(*) FILTER (WHERE role = 'leader') AS leader_item_count,
  COUNT(*) FILTER (WHERE role = 'team_member') AS team_item_count,
  (COUNT(*) FILTER (WHERE role = 'leader') >= 1
   AND COUNT(*) FILTER (WHERE role = 'team_member') >= 1) AS is_paired,
  COUNT(DISTINCT response_scale) = 1 AS scales_match,
  ARRAY_AGG(DISTINCT response_scale) AS distinct_scales
FROM active_v2
GROUP BY construct_id
ORDER BY construct_id;

-- ------------------------------------------------------------------
-- 6. Verification function: returns rows for any unpaired or
--    scale-mismatched constructs. Empty result means launch-clean.
-- ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ali_v2_unpaired_constructs()
RETURNS TABLE (
  construct_id TEXT,
  reason TEXT,
  leader_item_count BIGINT,
  team_item_count BIGINT,
  distinct_scales TEXT[]
) AS $$
  SELECT
    c.construct_id,
    CASE
      WHEN NOT c.is_paired THEN 'missing_role_pair'
      WHEN NOT c.scales_match THEN 'response_scale_mismatch'
      ELSE 'unknown'
    END AS reason,
    c.leader_item_count,
    c.team_item_count,
    c.distinct_scales
  FROM ali_v2_construct_coverage c
  WHERE NOT c.is_paired
     OR NOT c.scales_match;
$$ LANGUAGE sql STABLE;

-- ------------------------------------------------------------------
-- 7. Audit comments (so future engineers know the rules)
-- ------------------------------------------------------------------

COMMENT ON COLUMN ali_question_bank.construct_id IS
  'Stable id of the underlying idea (e.g., C-CLARITY-UNDER-PRESSURE). v2.0+ items require this.';

COMMENT ON COLUMN ali_question_bank.equivalence_note IS
  'Short rationale for why the leader and team-member items in this construct measure the same thing.';

COMMENT ON COLUMN ali_question_bank.lineage_source_ids IS
  'Array of v1.x stable_ids this v2.0 item draws from. Empty array means newly authored.';

COMMENT ON COLUMN ali_question_bank.lineage_action IS
  'How v1.x source(s) were handled: preserved, edited, rewritten, or new.';

COMMENT ON COLUMN ali_question_bank.response_scale IS
  'Response scale identifier, e.g., 1_5_likert. Both items in a construct pair must match.';

COMMENT ON VIEW ali_v2_construct_coverage IS
  'Per-construct coverage check for v2.0 paired architecture.';

COMMENT ON FUNCTION ali_v2_unpaired_constructs() IS
  'Returns any active v2.0 constructs that are missing a role pair or have mismatched response scales.';
