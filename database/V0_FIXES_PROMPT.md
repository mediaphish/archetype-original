# V0 Design Prompt - Critical Fixes & Clarifications

## Context
This prompt addresses critical discrepancies between the current V0 design and our locked specifications. The ALI system is **completely detached** from the main Archetype Original website - it has its own navigation, design system, and routes. V0's file structure should align with our actual codebase structure.

**Important:** This is not a turf war - your design is excellent. These fixes ensure alignment with our locked backend specifications. ALI intentionally uses a different design system (your colors are correct) and is completely isolated from the main site.

---

## 🔴 CRITICAL FIXES REQUIRED

### 1. Deploy Page - Survey Selection (MUST FIX)

**Current V0 Design:**
- Survey selection dropdown (S1-S4)
- Manual selection allowed

**Our Locked Specification:**
- Surveys are **automatically generated** on quarterly cadence from `baseline_date`
- **No manual scheduling** - system controls cadence
- Links appear only when survey is ready (`available_at` date reached)

**Required Changes:**
1. **Remove** the survey selection dropdown entirely
2. **Replace with read-only display:**
   - "Next survey: S# (auto-calculated)" - read-only text, not editable
   - "Available on: {date}" - read-only text showing when survey becomes available
3. **Button text:** Change "Deploy Survey" to "Generate Deployment Link"
4. **Clarification:** The button generates a link for distribution - it does NOT create the survey (surveys are auto-created by system)

**Updated Deploy Form:**
```
System Cadence (Automatic):
- Surveys are generated automatically on quarterly cadence
- Links appear only when survey is ready

Next Survey: S2 (auto-calculated, read-only)
Available On: 2026-04-15 (auto-calculated from cadence, read-only)

Division Selection (optional):
- Company-wide (default)
- Specific division (dropdown)

Deployment Settings (optional overrides - only if explicitly allowed):
- Opens at (date/time picker) - Note: Only if override allowed
- Closes at (date/time picker) - Note: Only if override allowed
- Minimum responses (default: 5 for team, 10 for org-level)

[Generate Deployment Link] button
```

---

### 2. Route Structure - Align with Our Codebase

**Current V0 Design:** `/ali/demo`, `/ali/dashboard-demo`, `/ali/deploy-demo`

**Our Required Routes:**
- `/ali` - Landing page (public)
- `/ali/survey/:token` - Survey taking (public, anonymous)
- `/ali/login` - Login page
- `/ali/signup` - Signup/onboarding
- `/ali/dashboard` - Main dashboard (authenticated)
- `/ali/deploy` - Survey deployment (authenticated, Account Owner only)
- `/ali/reports` - Reports view (authenticated)
- `/ali/settings` - Account management (authenticated)
- `/ali/billing` - Billing & subscription (authenticated, Account Owner only)

**Note:** V0's file structure should match our codebase. We use React with file-based routing. Please design to these exact routes.

---

### 3. Landing Page Content Requirements

**Route:** `/ali`

**Required Sections:**
1. **Hero Section**
   - Value proposition headline
   - Brief description (1-2 sentences)
   - CTA: "Join the ALI Pilot" → `/ali/signup`

2. **What Is ALI?**
   - Explanation of Archetype Leadership Index
   - How it measures leadership conditions
   - 10-question anonymous survey model
   - Quarterly rhythm

3. **The 7 Leadership Patterns** (brief overview)
   - List the 7 patterns: Clarity, Consistency, Trust, Communication, Alignment, Stability, Leadership Drift
   - Brief description of what each measures (1 sentence each)

4. **How ALI Works**
   - Step 1: Deploy survey to team
   - Step 2: Team responds anonymously
   - Step 3: View visual reports showing leadership impact
   - Step 4: Track progress over time

5. **Pilot Program Details**
   - What the pilot program offers
   - How to apply

6. **Privacy & Data Protection**
   - Anonymous responses
   - Data security
   - Privacy policy link

7. **FAQ Section**
   - Common questions about ALI

8. **Final CTA**
   - "Apply to Join the ALI Pilot" → `/ali/signup`

**Content Status:** We have existing ALI content in `/src/pages/ALI.jsx` and `/src/pages/ALIApply.jsx`. The landing page should use similar content structure but may need ChatGPT to refine/write new content.

**Question for V0:** Should we design the landing page layout/structure first, then have ChatGPT write the content, or do you need content examples to design around?

---

### 4. Design System - ALI is Detached from Main Site

**Critical:** ALI has its **own design system** separate from the main Archetype Original website.

**V0's Color System (APPROVED):**
- Use the colors V0 provided (blues, teals, purples for patterns)
- This is intentional - ALI is a SaaS application with its own visual identity
- Do NOT use main site colors (`#C85A3C` orange, etc.)

**Navigation:**
- **NO main site navigation** should appear on ANY `/ali/*` routes
- Only `AliSystemNav` should be visible
- ALI is completely isolated from main site chrome

**Typography:**
- V0's system fonts approach is correct
- Tight, professional, SaaS-focused
- Do NOT use serif fonts from main site

**Question for V0:** Is the navigation isolation fully defined? Should we add more explicit rules about what should NOT appear on ALI routes?

---

### 5. Data Structure Alignment

**Current V0 Data Structure:**
```typescript
interface DashboardData {
  scores: {
    ali: { current: number, rolling: number }
    alignment: { current: number, rolling: number }
    // ...
  }
}
```

