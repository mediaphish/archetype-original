-- ============================================
-- ALI Instrument v2.0 Cutover (residual deprecation)
-- ============================================
-- Run this AFTER scripts/ali/curate-instrument.mjs --apply has populated v2.0
-- and after `notes/ali-instrument-v2-validation.md` has confirmed paired
-- coverage is launch-clean.
--
-- The curation script already deprecates the v1.x items it specifically
-- replaces (via lineage_source_ids). This migration handles two residual
-- cases:
--
--   1. v1.x items still 'active' that were not picked up by the curation
--      pass (because their idea was retired, not migrated). They should be
--      'deprecated' with a clear reason so the deterministic builder can
--      never select them again.
--   2. Pilot deployments that were created before v2.0 was the default
--      and need a documented record that v2.0 is the new instrument.
--
-- Both blocks are idempotent and safe to re-run.
-- ============================================

-- ------------------------------------------------------------------
-- 1. Deprecate any remaining v1.x active items.
-- ------------------------------------------------------------------
-- The reason text is intentionally short and consistent so analysts
-- can tell at a glance what happened.

UPDATE ali_question_bank
   SET status = 'deprecated',
       deprecated_reason = COALESCE(
         deprecated_reason,
         'replaced in instrument v2.0; lineage preserved'
       )
 WHERE status = 'active'
   AND (instrument_version = 'v1.0' OR instrument_version LIKE 'v1.%');

-- ------------------------------------------------------------------
-- 2. Confirm v2.0 is launch-clean before any new deployment.
-- ------------------------------------------------------------------
-- This block only RAISEs NOTICE. It does not gate the migration; it
-- prints a list of unpaired or scale-mismatched constructs that
-- launch must resolve first. Run scripts/ali/curate-instrument.mjs
-- --verify for the same information from the command line.

DO $$
DECLARE
  unpaired_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unpaired_count FROM ali_v2_unpaired_constructs();
  IF unpaired_count > 0 THEN
    RAISE NOTICE
      'ALI v2.0 cutover note: % construct(s) are unpaired or have mismatched response scales. Run scripts/ali/curate-instrument.mjs --verify to list them. Pilot deployment is blocked until this is zero.',
      unpaired_count;
  ELSE
    RAISE NOTICE 'ALI v2.0 cutover note: all active v2.0 constructs are paired and scale-matched.';
  END IF;
END $$;

-- ------------------------------------------------------------------
-- 3. Document v2.0 as the active pilot instrument
-- ------------------------------------------------------------------
-- Application-side default lives in api/ali/deploy-survey.js
-- (DEFAULT_INSTRUMENT_VERSION). New deployments created via that
-- endpoint are tagged 'v2.0' automatically. Existing deployments
-- keep their original instrument_version so longitudinal comparison
-- remains honest.
