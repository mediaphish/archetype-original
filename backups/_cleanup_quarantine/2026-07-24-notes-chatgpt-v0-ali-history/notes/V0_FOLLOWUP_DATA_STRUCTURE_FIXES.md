# V0 Follow-Up: Data Structure Alignment Fixes

## Context
Your response was excellent and answered all our questions perfectly! However, we need to align the TypeScript interfaces with our exact backend API contract. These are critical fixes to ensure the UI matches what the backend actually returns.

---

## 🔴 CRITICAL FIXES REQUIRED

### 1. Minimum N Threshold (CRITICAL)

**Current V0 Code:**
```typescript
// Line 127, 208
minimum_required: 3
"Insufficient data (need 3+ responses)"
```

**Our Locked Spec:**
- **Team-level minimum:** ≥5 responses
- **Org-level minimum:** ≥10 responses (preferred)
- **Data quality banner:** Shows when 5-9 responses (suppress zones/profiles)
- **Full dashboard:** Enabled at ≥10 responses

**Fix Required:**
```typescript
// Update data_quality interface:
data_quality: {
  sufficient: boolean
  response_count: number
  meets_minimum_n_team: boolean  // ≥5 responses
  meets_minimum_n_org: boolean   // ≥10 responses
  data_quality_banner: boolean   // true if 5-9 responses
}

// Update error message:
"Insufficient data (need 5+ responses for team-level, 10+ for org-level)"
```

---

### 2. Survey Index Format (CRITICAL)

**Current V0 Code:**
```typescript
// Line 89
survey_number: 1 | 2 | 3 | 4
```

**Our API Contract:**
```typescript
survey_index: "S1" | "S2" | "S3" | "S4"  // String format, not number
```

**Fix Required:**
```typescript
interface SurveyData {
  id: string
  survey_index: "S1" | "S2" | "S3" | "S4"  // ✅ Changed from survey_number
  // Remove: year, quarter (not in our API contract)
  // Use: available_at, closes_at (date strings) instead
  status: 'not_started' | 'active' | 'completed'
  deployed_at: string | null
  closes_at: string | null
  available_at: string | null  // ✅ Add this
  response_count: number
  target_count: number
  completion_rate: number
  survey_link: string | null
  current_score: ScoreData | null
  rolling_score: ScoreData | null
}
```

**Also Update:**
```typescript
// Line 157, 170, 178 - Update references:
const nextSurvey = determineNextSurvey({
  lastCompletedSurvey: 'S1',  // ✅ Already correct (string)
  // ...
})

await createSurveyDeployment({
  survey_index: nextSurvey,  // ✅ Changed from survey_number
  // ...
})

return { link, survey_index: nextSurvey }  // ✅ Changed from survey_number
```

---

### 3. Missing API Fields (CRITICAL)

**Current V0 Interface Missing:**

```typescript
interface ScoreData {
  overall: number
  zone: 'green' | 'yellow' | 'orange' | 'red'  // ✅ You have this
  anchors: {
    current: number,  // ✅ Add this
    rolling: number   // ✅ Add this
  }
  patterns: {
    // ✅ You have all patterns
  }
  trajectory: {
    direction: 'up' | 'down' | 'stable'
    change: number
    method: 'drift_index' | 'qoq_delta'  // ❌ You have 'simple_comparison'
  }
  // ❌ Missing: coreScores
  // ❌ Missing: experienceMap
  // ❌ Missing: leadershipProfile.honesty.gap_component_used
  // ❌ Missing: responseCounts (separate leader/team_member counts)
}
```

**Fix Required - Complete Interface:**

