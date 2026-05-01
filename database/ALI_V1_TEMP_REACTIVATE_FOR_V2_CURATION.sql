-- ============================================================
-- TEMPORARY recovery — only if cutover ran before v2 rows exist
-- ============================================================
-- Symptom: `node scripts/ali/curate-instrument.mjs --plan` prints
-- "Question bank has no active items to curate" but you still have
-- deprecated v1.x rows you intended to mine for v2.0.
--
-- Run this once in Supabase SQL Editor, then run --plan again.
-- After `curate-instrument.mjs --apply` succeeds, v1.x sources are
-- deprecated again with lineage reasons — do not re-run this unless
-- you are repeating the migration from scratch.
-- ============================================================

UPDATE ali_question_bank
SET
  status = 'active',
  deprecated_at = NULL,
  deprecated_reason = NULL
WHERE status = 'deprecated'
  AND (instrument_version = 'v1.0' OR instrument_version LIKE 'v1.%')
  AND (
    deprecated_reason ILIKE '%replaced in instrument v2.0%'
    OR deprecated_reason ILIKE '%superseded%'
  );
