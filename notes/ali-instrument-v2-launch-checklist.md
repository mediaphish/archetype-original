# ALI Instrument v2.0 Pilot Launch Checklist

This is the definition-of-done for putting v2.0 in front of pilot respondents. Every item below should be checkable before the first deployment is opened. The corresponding artifact is listed beside each item so checking is concrete, not vibes.

## 1. Schema and bank

- [ ] `database/ALI_INSTRUMENT_V2_SCHEMA.sql` applied to the production database (adds `construct_id`, `equivalence_note`, `lineage_source_ids`, `lineage_action`, `response_scale`, indexes, paired-coverage view, and `ali_v2_unpaired_constructs()` function).
- [ ] `database/ALI_NARRATIVE_SCHEMA.sql` applied (adds `ali_narratives`, `ali_narrative_tags`, `ali_narrative_audit`, identity-block trigger, exposure counts view).
- [ ] Curated v2.0 question bank populated via `node scripts/ali/curate-instrument.mjs --plan` → reviewed CSV → `--apply --confirm`.
- [ ] `node scripts/ali/curate-instrument.mjs --verify` returns "All active v2.0 constructs are paired with matching scales."
- [ ] `database/ALI_INSTRUMENT_V2_CUTOVER.sql` applied (residual v1.x items deprecated with lineage reason).

## 2. Doctrine and validation

- [ ] `database/ALI_SURVEY_FOUNDATION.md` includes the "v2.0 Paired Architecture (Pilot)" section and matches what the bank does in production.
- [ ] `database/ALI_SCORING_IMPLEMENTATION_NOTES.md` includes the "v2.0 Paired Scoring (Instrument v2.0)" section.
- [ ] `notes/ali-instrument-v2-validation.md` references at least one completed say-back round.
- [ ] `notes/ali-instrument-v2-validation-audit.md` regenerated via `node scripts/ali/audit-instrument-v2.mjs --out notes/ali-instrument-v2-validation-audit.md` with zero readability flags, zero scale mismatches, zero pairing issues.

## 3. Delivery

- [ ] `api/ali/build-survey.js` selects 10 paired constructs with 3 anchors when `instrument_version='v2.0'` (exercised via the synthetic test or a real `POST /api/ali/build-survey`).
- [ ] `api/ali/survey/[token].js` renders role-matched stems in identical construct order (use `?role=leader` and `?role=team_member` against a v2.0 deployment to verify).
- [ ] `api/ali/deploy-survey.js` defaults to `v2.0` (or the `ALI_DEFAULT_INSTRUMENT_VERSION` env var matches the pilot version).

## 4. Scoring

- [ ] Dashboard payload contains a non-null `pairedScoring` block when v2.0 responses exist.
- [ ] `pairedScoring.constructs` and `pairedScoring.conditionMirror` produce per-construct and per-condition Mirror gaps with the math documented in `ALI_SCORING_IMPLEMENTATION_NOTES.md`.
- [ ] `pairedScoring.anchorTrajectory` lists points for each anchor `construct_id` once at least one deployment has both leader and team responses.

## 5. Narratives

- [ ] `lib/ali-narrative-triggers.js` is wired into `api/ali/submit-response.js` and emits at most one prompt per submission, dissonance preferred when both fire (verified by `node scripts/ali/synthetic-pilot-test.mjs`).
- [ ] `api/ali/narrative/submit.js` accepts deployment-token-only payloads, applies de-id, and stores narratives without identity columns.
- [ ] `api/ali/narrative/admin/queue.js`, `moderate.js`, `clusters.js`, and `expose.js` are reachable for super admins and only super admins.
- [ ] `lib/ali-narrative-privacy.js` thresholds match `notes/ali-narrative-privacy.md` (default N=3, small-tenant min=8).

## 6. Synthetic test pass

- [ ] `node scripts/ali/synthetic-pilot-test.mjs` exits 0.
  - Trigger engine: calm → no prompt; dissonance → dissonance prompt; systemic → systemic prompt; leader role → no prompt.
  - Paired Mirror math: per-construct gap, per-condition gap, overall gap match expected values.
  - Privacy gate: small-tenant blocks; N-threshold blocks; thresholds-met allows.
  - Paired survey builder: 10 constructs, 3 anchors, 7 patterns, deterministic per `(tenant, surveyIndex, version)`.

## 7. Pilot bookkeeping

- [ ] All pilot deployments created post-cutover carry `instrument_version='v2.0'`.
- [ ] No active v1.x items remain in `ali_question_bank`.
- [ ] BLP storage and surfaces are unchanged; ALI narratives never leak into BLP queries.

When all items above are checked, sign off below with the date.

> Pilot launch sign-off: ____________________ (date __________)