```typescript
interface DashboardData {
  company: {
    id: string
    name: string
    subscription_status: "active" | "trial" | "past_due" | "canceled"
  }
  scores: {
    ali: {
      current: number      // REQUIRED
      rolling: number      // REQUIRED
      zone: "green" | "yellow" | "orange" | "red"  // REQUIRED
    }
    anchors: {
      current: number     // REQUIRED
      rolling: number      // REQUIRED
    }
    patterns: {
      clarity: { current: number, rolling: number }
      consistency: { current: number, rolling: number }
      trust: { current: number, rolling: number }
      communication: { current: number, rolling: number }
      alignment: { current: number, rolling: number }
      stability: { current: number, rolling: number }
      leadership_drift: { current: number, rolling: number }
    }
  }
  coreScores: {  // ✅ ADD THIS - separate from patterns
    alignment: number    // PatternRolling(alignment)
    stability: number    // PatternRolling(stability)
    clarity: number      // PatternRolling(clarity)
  }
  experienceMap: {  // ✅ ADD THIS
    x: number           // Rolling Clarity
    y: number           // (Rolling Stability + Rolling Trust) / 2
    zone: "harmony" | "strain" | "stress" | "hazard"
  }
  leadershipProfile: {  // ✅ UPDATE THIS
    profile: "guardian" | "aspirer" | "protector" | "producer_leader" | "stabilizer" | "operator" | "profile_forming"
    honesty: {
      score: number
      state: "courageous" | "selective" | "protective"
      gap_component_used: boolean  // ✅ ADD THIS - indicates if Gap_Trust was used
    }
    clarity: {
      level: number
      stddev: number      // Standard deviation (not variance)
      state: "high" | "unstable" | "ambiguous"
    }
  }
  leadershipMirror: {
    gaps: {
      ali: number
      alignment: number
      stability: number
      clarity: number
    }
    severity: {
      ali: "neutral" | "caution" | "critical"
      alignment: "neutral" | "caution" | "critical"
      stability: "neutral" | "caution" | "critical"
      clarity: "neutral" | "caution" | "critical"
    }
    leaderScores: {
      ali: number
      alignment: number
      stability: number
      clarity: number
    }
    teamScores: {
      ali: number
      alignment: number
      stability: number
      clarity: number
    }
  }
  drift: {
    delta_ali: number     // Quarter-over-quarter change
    drift_index: number | null  // Mean of recent deltas, null if insufficient
  }
  trajectory: {
    value: number         // DriftIndex or QoQ delta
    direction: "improving" | "stable" | "declining"
    magnitude: number
    method: "drift_index" | "qoq_delta"  // ✅ FIX: Change from 'simple_comparison'
  }
  responseCounts: {  // ✅ ADD THIS - separate counts
    overall: number       // Total responses
    leader: number       // Leader role responses
    team_member: number  // Team member role responses
  }
  dataQuality: {  // ✅ UPDATE THIS
    meets_minimum_n: boolean        // Overall meets threshold (≥5)
    meets_minimum_n_team: boolean   // Team-level (≥5)
    meets_minimum_n_org: boolean    // Org-level (≥10)
    response_count: number
    standard_deviation: number
    data_quality_banner: boolean    // true if 5-9 responses
  }
  historicalTrends: Array<{
    period: string
    ali: number
    alignment: number
    stability: number
    clarity: number
  }>
  deployments: Array<{
    id: string
    survey_index: "S1" | "S2" | "S3" | "S4"
    token: string
    deployed_at: string
    closes_at: string | null
    response_count: number
    status: "active" | "closed"
  }>
}
```

---

### 4. Zone Color Thresholds (CLARIFICATION NEEDED)

**V0's Function:**
```typescript
// Line 191-194
if (score >= 75) return 'green'
if (score >= 60) return 'yellow'
if (score >= 45) return 'orange'
return 'red'
```

**Our Team Experience Map Uses:**
- Harmony: X ≥ 70 AND Y ≥ 70 (Green)
- Strain: X < 70 AND Y ≥ 70 (Yellow)
- Stress: X < 70 AND Y < 70 (Orange)
- Hazard: X ≥ 70 AND Y < 70 (Red)

**Question:** Are score card zones (75/60/45) intentionally different from Experience Map zones (70/70)?

**If Yes:** Keep both - score cards use 75/60/45, Experience Map uses 70/70 logic.

**If No:** Align both to use 70/70 thresholds.

**Our Recommendation:** Keep them different - score cards can have their own thresholds for visual distinction, while Experience Map uses the locked 70/70 logic. Just confirm this is intentional.

---

### 5. Trajectory Method Field (CRITICAL)

**Current V0 Code:**
```typescript
// Line 122
method: 'drift_index' | 'simple_comparison'  // ❌ Wrong
```

**Our Spec:**
```typescript
method: "drift_index" | "qoq_delta"  // ✅ Correct
```

**Fix Required:**
```typescript
trajectory: {
  method: "drift_index" | "qoq_delta"  // ✅ Change from 'simple_comparison'
}
```

---

## ✅ What's Already Correct (No Changes)

1. **Deploy Page Fix** - Perfect ✅
2. **Navigation Isolation** - ConditionalLayout approach is correct ✅
3. **Error States** - Toast/retry approach is excellent ✅
4. **Responsive Design** - Mobile transformations are well thought out ✅
5. **Accessibility** - WCAG 2.1 AA approach is correct ✅
6. **Performance** - Optimization strategy is sound ✅
7. **Zone Color Function Structure** - The function itself is well-designed ✅

---

## 📋 Summary of Required Changes

### Must Fix (Critical):
1. ✅ **Minimum N:** Change from 3 to 5 (team) and 10 (org)
2. ✅ **Survey Index:** Change `survey_number: 1|2|3|4` to `survey_index: "S1"|"S2"|"S3"|"S4"`
3. ✅ **Trajectory Method:** Change `'simple_comparison'` to `'qoq_delta'`
4. ✅ **Add Missing Fields:**
   - `coreScores` (alignment, stability, clarity)
   - `experienceMap` (x, y, zone)
   - `leadershipProfile.honesty.gap_component_used`
   - `responseCounts` (overall, leader, team_member)
   - `dataQuality.meets_minimum_n_org`
   - `dataQuality.data_quality_banner`
   - `anchors.current` and `anchors.rolling`

### Clarification Needed:
- **Zone Thresholds:** Are score cards (75/60/45) intentionally different from Experience Map (70/70)?

---

## 🎯 Next Steps

1. **Update TypeScript interfaces** in `types/ali.ts` to match the complete interface above
2. **Update all references** from `survey_number` to `survey_index`
3. **Update minimum N** from 3 to 5/10 throughout
4. **Confirm zone thresholds** - are they intentionally different?
5. **Test data structure** matches our exact API contract

Once these are fixed, the design will be 100% aligned with our backend and ready for implementation!

---

**Note:** Your design work is excellent - these are just data structure alignment fixes to ensure the UI matches our exact API contract. Thank you for the detailed response!

