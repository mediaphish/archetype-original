# ALI Survey Engine Implementation Plan

## Overview

This document outlines the implementation plan for the ALI Survey Engine, building on the existing Phase 1 infrastructure. All work is **refinement, not a rewrite**.

---

## Phase 1 Status (Completed)

✅ Database schema (companies, divisions, contacts, surveys, deployments, responses)  
✅ API endpoints (signup, contacts, divisions, deploy-survey, submit-response)  
✅ Basic survey structure  

---

## Phase 2: Survey Engine Foundation (Current Phase)

### Step 1: Database Schema Updates

**Files:**
- `ALI_QUESTION_BANK_SCHEMA.sql` - Question bank table with immutability
- `ALI_SURVEY_SNAPSHOT_SCHEMA.sql` - Survey snapshot table with versioning
- `ALI_COMPANIES_BASELINE_UPDATE.sql` - Add baseline_date to companies

**Actions:**
1. Run `ALI_QUESTION_BANK_SCHEMA.sql` in Supabase
2. Run `ALI_SURVEY_SNAPSHOT_SCHEMA.sql` in Supabase
3. Run `ALI_COMPANIES_BASELINE_UPDATE.sql` in Supabase

**Validation:**
- Verify triggers prevent active question updates
- Verify triggers prevent baseline_date changes after first survey
- Verify unique constraints on survey snapshots

---

### Step 2: Question Bank Population

**Task:** Create the initial 70 questions (7 patterns × 10 questions)

**Structure:**
- 7 patterns: clarity, consistency, trust, communication, alignment, stability, leadership_drift
- 10 questions per pattern: 5 leader, 5 team_member
- 3 anchor questions: 1 leader, 1 team, 1 shared
- ~30% negative items (21 questions)

**Metadata Required:**
- `stable_id` (e.g., "Q-CLARITY-001")
- `question_text`
- `pattern`
- `role` (leader/team_member)
- `angle` (intention/experience/gap)
- `lens` (behavioral_alignment/trust_density/communication_clarity)
- `is_negative` (boolean)
- `is_anchor` (boolean)
- `instrument_version` ("v1.0")

**Deliverable:** SQL INSERT statements or migration script

---

### Step 3: Survey Builder Implementation

**File:** `api/ali/build-survey.js` (new endpoint)

**Functionality:**
1. Generate deterministic seed: `hash(client_id + survey_index + instrument_version)`
2. Load question bank (cached)
3. Select 3 anchor questions (deterministic)
4. Select 7 pattern questions (1 per pattern, deterministic)
5. Validate constraints (2-4 negative items)
6. Randomize order (deterministic shuffle)
7. Create immutable survey snapshot
8. Return snapshot ID

**Dependencies:**
- `seedrandom` npm package (or equivalent)
- Question bank populated
- Database schema updated

**Testing:**
- Unit tests: Determinism (same seed → same survey)
- Unit tests: Constraints (always 3 anchors, 7 patterns, 2-4 negatives)
- Integration tests: End-to-end generation
- Load tests: 10,000 surveys

---

### Step 4: Cadence Calculation

**File:** `api/ali/calculate-cadence.js` (helper function)

**Functionality:**
1. Calculate next survey date from `baseline_date`
2. Apply month-end rule (Jan 31 → Apr 30)
3. Return `available_at` timestamp

**Logic:**
```javascript
function calculateNextSurveyDate(baselineDate, surveyIndex) {
  // S1 = baseline_date
  // S2 = baseline_date + 3 months
  // S3 = baseline_date + 6 months
  // S4 = baseline_date + 9 months
  
  const monthsToAdd = (parseInt(surveyIndex.slice(1)) - 1) * 3;
  const targetDate = addMonths(baselineDate, monthsToAdd);
  
  // Month-end rule: If target month lacks baseline day, snap to last day
  return applyMonthEndRule(targetDate, baselineDate);
}
```

---

### Step 5: Update Deploy-Survey Endpoint

**File:** `api/ali/deploy-survey.js` (update existing)

