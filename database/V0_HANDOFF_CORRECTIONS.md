# V0 Handoff Prompt - Critical Corrections Needed

## Context
V0 created an excellent handoff prompt for backend implementation. However, several sections don't match our **locked specifications** and **existing implementation**. These corrections are critical to ensure the backend aligns with our ALI Scoring Model v1.0 and existing database schema.

---

## 🔴 CRITICAL CORRECTIONS REQUIRED

### 1. ALI Overall Score Calculation (CRITICAL)

**V0's Prompt Says:**
```typescript
// 30% from Anchors (Clarity + Consistency)
const anchorScore = (clarity + consistency) / 2

// 70% from Patterns (average of 7)
const patternScore = (clarity + consistency + trust + communication + alignment + stability + leadership_drift) / 7

// Combined
const aliOverall = (0.30 * anchorScore) + (0.70 * patternScore)
```

**Our Locked Spec (ALI Scoring Model v1.0):**
We already have `lib/ali-scoring.js` implemented with the correct formula:

```javascript
// Anchor Score = Average of all anchor question responses (normalized 0-100)
const anchorScore = calculateAnchorScore(responses, questionBank)

// Pattern Score = Average of all 7 pattern scores (each pattern is average of its questions)
const patternScore = calculatePatternScore(responses, questionBank)

// ALI Overall = Weighted combination (exact weights defined in spec)
const aliOverall = calculateALIScore(anchorScore, patternScore)
```

**Fix Required:**
- **DO NOT** implement the simplified formula V0 provided
- **USE** the existing `lib/ali-scoring.js` functions
- The calculation is more complex and handles:
  - Reverse scoring for negative questions
  - Normalization to 0-100 scale
  - Proper anchor question identification
  - Pattern-specific question grouping

**Action:** Reference `lib/ali-scoring.js` for all score calculations.

---

### 2. Database Schema (CRITICAL)

**V0's Prompt Says:**
```
Tables Needed:
- users
- surveys
- responses
- response_answers
- questions
```

**Our Existing Schema (Already Deployed):**
We already have Phase 1 & 2 schemas in Supabase:
- `ali_companies` (not `users`)
- `ali_contacts` (user accounts linked to companies)
- `ali_divisions` (organizational divisions)
- `ali_survey_deployments` (not `surveys`)
- `ali_survey_responses` (not `responses`)
- `ali_survey_snapshots` (immutable survey definitions)
- `ali_question_bank` (immutable question repository)
- `ali_applications` (pilot program applications)

**Fix Required:**
- **DO NOT** create new tables
- **USE** existing schema from `database/ALI_PHASE1_SCHEMA_COMPLETE.sql` and `database/ALI_PHASE2_SCHEMA_COMPLETE.sql`
- Map V0's expected structure to our actual schema:
  - `users` → `ali_contacts` (with `ali_companies` relationship)
  - `surveys` → `ali_survey_deployments` (with `ali_survey_snapshots`)
  - `responses` → `ali_survey_responses`
  - `questions` → `ali_question_bank`

**Action:** Review existing schema files and map API responses to actual database structure.

---

### 3. Trajectory Calculation (CRITICAL)

**V0's Prompt Says:**
```typescript
// Trajectory Calculation (qoq_delta method)
const change = currentScore - previousScore
let direction: 'up' | 'down' | 'stable'
if (change > 2) direction = 'up'
else if (change < -2) direction = 'down'
else direction = 'stable'
return {
  direction,
  change: Math.abs(change),
  method: 'qoq_delta'
}
```

**Our Locked Spec:**
- **Primary method:** `DriftIndex` (preferred, more stable)
- **Fallback method:** `qoq_delta` (only if DriftIndex is null/unavailable)
- We already have `calculateDriftIndex()` in `lib/ali-scoring.js`

**Fix Required:**
```typescript
// Use DriftIndex if available (preferred)
const driftIndex = calculateDriftIndex(surveys) // From lib/ali-scoring.js

if (driftIndex !== null) {
  return {
    value: driftIndex,
    direction: driftIndex > 0 ? 'improving' : driftIndex < 0 ? 'declining' : 'stable',
    magnitude: Math.abs(driftIndex),
    method: 'drift_index'
  }
} else {
  // Fallback to qoq_delta only if DriftIndex unavailable
  const change = currentScore - previousScore
  return {
    value: change,
    direction: change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable',
    magnitude: Math.abs(change),
    method: 'qoq_delta'
  }
}
```

**Action:** Use `lib/ali-scoring.js` functions, prefer DriftIndex over qoq_delta.

---

### 4. Zone Classification (CLARIFICATION NEEDED)

**V0's Prompt Says:**
```typescript
function getZone(score: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (score >= 75) return 'green'   // Thriving
  if (score >= 60) return 'yellow'  // Developing
  if (score >= 45) return 'orange'  // Concerning
  return 'red'                       // Critical
}
```

