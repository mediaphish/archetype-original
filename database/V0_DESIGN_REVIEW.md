# V0 Design Prompt Review & Questions

## Overall Assessment

The V0 design prompt is **comprehensive and well-structured**, covering most of the critical UI/UX components. However, there are several **important discrepancies** with our locked specifications that need to be addressed before implementation.

---

## ✅ What's Correct

1. **Design System** - Colors, typography, spacing are well-defined
2. **Survey Taking Interface** - Detailed and matches our spec
3. **Dashboard Layout** - Visual hierarchy (HEADLINE REALITY vs DIAGNOSIS) is correctly identified
4. **Team Experience Map** - Quadrant visualization is correct
5. **Data Quality Gating** - Neutral monochrome rendering when below threshold is correct
6. **Scoring Display** - Shows both current and rolling scores
7. **Navigation System** - AliSystemNav and conditional layout approach is correct

---

## ❌ Critical Issues That Must Be Fixed

### 1. **Route Naming - Demo vs Production**

**V0 Output:** Uses `/ali/demo`, `/ali/dashboard-demo`, `/ali/deploy-demo`, etc.

**Our Spec:** 
- `/ali/survey/:token` (not `/ali/demo`)
- `/ali/dashboard` (not `/ali/dashboard-demo`)
- `/ali/deploy` (not `/ali/deploy-demo`)
- `/ali/reports` (not `/ali/reports-demo`)

**Question for You:** Are the `-demo` routes intentional for development/testing, or should they match production routes exactly?

**Recommendation:** If these are demo routes for V0 preview, that's fine, but we'll need production routes that match our spec.

---

### 2. **Deploy Page - Survey Selection Mismatch**

**V0 Output (Line 329):**
```
- Survey selection dropdown (S1-S4)
```

**Our Locked Spec:**
```
- Next survey: S# (auto-calculated, read-only display)
- Available on: {date} (auto-calculated from cadence, read-only display)
- System Cadence (Automatic): Surveys are generated automatically on quarterly cadence
- No manual scheduling - system controls cadence
```

**This is a CRITICAL mismatch.** The V0 design allows manual survey selection, but our spec explicitly states surveys are auto-calculated and read-only.

**Fix Required:**
- Remove dropdown selection
- Show "Next survey: S# (auto)" as read-only text
- Show "Available on: {date}" as read-only text
- Only allow generating the deployment link, not selecting which survey

---

### 3. **Missing Landing Page**

**Our Spec Required:**
- ALI Landing Page (`/ali`) - Marketing/educational content, What ALI is, Pilot program details, CTA to apply/signup

**V0 Output:** Not included

**Question:** Do you want the landing page implemented, or is it already built elsewhere?

---

### 4. **ALI Overall Score Formula Discrepancy**

**V0 Output (Line 412):**
```
ALI = (30% * anchors_score) + (70% * patterns_score)
Anchors: Alignment, Stability, Clarity
Patterns: All 7 patterns averaged
```

**Our Locked Spec:**
- ALI Overall Score uses a more complex formula from `lib/ali-scoring.js`
- Anchors are specific questions marked `is_anchor = true` (3 total: 1 leader, 1 team_member, 1 either)
- Patterns are calculated per pattern, then averaged

**Question:** Should I verify the exact ALI calculation formula from our scoring library and provide it to V0, or is the 30/70 split acceptable for UI purposes?

---

### 5. **Account Management Missing**

**Our Spec Required:**
- Account Management (`/ali/settings` or `/ali/account`)
  - Company Profile editing
  - Contact Management (add/edit/remove, permission levels)
  - Division Management (if needed)

**V0 Output:** Only basic Settings page with account info, email preferences, password change

**Question:** Do you want full contact and division management in the initial implementation, or can that come later?

---

### 6. **Data Structure Mismatches**

**V0 Output (Line 528):**
```typescript
interface DashboardData {
  scores: {
    ali: { current: number, rolling: number }
    alignment: { current: number, rolling: number }
    // ...
  }
}
```

**Our API Contract:**
```typescript
scores: {
  ali: { current: number, rolling: number, zone: string }
  anchors: { current: number, rolling: number }
  patterns: {
    clarity: { current: number, rolling: number }
    // ... all 7 patterns
  }
}
```