**Changes:**
1. Check for existing survey snapshot (don't regenerate)
2. If no snapshot exists, call builder to generate
3. Create deployment linked to snapshot
4. Set `available_at` based on cadence
5. Return deployment with survey URL

**Backward Compatibility:**
- Keep `survey_id` column (for legacy)
- Prefer `snapshot_id` for new deployments
- Support both paths during transition

---

### Step 6: Immutability Enforcement

**Validation:**
1. Database triggers prevent updates (already in schema)
2. API endpoints reject update requests
3. Audit logging for all generation attempts

**Monitoring:**
- Alert on any update attempt to locked survey
- Alert on baseline_date changes after first survey
- Alert on active question updates

---

## Phase 3: Integration & Testing (Next Phase)

### Step 1: End-to-End Testing

**Scenarios:**
1. New client signup → S1 generation → deployment
2. Existing client → S2 generation (3 months after baseline)
3. Survey submission → response recording
4. Dashboard → results aggregation

### Step 2: Performance Optimization

**Tasks:**
- Question bank caching (in-memory)
- Survey snapshot lookup optimization
- Batch generation for multiple clients
- Connection pooling

### Step 3: Monitoring & Alerts

**Setup:**
- Determinism violation alerts
- Constraint violation alerts
- Generation failure alerts
- Baseline date change alerts

---

## Implementation Order

1. ✅ **Schema Updates** (Step 1)
2. ⏳ **Question Bank Population** (Step 2)
3. ⏳ **Survey Builder** (Step 3)
4. ⏳ **Cadence Calculation** (Step 4)
5. ⏳ **Deploy-Survey Update** (Step 5)
6. ⏳ **Immutability Enforcement** (Step 6)

---

## Risk Mitigation

See `ALI_ENGINEERING_RISKS.md` for detailed risk analysis and mitigations.

**Key Risks:**
- Determinism compromise (non-seed-based randomization)
- Human decision reintroduction (manual overrides)
- Longitudinal comparability (question changes, version drift)

**Mitigations:**
- Database constraints (triggers, unique constraints)
- Code patterns (seed-based PRNG, explicit ordering)
- Monitoring (alerts, audit logs)
- Testing (determinism tests, constraint tests)

---

## Success Criteria

### Phase 2 Complete When:

1. ✅ Question bank populated (70 questions)
2. ✅ Survey builder generates deterministic surveys
3. ✅ All constraints enforced (3 anchors, 7 patterns, 2-4 negatives)
4. ✅ Cadence calculation works (month-end rule)
5. ✅ Immutability enforced (triggers, API validation)
6. ✅ Tests pass (determinism, constraints, immutability)

### System Ready for Production When:

1. ✅ All Phase 2 criteria met
2. ✅ End-to-end tests pass
3. ✅ Performance tests pass (10,000 surveys)
4. ✅ Monitoring and alerts configured
5. ✅ Documentation complete

---

## Files Created

### Schema Files
- `ALI_QUESTION_BANK_SCHEMA.sql` - Question bank with immutability
- `ALI_SURVEY_SNAPSHOT_SCHEMA.sql` - Survey snapshots with versioning
- `ALI_COMPANIES_BASELINE_UPDATE.sql` - Baseline date support

### Documentation Files
- `ALI_BUILDER_LOGIC.md` - Deterministic builder algorithm
- `ALI_ENGINEERING_RISKS.md` - Risk analysis and mitigations
- `ALI_IMPLEMENTATION_PLAN.md` - This file

### Reference Files
- `ALI_SURVEY_FOUNDATION.md` - Survey question foundation (existing)
- `ALI_CHATGPT_REVIEW_FILES.md` - Documentation review list (existing)
- `ALI_SPEC_COMPARISON.md` - Spec comparison (existing)

---

## Next Steps

1. **Review schemas** - Verify SQL syntax and constraints
2. **Populate question bank** - Create 70 questions with metadata
3. **Implement builder** - Build deterministic survey generator
4. **Test thoroughly** - Verify determinism and constraints
5. **Deploy incrementally** - Test in staging before production

---

## Questions to Resolve

1. **Question Bank Source:** Where will the 70 questions come from? (ALI corpus, new creation, combination?)
2. **Instrument Versioning:** How do we handle v1.0 → v1.1 transitions? (New questions, deprecated questions?)
3. **Manual Override:** Should we build override capability at all, or keep it completely disabled?
4. **Testing Strategy:** Unit tests, integration tests, or both? (Recommendation: both)

---

## Notes

- All work is **additive** - existing Phase 1 infrastructure remains intact
- **No breaking changes** - backward compatibility maintained
- **Determinism is non-negotiable** - same seed must always produce same survey
- **Immutability is hard requirement** - surveys never change once generated
- **Scale from day one** - design for millions of respondents