**Our Spec:**
- **Score Cards:** May use 75/60/45 thresholds (UI-only, for visual distinction)
- **Team Experience Map:** Uses 70/70 thresholds (locked spec):
  - Harmony: X ≥ 70 AND Y ≥ 70
  - Strain: X < 70 AND Y ≥ 70
  - Stress: X < 70 AND Y < 70
  - Hazard: X ≥ 70 AND Y < 70

**Fix Required:**
- Use 75/60/45 for **score card zones** (UI display)
- Use 70/70 logic for **Team Experience Map** (locked calculation)
- We already have `classifyZone()` in `lib/ali-dashboard-calculations.js`

**Action:** Use existing zone classification functions from our libraries.

---

### 5. Question Seed Data (CRITICAL)

**V0's Prompt Says:**
```
You need to create 10 questions total:
- 2 Anchor questions (Clarity, Consistency with is_anchor: true)
- 7 Pattern questions (one per pattern)
- 1 Leadership Drift question
```

**Our Existing Implementation:**
- We already have **70 questions** in `ali_question_bank` (7 patterns × 10 questions each)
- Questions are selected deterministically via `lib/ali-survey-builder.js`
- Surveys are immutable snapshots stored in `ali_survey_snapshots`
- **DO NOT** create 10 static questions

**Fix Required:**
- **DO NOT** seed 10 questions
- **USE** existing `ali_question_bank` (already populated)
- **USE** `lib/ali-survey-builder.js` to generate surveys
- **USE** `api/ali/build-survey.js` endpoint (already exists)

**Action:** Reference existing question bank and survey builder logic.

---

### 6. Survey Index Format (CORRECT)

**V0's Prompt Says:**
```typescript
type SurveyIndex = "S1" | "S2" | "S3" | "S4"
```

**Status:** ✅ **CORRECT** - This matches our spec.

---

### 7. Minimum N Thresholds (CORRECT)

**V0's Prompt Says:**
```
- Team level: 5 responses minimum
- Org level: 10 responses minimum
```

**Status:** ✅ **CORRECT** - This matches our locked spec.

---

### 8. Score Calculation Scale (CORRECT)

**V0's Prompt Says:**
```typescript
// User selects 1-5, convert to 0-100
score = (response - 1) * 25
```

**Status:** ✅ **CORRECT** - This matches our normalization function in `lib/ali-scoring.js`.

---

## ✅ What V0 Got Right

1. ✅ Survey Index Format ("S1", "S2", etc.)
2. ✅ Minimum N Thresholds (5 team, 10 org)
3. ✅ Score Scale (0-100 from 1-5 Likert)
4. ✅ Reverse Scoring Logic
5. ✅ API Endpoint Structure
6. ✅ Authentication Flow
7. ✅ Route Protection

---

## 📋 Implementation Strategy

### Phase 1: Map V0's Expectations to Our Schema

**Instead of creating new tables, map:**

1. **Authentication:**
   - V0 expects: `users` table
   - We have: `ali_contacts` + `ali_companies`
   - **Action:** Use existing `api/ali/signup.js` and `api/ali/contacts.js`

2. **Surveys:**
   - V0 expects: `surveys` table
   - We have: `ali_survey_deployments` + `ali_survey_snapshots`
   - **Action:** Use existing `api/ali/deploy-survey.js` and `api/ali/build-survey.js`

3. **Responses:**
   - V0 expects: `responses` + `response_answers` tables
   - We have: `ali_survey_responses` (single table with JSON answers)
   - **Action:** Use existing `api/ali/submit-response.js`

4. **Questions:**
   - V0 expects: `questions` table with 10 seed questions
   - We have: `ali_question_bank` with 70 questions
   - **Action:** Use existing question bank, no seeding needed

### Phase 2: Use Existing Libraries

**DO NOT reimplement:**
- ❌ Score calculations (use `lib/ali-scoring.js`)
- ❌ Survey building (use `lib/ali-survey-builder.js`)
- ❌ Cadence calculations (use `lib/ali-cadence.js`)
- ❌ Dashboard calculations (use `lib/ali-dashboard-calculations.js`)

**DO use:**
- ✅ Existing API endpoints as reference
- ✅ Existing database schema
- ✅ Existing scoring functions

### Phase 3: API Endpoint Implementation

**V0's Expected Endpoints:**
1. `GET /api/ali/survey/[token]` - ✅ Already exists (`api/ali/submit-response.js` handles this)
2. `POST /api/ali/survey/[token]/submit` - ✅ Already exists (`api/ali/submit-response.js`)
3. `GET /api/ali/dashboard` - ❌ **NEEDS TO BE CREATED** (use `lib/ali-scoring.js` and `lib/ali-dashboard-calculations.js`)
4. `GET /api/ali/deploy/next` - ✅ Logic exists in `api/ali/deploy-survey.js`
5. `POST /api/ali/deploy/generate` - ✅ Already exists (`api/ali/deploy-survey.js`)
6. `GET /api/ali/reports` - ❌ **NEEDS TO BE CREATED**
7. `POST /api/ali/auth/login` - ❌ **NEEDS TO BE CREATED** (map to `ali_contacts`)
8. `POST /api/ali/auth/signup` - ✅ Already exists (`api/ali/signup.js`)
9. `GET /api/ali/billing` - ❌ **NEEDS TO BE CREATED**

