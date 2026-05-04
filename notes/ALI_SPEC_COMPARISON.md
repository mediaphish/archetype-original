# ALI Spec Comparison: Existing vs. New Requirements

## ✅ What Aligns (No Changes Needed)

### Database Schema - Compatible
- `ali_companies` - ✅ Supports baseline_date (can add column)
- `ali_divisions` - ✅ No changes needed
- `ali_contacts` - ✅ No changes needed
- `ali_survey_deployments` - ✅ Has deployment_token, status, opens_at, closes_at
- `ali_survey_responses` - ✅ Has deployment_id, responses JSONB

### API Endpoints - Compatible
- `/api/ali/signup` - ✅ Creates company (can add baseline_date)
- `/api/ali/contacts` - ✅ No changes needed
- `/api/ali/divisions` - ✅ No changes needed
- `/api/ali/submit-response` - ✅ Works with deployment_token

## ⚠️ What Needs Refinement (Not Breaking, But Requires Additions)

### 1. Question Bank Structure
**Current:** Questions stored in `ali_surveys.questions` (JSONB)
**New Spec:** Requires separate question bank table with metadata

**Gap:** Need to add:
- `ali_question_bank` table (70 questions with metadata)
- Question metadata: stable_id, pattern, role, angle, lens, is_negative, etc.

**Impact:** Schema addition, not breaking change

### 2. Survey Generation Approach
**Current:** `/api/ali/deploy-survey` assumes survey already exists (manual creation)
**New Spec:** Surveys must be generated algorithmically (deterministic builder)

**Gap:** Need to add:
- Survey builder algorithm
- Deterministic selection logic
- Survey composition validation

**Impact:** New endpoint/function, existing endpoint can remain for manual overrides

### 3. Survey Lifecycle Tracking
**Current:** `ali_survey_deployments` has basic status tracking
**New Spec:** Requires survey_index, baseline_date, available_at, sent_at, closed_at

**Gap:** Need to add:
- `survey_index` column (S1, S2, S3...)
- `baseline_date` on companies
- `available_at` on deployments
- Survey cadence calculation logic

**Impact:** Schema additions, not breaking

### 4. Survey Immutability
**Current:** Surveys can be updated (questions JSONB is mutable)
**New Spec:** Surveys must be immutable snapshots

**Gap:** Need to:
- Store generated survey as ordered list of stable_ids
- Prevent updates to deployed surveys
- Version surveys properly

**Impact:** Logic change, schema supports it (just need to enforce immutability)

### 5. Client-Paced Cadence
**Current:** No cadence tracking
**New Spec:** Surveys anchored to baseline_date (not calendar quarters)

**Gap:** Need to add:
- `baseline_date` on companies
- Cadence calculation: S1 → baseline, S2 → baseline + 3 months, etc.
- Month-end rule logic

**Impact:** New logic, schema additions needed

## 🔧 Required Schema Additions

### New Tables Needed:
1. **`ali_question_bank`** - The 70 questions with metadata
2. **`ali_generated_surveys`** - Immutable survey snapshots (optional, could use existing ali_surveys)

### New Columns Needed:
1. **`ali_companies.baseline_date`** - When S1 was sent
2. **`ali_survey_deployments.survey_index`** - S1, S2, S3...
3. **`ali_survey_deployments.available_at`** - When survey becomes available
4. **`ali_survey_deployments.instrument_version`** - v1.0, v1.1, etc.

## 📊 Summary

**Status:** ✅ **Refinement, Not Breaking**

The new spec:
- **Adds structure** to question management (question bank)
- **Adds automation** to survey generation (deterministic builder)
- **Adds tracking** for cadence and lifecycle (baseline_date, survey_index)
- **Adds discipline** to survey composition (anchors, negatives, constraints)

**What we built is compatible** - it just needs:
1. Schema additions (question bank, baseline_date, survey_index)
2. New survey builder algorithm
3. Cadence calculation logic
4. Immutability enforcement

**No breaking changes** - existing endpoints and schema remain valid. We're adding layers on top.