**Fix Required:** Update data structures to match our exact API contract from the V0 prompt.

---

## ⚠️ Minor Issues / Clarifications Needed

### 7. **Trajectory Method Display**

**V0 Output:** Shows method badge ("DriftIndex" or "QoQ Delta")

**Our Spec:** `trajectory.method` field indicates which was used

**Status:** ✅ This matches - good!

---

### 8. **Negative Question Scale Display**

**V0 Output (Line 138-139):**
```
- Normal: 5=Strongly Agree, 4=Agree, 3=Neutral, 2=Disagree, 1=Strongly Disagree
- Negative: 1=Strongly Agree, 2=Agree, 3=Neutral, 4=Disagree, 5=Strongly Disagree
```

**Our Spec:** Scale labels REVERSED for negative questions

**Status:** ✅ This matches - good!

---

### 9. **Brand Colors Discrepancy**

**V0 Output:** Uses SaaS-focused colors (blues, teals, purples for patterns)

**Our Original Spec:** Brand colors `#1A1A1A` (text), `#C85A3C` (accent orange), `#FAFAF9` (background)

**Question:** The V0 design uses a different color system. Is this intentional (ALI has its own design system separate from main site), or should we align with main site colors?

---

### 10. **Typography Discrepancy**

**V0 Output:** System fonts, tight, SaaS-focused

**Our Original Spec:** Serif fonts for headings, sans-serif for body

**Question:** Same as colors - is ALI intentionally using a different typography system than the main site?

---

## 📋 Questions for You (Non-Technical)

1. **Route naming:** Are the `-demo` routes okay for now, or should they match production routes?

2. **Landing page:** Do you want `/ali` landing page implemented, or does it exist elsewhere?

3. **Account management:** Do you need full contact/division management in Phase 1, or can it wait?

4. **Design system:** Is ALI intentionally using a different color/typography system than the main site, or should they align?

5. **Deploy page:** Confirm that surveys should be auto-calculated (no manual selection) - this is critical.

---

## 📝 Questions for V0 (Technical)

### Question 1: Route Structure
```
The current design uses /ali/demo, /ali/dashboard-demo, etc. 
Should these be production routes (/ali/survey/:token, /ali/dashboard) 
or are demo routes intentional for development?
```

### Question 2: Deploy Page Survey Selection
```
The deploy page currently shows "Survey selection dropdown (S1-S4)" 
but our specification requires:
- "Next survey: S# (auto-calculated, read-only display)"
- "Available on: {date} (auto-calculated from cadence, read-only display)"
- "No manual scheduling - system controls cadence"

Should the dropdown be removed and replaced with read-only auto-calculated fields?
```

### Question 3: Missing Landing Page
```
Our specification includes an ALI Landing Page (/ali) with:
- Marketing/educational content
- What ALI is, how it works
- Pilot program details
- CTA to apply/signup

This page is not in the current design. Should it be added?
```

### Question 4: Data Structure Alignment
```
The DashboardData interface should match our API contract exactly:
- scores.ali.zone (string)
- scores.anchors (object with current/rolling)
- scores.patterns (object with all 7 patterns, each with current/rolling)

Should the TypeScript interfaces be updated to match the exact API response structure?
```

### Question 5: ALI Score Calculation
```
The current spec shows: ALI = (30% * anchors) + (70% * patterns)
Our backend uses a more complex calculation. Should the UI:
A) Use the simplified 30/70 formula for display
B) Match the exact backend calculation
C) Display whatever the API returns (backend handles calculation)
```

---

## ✅ Recommended Next Steps

1. **Fix Deploy Page** - Remove dropdown, add read-only auto-calculated fields (CRITICAL)
2. **Clarify Route Naming** - Confirm if demo routes are intentional
3. **Add Landing Page** - If needed, design the `/ali` marketing page
4. **Update Data Structures** - Match exact API contract
5. **Verify ALI Calculation** - Confirm if 30/70 split is acceptable or needs backend formula
6. **Account Management** - Decide if full contact/division management is Phase 1 or later

---

## Summary

The V0 design is **85% complete** and well-executed. The main blockers are:
1. Deploy page survey selection (must be auto-calculated, not manual)
2. Route naming clarification
3. Missing landing page (if needed)
4. Data structure alignment with API contract

Once these are resolved, the design is ready for implementation.

