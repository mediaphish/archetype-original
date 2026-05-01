-- ============================================
-- ALI Narrative Follow-Up Schema
-- ============================================
-- Tenant-private qualitative companion to the ALI survey. Triggered by
-- pattern-based dissonance signals at submission time, stored separately
-- from any user identity, and exposed to leader-facing dashboards only
-- after an N-threshold is met.
--
-- Strict privacy guarantees enforced by schema:
--   - No respondent_id, leader_id, contact_id, email, or IP columns.
--   - The link from a narrative back to a specific respondent is
--     structurally impossible at the database level.
--
-- This schema is intentionally separate from the public Bad Leader
-- Project archive. ALI narratives never join to BLP storage and never
-- surface in BLP-public views.
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------
-- ali_narratives — the narrative text itself
-- ------------------------------------------------------------------
-- The deployment_id and tenant scoping (via deployment -> company)
-- are deliberate; we want to know "this narrative came from this
-- pilot window for this tenant" but never "this narrative came from
-- this person."

CREATE TABLE IF NOT EXISTS ali_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id UUID NOT NULL REFERENCES ali_companies(id) ON DELETE CASCADE,
  deployment_id UUID NOT NULL REFERENCES ali_survey_deployments(id) ON DELETE CASCADE,

  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('dissonance', 'systemic')),
  condition TEXT, -- e.g., 'clarity' for dissonance triggers; null for systemic

  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 4000),
  language TEXT DEFAULT 'en',
  reading_grade NUMERIC,

  moderation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected')),
  is_visible BOOLEAN NOT NULL DEFAULT FALSE,

  cluster_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  moderated_at TIMESTAMPTZ,
  exposed_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------
-- ali_narrative_tags — themes/patterns assigned by analysts or AI
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ali_narrative_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  narrative_id UUID NOT NULL REFERENCES ali_narratives(id) ON DELETE CASCADE,

  tag_type TEXT NOT NULL CHECK (tag_type IN ('condition', 'theme', 'cluster', 'severity')),
  tag_value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'admin', 'ai')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT ali_narrative_tags_unique UNIQUE (narrative_id, tag_type, tag_value)
);

-- ------------------------------------------------------------------
-- ali_narrative_audit — moderation actions only
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ali_narrative_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  narrative_id UUID NOT NULL REFERENCES ali_narratives(id) ON DELETE CASCADE,

  action TEXT NOT NULL CHECK (action IN (
    'created', 'flagged', 'approved', 'rejected', 'exposed', 'unexposed', 'edited_for_redaction'
  )),
  actor TEXT NOT NULL DEFAULT 'system',
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_ali_narratives_tenant
  ON ali_narratives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ali_narratives_deployment
  ON ali_narratives(deployment_id);
CREATE INDEX IF NOT EXISTS idx_ali_narratives_condition
  ON ali_narratives(condition);
CREATE INDEX IF NOT EXISTS idx_ali_narratives_visible
  ON ali_narratives(deployment_id, condition, is_visible)
  WHERE is_visible = TRUE;
CREATE INDEX IF NOT EXISTS idx_ali_narratives_moderation
  ON ali_narratives(moderation_status);
CREATE INDEX IF NOT EXISTS idx_ali_narratives_cluster
  ON ali_narratives(cluster_id);

CREATE INDEX IF NOT EXISTS idx_ali_narrative_tags_narrative
  ON ali_narrative_tags(narrative_id);
CREATE INDEX IF NOT EXISTS idx_ali_narrative_tags_value
  ON ali_narrative_tags(tag_type, tag_value);

CREATE INDEX IF NOT EXISTS idx_ali_narrative_audit_narrative
  ON ali_narrative_audit(narrative_id);

-- ------------------------------------------------------------------
-- Privacy guarantee: refuse identity columns at write time
-- ------------------------------------------------------------------
-- Defense-in-depth: even if someone tries to evolve this table later,
-- the trigger blocks any insert that smells like identity. The trigger
-- runs only against ali_narratives so admin auditing remains free to
-- record actor strings.

CREATE OR REPLACE FUNCTION ali_narrative_block_identity()
RETURNS TRIGGER AS $$
DECLARE
  forbidden_col TEXT;
BEGIN
  FOR forbidden_col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'ali_narratives'
      AND column_name = ANY(ARRAY[
        'respondent_id', 'leader_id', 'contact_id', 'user_id',
        'email', 'ip_address', 'session_id'
      ])
  LOOP
    RAISE EXCEPTION 'ali_narratives must never include identity column %.', forbidden_col;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ali_narrative_block_identity_trigger ON ali_narratives;
CREATE TRIGGER ali_narrative_block_identity_trigger
BEFORE INSERT ON ali_narratives
FOR EACH ROW
EXECUTE FUNCTION ali_narrative_block_identity();

-- ------------------------------------------------------------------
-- Exposure gate helper: counts visible-eligible narratives per
-- (deployment, condition) so application code can apply the
-- N-threshold consistently.
-- ------------------------------------------------------------------

CREATE OR REPLACE VIEW ali_narrative_exposure_counts AS
SELECT
  deployment_id,
  condition,
  COUNT(*) FILTER (WHERE moderation_status = 'approved') AS approved_count,
  COUNT(*) FILTER (WHERE moderation_status = 'approved' AND is_visible) AS visible_count
FROM ali_narratives
GROUP BY deployment_id, condition;

-- ------------------------------------------------------------------
-- Row Level Security scaffolding
-- ------------------------------------------------------------------

ALTER TABLE ali_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_narrative_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_narrative_audit ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------
-- Comments
-- ------------------------------------------------------------------

COMMENT ON TABLE ali_narratives IS
  'Tenant-private qualitative ALI narratives. No respondent identity columns. Exposure gated by moderation_status, is_visible, and the N-threshold enforced by application code.';

COMMENT ON COLUMN ali_narratives.trigger_type IS
  'Why a narrative prompt was offered: dissonance (single-condition stress) or systemic (3+ conditions stressed).';

COMMENT ON COLUMN ali_narratives.condition IS
  'For dissonance triggers, the specific ALI condition the prompt referenced. NULL for systemic triggers.';

COMMENT ON COLUMN ali_narratives.is_visible IS
  'Whether this narrative is visible on the leader dashboard. Flips to TRUE only when moderation is approved AND the per-(deployment, condition) approved_count meets the configured N-threshold.';

COMMENT ON VIEW ali_narrative_exposure_counts IS
  'Per (deployment_id, condition) counts of approved narratives. Used by app code to gate visibility against the N-threshold.';
