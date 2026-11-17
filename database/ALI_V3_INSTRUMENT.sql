-- ALI instrument v3 (conditions v3, approved 2026-11-16). Milestone 1 schema.
--
-- Apply this file first, then database/ALI_V3_BANK_SEED.sql.
-- Safe to run more than once. Deletes nothing. Old v1/v2 test data stays readable.
--
-- What it adds:
--   ali_v3_items            the v3 question bank (seeded from lib/ali-v3-bank.js)
--   ali_v3_rounds           one frozen item list per company round
--   ali_v3_submission_keys  one-way fingerprints of browser submission ids (duplicate guard)
--   ali_survey_deployments  + instrument_version, leader_token, v3_round_id, round_number
--   ali_survey_responses    + instrument_version, and one leader answer per v3 round
--   ali_question_bank       old active rows marked deprecated (rows kept)
--
-- Row level security is on for every new table with no policies and no grants
-- to anon/authenticated, so only the service role (server code) can read or write.

BEGIN;

-- 1. v3 item bank ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ali_v3_items (
  stable_id          TEXT PRIMARY KEY,                -- v3.<idea>.<version>, e.g. v3.clarity.1.A
  instrument_version TEXT NOT NULL DEFAULT 'v3.0',
  idea_id            TEXT NOT NULL,                   -- e.g. clarity.1, voice.t1
  idea_label         TEXT NOT NULL,
  condition          TEXT NOT NULL CHECK (condition IN (
                       'clarity','consistency','accountability','voice','growth','support','alignment',
                       'trust','commitment')),
  kind               TEXT NOT NULL CHECK (kind IN ('condition','result')),
  version            TEXT NOT NULL CHECK (version IN ('A','B','C','D')),
  team_text          TEXT NOT NULL,
  leader_text        TEXT NOT NULL,
  is_reversed        BOOLEAN NOT NULL DEFAULT FALSE,
  is_trial           BOOLEAN NOT NULL DEFAULT FALSE,
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','retired')),
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (instrument_version, idea_id, version)
);
CREATE INDEX IF NOT EXISTS idx_ali_v3_items_idea ON ali_v3_items (idea_id);

-- 2. v3 rounds (frozen item list per company round) --------------------------
CREATE TABLE IF NOT EXISTS ali_v3_rounds (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         UUID NOT NULL REFERENCES ali_companies(id) ON DELETE CASCADE,
  round_number       INTEGER NOT NULL CHECK (round_number >= 1),
  instrument_version TEXT NOT NULL DEFAULT 'v3.0',
  seed               TEXT NOT NULL,
  items              JSONB NOT NULL,                  -- [{stable_id, idea_id, condition, kind, version, team_text, leader_text, is_reversed, is_trial, order}]
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, round_number),
  CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) = 18)
);

-- 3. Deployments: v3 columns -------------------------------------------------
ALTER TABLE ali_survey_deployments ADD COLUMN IF NOT EXISTS instrument_version TEXT;
ALTER TABLE ali_survey_deployments ADD COLUMN IF NOT EXISTS leader_token TEXT;
ALTER TABLE ali_survey_deployments ADD COLUMN IF NOT EXISTS v3_round_id UUID REFERENCES ali_v3_rounds(id) ON DELETE SET NULL;
ALTER TABLE ali_survey_deployments ADD COLUMN IF NOT EXISTS round_number INTEGER;
ALTER TABLE ali_survey_deployments ALTER COLUMN snapshot_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ali_deployments_leader_token
  ON ali_survey_deployments (leader_token) WHERE leader_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ali_deployments_company_version
  ON ali_survey_deployments (company_id, instrument_version);

-- Record the instrument on old deployments too, read from their snapshot (no data changes otherwise).
UPDATE ali_survey_deployments d
   SET instrument_version = s.instrument_version
  FROM ali_survey_snapshots s
 WHERE d.snapshot_id = s.id
   AND d.instrument_version IS NULL;

-- 4. Responses: instrument and one leader answer per v3 round ---------------
ALTER TABLE ali_survey_responses ADD COLUMN IF NOT EXISTS instrument_version TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ali_responses_one_leader_v3
  ON ali_survey_responses (deployment_id)
  WHERE respondent_role = 'leader' AND instrument_version = 'v3.0';

-- 5. Duplicate guard: one-way fingerprint of the browser's random submission id.
--    No timestamp, no address, and no link to the answer row.
CREATE TABLE IF NOT EXISTS ali_v3_submission_keys (
  deployment_id UUID NOT NULL REFERENCES ali_survey_deployments(id) ON DELETE CASCADE,
  key_hash      TEXT NOT NULL,
  PRIMARY KEY (deployment_id, key_hash)
);

-- 6. Retire the old question bank rows (kept for reading old test data) ----
UPDATE ali_question_bank
   SET status = 'deprecated',
       deprecated_at = NOW(),
       deprecated_reason = 'Replaced by instrument v3 (conditions v3, approved 2026-11-16). See ali_v3_items.'
 WHERE status = 'active';

-- 7. Lock down the new tables ----------------------------------------------
ALTER TABLE ali_v3_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_v3_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ali_v3_submission_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ali_v3_items FROM anon, authenticated;
REVOKE ALL ON ali_v3_rounds FROM anon, authenticated;
REVOKE ALL ON ali_v3_submission_keys FROM anon, authenticated;

COMMIT;

-- Check after applying:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'ali_survey_deployments'
--      AND column_name IN ('instrument_version','leader_token','v3_round_id','round_number');
--   SELECT relname, relrowsecurity FROM pg_class
--    WHERE relname IN ('ali_v3_items','ali_v3_rounds','ali_v3_submission_keys');