---

## 🎯 Corrected Implementation Checklist

### Phase 1: Database & Auth (Use Existing)
- [x] ~~Create Supabase tables~~ - **Already exists**
- [x] ~~Seed questions table~~ - **Already populated (70 questions)**
- [ ] **Map authentication to `ali_contacts`** (not `users`)
- [ ] **Create auth middleware** for route protection
- [ ] **Set up session management** (JWT or cookies)

### Phase 2: Survey Flow (Use Existing)
- [x] ~~Implement `GET /api/ali/survey/[token]`~~ - **Already exists**
- [x] ~~Implement `POST /api/ali/survey/[token]/submit`~~ - **Already exists**
- [ ] **Verify reverse scoring** uses `lib/ali-scoring.js`
- [ ] **Verify survey snapshots** are used (not static questions)

### Phase 3: Dashboard API (Create New)
- [ ] **Implement `GET /api/ali/dashboard`**
  - Use `lib/ali-scoring.js` for all calculations
  - Use `lib/ali-dashboard-calculations.js` for dashboard-specific logic
  - Query `ali_survey_responses` (not `responses` table)
  - Apply data quality gating (5 team, 10 org)
  - Use DriftIndex (preferred) with qoq_delta fallback
  - Return complete DashboardData structure matching V0's TypeScript interface

### Phase 4: Deploy & Reports (Use Existing + Create)
- [x] ~~Implement `GET /api/ali/deploy/next`~~ - **Logic exists**
- [x] ~~Implement `POST /api/ali/deploy/generate`~~ - **Already exists**
- [ ] **Implement `GET /api/ali/reports`**
  - Query historical data from `ali_survey_responses`
  - Calculate rolling averages using `lib/ali-scoring.js`
  - Return multi-year trend data

### Phase 5: Billing (Create New)
- [ ] **Set up Stripe integration**
- [ ] **Create subscription checkout flow**
- [ ] **Implement discount code system**
- [ ] **Generate PDF invoices**

---

## 📝 Key Files to Reference

**Existing Implementation:**
- `lib/ali-scoring.js` - All score calculations
- `lib/ali-dashboard-calculations.js` - Dashboard-specific calculations
- `lib/ali-survey-builder.js` - Deterministic survey generation
- `lib/ali-cadence.js` - Survey cadence calculations
- `api/ali/deploy-survey.js` - Survey deployment
- `api/ali/submit-response.js` - Response submission
- `api/ali/build-survey.js` - Survey snapshot generation
- `database/ALI_PHASE1_SCHEMA_COMPLETE.sql` - Database schema
- `database/ALI_PHASE2_SCHEMA_COMPLETE.sql` - Phase 2 additions
- `database/ALI_DASHBOARD_SPEC_LOCKED.md` - Locked specifications

**V0's UI Components (Ready):**
- `app/ali/survey/[token]/page.tsx` - Survey taking
- `app/ali/dashboard` - Dashboard
- `app/ali/deploy-demo` - Deploy page
- `types/ali.ts` - TypeScript interfaces (may need updates)

---

## ⚠️ Critical Warnings

1. **DO NOT** implement simplified ALI score formula - use `lib/ali-scoring.js`
2. **DO NOT** create new database tables - use existing schema
3. **DO NOT** seed 10 questions - use existing `ali_question_bank` (70 questions)
4. **DO NOT** use qoq_delta only - prefer DriftIndex with fallback
5. **DO** reference existing API endpoints and libraries
6. **DO** map V0's expected structure to our actual schema

---

## 🎯 Summary

**V0's Handoff Quality:** Excellent structure and clarity.

**Critical Corrections:**
1. Use existing `lib/ali-scoring.js` (don't implement simplified formula)
2. Use existing database schema (don't create new tables)
3. Use existing question bank (don't seed 10 questions)
4. Prefer DriftIndex over qoq_delta for trajectory
5. Map V0's expected structure to our actual implementation

**What Needs to Be Built:**
- `GET /api/ali/dashboard` - Main dashboard API
- `GET /api/ali/reports` - Historical reports API
- `POST /api/ali/auth/login` - Authentication (map to `ali_contacts`)
- `GET /api/ali/billing` - Billing/subscription API
- Auth middleware for route protection

**What Already Exists:**
- All scoring calculations
- Survey building and deployment
- Response submission
- Database schema
- Question bank (70 questions)

Once these corrections are applied, the implementation will align perfectly with our locked specifications and existing codebase.