**Our Exact API Contract:**
```typescript
interface DashboardData {
  scores: {
    ali: {
      current: number,      // REQUIRED
      rolling: number,     // REQUIRED
      zone: string         // REQUIRED: "green" | "yellow" | "orange" | "red"
    },
    anchors: {
      current: number,      // REQUIRED
      rolling: number      // REQUIRED
    },
    patterns: {
      clarity: { current: number, rolling: number },
      consistency: { current: number, rolling: number },
      trust: { current: number, rolling: number },
      communication: { current: number, rolling: number },
      alignment: { current: number, rolling: number },
      stability: { current: number, rolling: number },
      leadership_drift: { current: number, rolling: number }
    }
  },
  coreScores: {
    alignment: number,      // PatternRolling(alignment)
    stability: number,      // PatternRolling(stability)
    clarity: number         // PatternRolling(clarity)
  },
  experienceMap: {
    x: number,             // Rolling Clarity
    y: number,             // (Rolling Stability + Rolling Trust) / 2
    zone: string          // "harmony" | "strain" | "stress" | "hazard"
  },
  leadershipProfile: {
    profile: string,
    honesty: {
      score: number,
      state: string,
      gap_component_used: boolean  // REQUIRED
    },
    clarity: {
      level: number,
      stddev: number,      // Standard deviation, not variance
      state: string
    }
  },
  drift: {
    delta_ali: number,     // REQUIRED: Quarter-over-quarter change
    drift_index: number    // REQUIRED: Mean of recent deltas, null if insufficient
  },
  trajectory: {
    value: number,         // REQUIRED: DriftIndex or QoQ delta
    direction: string,     // "improving" | "stable" | "declining"
    magnitude: number,
    method: string         // REQUIRED: "drift_index" | "qoq_delta"
  },
  responseCounts: {
    overall: number,       // REQUIRED
    leader: number,        // REQUIRED
    team_member: number    // REQUIRED
  },
  dataQuality: {
    meets_minimum_n: boolean,        // REQUIRED
    meets_minimum_n_team: boolean,   // REQUIRED
    meets_minimum_n_org: boolean,    // REQUIRED
    response_count: number,          // REQUIRED
    data_quality_banner: boolean     // REQUIRED: true if 5-9 responses
  }
}
```

**Required:** Update all TypeScript interfaces to match this exact structure.

---

### 6. ALI Score Calculation Display

**V0 Spec Shows:** `ALI = (30% * anchors) + (70% * patterns)`

**Our Backend:** Uses more complex calculation, but UI should display whatever the API returns.

**Clarification:** The UI should NOT calculate ALI - it should display `scores.ali.current` and `scores.ali.rolling` from the API response. The backend handles all calculations.

**Question for V0:** Should we remove the calculation formula from the UI spec and just show "Display scores.ali.current and scores.ali.rolling from API"?

---

### 7. Account Management - Phase 1 vs Later

**V0 Current Design:** Basic settings (account info, email preferences, password)

**Our Full Spec Includes:**
- Company Profile editing
- Contact Management (add/edit/remove, permission levels: Account Owner vs View Only)
- Division Management (if needed)

**Question for V0:** Should we design the full account management interface now, or can contact/division management be added in a later phase? For Phase 1, is basic settings sufficient?

---

### 8. Missing Specifications - Questions for V0

**A. Navigation Isolation:**
- Should we add explicit rules about what components should NOT appear on `/ali/*` routes?
- Should there be a way to "Exit to Main Site" from ALI?
- How should authentication state be handled (redirects, protected routes)?

**B. Error States:**
- What should happen if API calls fail?
- How should "Insufficient data" states be displayed?
- What about loading states for each component?

**C. Responsive Behavior:**
- Are there specific mobile interactions that need design?
- How should the Team Experience Map behave on mobile?
- Should dashboard sections stack differently on mobile?

**D. Accessibility:**
- Are there specific accessibility requirements beyond WCAG 2.1 AA?
- How should screen readers handle the Team Experience Map?
- Keyboard navigation patterns for survey taking?

**E. Performance:**
- Are there loading state requirements for data-heavy visualizations?
- Should charts lazy-load or pre-render?
- Any specific animation performance targets?

---

## ✅ What's Already Correct (No Changes Needed)

1. Survey taking interface - detailed and correct
2. Dashboard visual hierarchy - HEADLINE REALITY vs DIAGNOSIS is correct
3. Team Experience Map - quadrant visualization matches spec
4. Data quality gating - neutral monochrome rendering is correct
5. Scoring display - shows both current and rolling scores
6. Pattern colors and icons - well-defined
7. Animation specifications - detailed and helpful

---

## 📋 Implementation Priority

**Phase 1 (Must Have):**
1. Fix Deploy Page - remove dropdown, add read-only auto-calculated fields
2. Update route structure to match our codebase
3. Align data structures with exact API contract
4. Design Landing Page structure (content can come from ChatGPT)

**Phase 2 (Should Have):**
5. Full Account Management interface
6. Error state designs
7. Enhanced accessibility specifications

**Phase 3 (Nice to Have):**
8. Advanced mobile interactions
9. Performance optimization guidelines

---

## 🎯 Summary

**Critical Actions:**
1. ✅ Fix Deploy Page survey selection (remove dropdown, add read-only fields)
2. ✅ Update routes to match our codebase structure
3. ✅ Align data structures with exact API contract
4. ✅ Confirm ALI design system is intentionally separate from main site
5. ❓ Answer questions about Landing Page content, Account Management scope, Navigation isolation, Error states, Accessibility

**Please provide:**
- Updated Deploy Page design (without dropdown)
- Confirmation on Landing Page content approach
- Answers to the questions above
- Any additional specifications needed for complete implementation

---

**Note:** This is not a turf war - V0's design is excellent. These fixes ensure alignment with our locked backend specifications and codebase structure. The ALI system is intentionally detached from the main site with its own design system.

