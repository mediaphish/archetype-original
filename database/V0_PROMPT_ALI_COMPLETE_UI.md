# V0 Prompt: Complete ALI System UI/UX Design

**Purpose:** This prompt provides V0 with everything needed to design the complete ALI (Archetype Leadership Index) system UI/UX, from landing page through dashboard.

**Status:** Complete specification ready for V0

**Last Updated:** 2026-01-XX (Fixed: Trajectory math, stddev vs variance, two-tier minimum N, profile matrix, rolling behavior, profile input clarification, map gating, deploy cadence)

---

# **COMPLETE ALI SYSTEM UI/UX DESIGN PROMPT FOR V0**

You are designing the complete user interface and user experience for the Archetype Leadership Index (ALI) system - a leadership diagnostic tool for small businesses (10-250 employees).

## **SYSTEM OVERVIEW**

ALI measures leadership conditions through anonymous 10-question surveys. Leaders deploy surveys to their teams, collect responses, and view visual-heavy reports showing how their leadership is being experienced.

**Key Principles:**
- Visual-first design (charts, graphs, maps are critical)
- Professional, clean, accessible
- Mobile-responsive
- Brand colors: `#1A1A1A` (text), `#C85A3C` (accent orange), `#FAFAF9` (background)
- Serif fonts for headings, sans-serif for body

---

## **COMPLETE VIEW INVENTORY**

### **PUBLIC PAGES (No Authentication)**

1. **ALI Landing Page** (`/ali`)
   - Marketing/educational content
   - What ALI is, how it works
   - Pilot program details
   - CTA to apply/signup

2. **Survey Taking Page** (`/ali/survey/:token`)
   - Anonymous survey form
   - 10 questions (Likert scale 1-5)
   - No login required
   - Submit and confirmation

### **AUTHENTICATED PAGES (Account Owner + View Only)**

3. **Login Page** (`/ali/login`)
   - Email/password or magic link
   - Forgot password
   - Sign up link

4. **Sign Up / Onboarding** (`/ali/signup`)
   - Company information form
   - Primary contact (Account Owner)
   - Email verification
   - Welcome flow

5. **Dashboard (Main View)** (`/ali/dashboard`)
   - Visual-heavy reporting (PRIMARY VIEW)
   - Team Experience Map
   - Four core scores
   - Pattern analysis
   - Historical trends
   - Leadership Profile
   - Leadership Mirror

6. **Survey Deployment** (`/ali/deploy`)
   - Deploy new survey
   - Select survey index (S1, S2, etc.)
   - Generate deployment link
   - Copy/share functionality
   - Active deployments list
   - Account Owner only

7. **Account Management** (`/ali/settings` or `/ali/account`)
   - Company profile
   - Contact management
   - Division management (if needed)
   - Account settings

8. **Billing & Subscription** (`/ali/billing`)
   - Current plan
   - Payment method
   - Invoice history
   - Upgrade/downgrade
   - Account Owner only

9. **Reports / Results** (`/ali/reports` or `/ali/results`)
   - Quarterly reports
   - Historical comparisons
   - Export functionality
   - Detailed pattern views

---

## **DETAILED VIEW SPECIFICATIONS**

### **1. ALI LANDING PAGE** (`/ali`)

**Purpose:** Marketing/educational page explaining ALI

**Content:**
- Hero section with value proposition
- What is ALI? (explanation)
- How ALI Works (10-question model, quarterly rhythm)
- The 7 Leadership Patterns (brief overview)
- Pilot Program Details
- Privacy & Data Protection
- FAQ Section
- Final CTA to apply/signup

**Design:**
- Match existing site design (`/src/pages/ALI.jsx` exists)
- Professional, educational tone
- Clear CTAs
- Mobile-responsive

**CTA:** "Join the ALI Pilot" → `/ali/signup`

---

### **2. SURVEY TAKING PAGE** (`/ali/survey/:token`)

**Purpose:** Anonymous survey form for team members

**Requirements:**
- No login required
- Load questions from deployment token
- Display 10 questions
- Likert scale: 1 (Strongly Disagree) to 5 (Strongly Agree)
- Submit anonymously
- Show confirmation after submission
- Soft prevention of duplicate submissions (browser storage) - Note: Users can clear storage, so UI should not promise impossibility

**Layout:**
- Clean, minimal design
- One question per screen (or scrollable form)
- Clear instructions
- Progress indicator (Question 1 of 10)
- Submit button
- Thank you/confirmation screen

**Design:**
- Professional, trustworthy
- Mobile-optimized
- Accessible (keyboard navigation, screen readers)
- **No company name displayed** - Use neutral branding (Archetype Original / ALI) to establish legitimacy without revealing employer identity

**Data Flow:**
- GET `/api/ali/survey/:token` → Load questions
- POST `/api/ali/submit-response` → Submit responses

---

### **3. LOGIN PAGE** (`/ali/login`)

**Purpose:** Authenticate existing ALI contacts

**Features:**
- Email input
- Password input (or magic link option)
- "Forgot password" link
- "Sign up" link
- Error handling
- Loading states

**Design:**
- Clean, professional
- Match brand colors
- Mobile-responsive
- Clear error messages

**Flow:**
- Success → Redirect to `/ali/dashboard`
- Error → Show message, stay on page

---

### **4. SIGN UP / ONBOARDING** (`/ali/signup`)

**Purpose:** New company registration

**Form Fields:**
- Company name (required, unique)
- Company size (dropdown: 1-10, 11-50, 51-100, 101-250, 251-500, 500+)
- Industry (optional)
- Website (optional)
- Primary contact name (required)
- Primary contact email (required, unique)
- Primary contact role/title (optional)
- Pilot program toggle (if applicable)
- Terms acceptance checkbox

**Flow:**
1. Fill form
2. Submit → Create company + Account Owner contact
3. Email verification sent
4. Welcome screen with next steps
5. Redirect to dashboard (or email verification required)

**Design:**
- Multi-step form (optional, or single page)
- Clear validation
- Progress indicator
- Error handling
- Success confirmation

**API:** POST `/api/ali/signup`

---

### **5. DASHBOARD (MAIN VIEW)** (`/ali/dashboard`)

**Purpose:** Visual-heavy reporting - THE PRIMARY VIEW

**This is the most critical page. Visual design is key to success.**

#### **Layout Structure:**

**Top Navigation:**
- Logo/Brand
- Navigation: Overview | Reports | Deployments | Settings
- User menu (logout, account)

**Left Sidebar (Optional):**
- Company info
- Subscription status
- Quick stats
- Help/Support links

**Main Content Area (Scrollable):**

#### **Section 1: Score Cards (Four Core Scores) - HEADLINE REALITY**

**Four large cards in a row (2x2 grid on mobile):**

**Visual Hierarchy Note:** These core scores + Team Experience Map = the headline reality. Patterns, Mirror, and Profile are diagnostic/interpretation layers below.

**Alignment Score Card:**
- **Displayed value = rolling** (dashboard primary numbers must never be snapshot)
- Large number (0-100) - shows rolling score
- Tooltip can show current score (optional)
- Circular progress indicator
- Trend indicator (↑ improving, ↓ declining, → stable)
- Comparison to previous quarter
- Color coding: Green (70-100), Yellow (50-69), Orange (30-49), Red (0-29)

**Stability Score Card:**
- **Displayed value = rolling** (dashboard primary numbers must never be snapshot)
- Same format as Alignment
- Tooltip can show current score (optional)
- Focus on predictability and safety
- Historical trend line (mini chart)

**Clarity Score Card:**
- **Displayed value = rolling** (dashboard primary numbers must never be snapshot)
- Same format as Alignment
- Tooltip can show current score (optional)
- Focus on communication and expectations
- Historical trend line

**Trajectory Score Card:**
- Most prominent display
- Shows momentum (improving, declining, stable)
- **Calculation (LOCKED):** Trajectory = DriftIndex(t)
  - DriftIndex = mean of recent ALI deltas over K-1 surveys (where K=4)
  - **For K=4 surveys, DriftIndex uses the most recent 3 deltas (t−3→t−2, t−2→t−1, t−1→t)**
  - Stabilized with anchors: `0.5 × mean(ΔALI) + 0.5 × mean(ΔAnchorScore)`
  - **Fallback (ONLY if DriftIndex is null/unavailable due to insufficient prior surveys):** Trajectory = ALI(t) − ALI(t−1) (quarter-over-quarter change)
  - **Critical:** Use fallback ONLY if DriftIndex is null/unavailable due to insufficient prior surveys. Never mix methods when DriftIndex exists.
- Large arrow indicator (direction + magnitude)
- Quarter-over-quarter comparison
- Color: Green (improving/positive), Yellow (stable/near zero), Red (declining/negative)
- **Note:** Must match backend calculation exactly - use DriftIndex if available, otherwise QoQ delta

#### **Section 2: Team Experience Map (PRIMARY VISUALIZATION) - HEADLINE REALITY**

**Four-zone quadrant chart:**

**Visual Hierarchy Note:** This map + Core Scores = the headline reality. All other sections are diagnostic/interpretation layers.
- X-axis: Clarity (Low → High, 0-100)
- Y-axis: (Stability + Trust) / 2 (Low → High, 0-100)
- Four zones:
  1. **Harmony Zone** (top-right, X≥70, Y≥70) - Green `#10B981`
  2. **Strain Zone** (top-left, X<70, Y≥70) - Yellow `#F59E0B`
  3. **Stress Zone** (bottom-left, X<70, Y<70) - Orange `#F97316`
  4. **Hazard Zone** (bottom-right, X≥70, Y<70) - Red `#EF4444`

**Interactive Features:**
- Current position (large dot)
- Previous quarter positions (smaller dots, connected by line)
- Trajectory arrow (showing direction of movement)
- Zone boundaries (clearly marked)
- Hover to see zone description
- Click to drill down

**Implementation:**
- Use D3.js or Recharts for custom visualization
- Responsive (mobile-friendly)
- Export as PNG/PDF

**Data Quality Gating:**
- **Critical:** If `dataQuality.data_quality_banner = true` (5-9 responses), render the map in **neutral monochrome (no quadrant fills)**, show only axes + dot + a "data quality" callout.
- **Must not label the zone** or **color the quadrant** as "Harmony/Strain/Stress/Hazard."
- This prevents accidental "soft classification" when data quality is insufficient.
- Only show zone labels and quadrant colors when `dataQuality.meets_minimum_n_org = true` (≥10 responses).

#### **Section 3: Pattern Analysis (7 Leadership Patterns) - DIAGNOSIS**

**Seven cards in a grid (or scrollable row on mobile):**

**Visual Hierarchy Note:** This is diagnostic detail, not headline reality. Visually subordinate to Core Scores and Experience Map.

**Each Pattern Card:**
- Pattern name (Clarity, Consistency, Trust, Communication, Alignment, Stability, Leadership Drift)
- Current score (0-100, rolling)
- Mini trend chart (last 4 quarters)
- Status indicator:
  - 🟢 Strengthening
  - 🟡 Stable
  - 🟠 Weakening
  - 🔴 Critical

**Click to Expand:**
- Detailed breakdown
- Question-level analysis
- Leader vs. Team Member comparison
- Actionable insights

#### **Section 4: Historical Trends**

**Large line/area chart:**
- Multi-metric overlay:
  - Alignment Score (primary line)
  - Stability Score (secondary line)
  - Clarity Score (tertiary line)
- X-axis: Time (quarters)
- Y-axis: Score (0-100)
- Interactive:
  - Hover to see exact values
  - Click quarter to see detailed report
  - Zoom/pan functionality
- Annotations:
  - Key events (e.g., "New leadership", "Reorganization")
  - Threshold markers

#### **Section 5: Leadership Profile**

**Profile Display Card:**
- Profile name (Guardian, Aspirer, Protector, Producer-Leader, Stabilizer, Operator)
- Profile description
- Honesty axis: Score + State (Courageous/Selective/Protective)
  - **Note:** If `gap_component_used = false`, display note that gap component was unavailable
- Clarity axis: Level + State (High/Unstable/Ambiguous) - uses rolling scores
- "Profile forming" if <3 surveys
- **Visual Hierarchy:** This is a leadership interpretation layer (diagnostic), not the headline reality

**Visual:**
- Large card with profile name
- Color-coded by profile type
- Expandable for details

#### **Section 6: Leadership Mirror**

**Gap Visualization:**
- Side-by-side bars for each score (all using rolling scores):
  - ALI Overall (rolling)
  - Alignment (rolling)
  - Stability (rolling)
  - Clarity (rolling)
- Leader score (left bar) - rolling
- Team score (right bar) - rolling
- Gap number displayed
- Severity indicator:
  - Neutral (<8)
  - Caution (8-14)
  - Critical (≥15)
- **Visual Hierarchy:** This is a leadership interpretation layer (diagnostic), not the headline reality
- **Visual Hierarchy:** This is a leadership interpretation layer (diagnostic), not the headline reality

**Layout:**
- Four comparison cards or single expandable section
- Clear visual distinction between leader and team
- Gap highlighted

#### **Section 7: Response Analytics**

**Dashboard Cards:**
- Total responses (all time)
- Responses this quarter
- Response rate (if team size known)
- Average completion time
- Device breakdown (mobile vs. desktop)

**Table:**
- List of all deployments
- Response count per deployment
- Completion status
- Date range

#### **Data Requirements:**
- **Two-tier minimum N thresholds:**
  - Team-level minimum: ≥5 responses
  - Org-level minimum: ≥10 responses (preferred)
- **Data quality rules:**
  - If overall < 10 but ≥ 5: Show results with "Data Quality" banner, suppress zone labeling and profile classification
  - If overall < 5: Show "Insufficient data" message
  - If overall ≥ 10: Full dashboard with all features enabled
- Real-time updates (polling or WebSocket)
- Loading states (skeleton screens)

**Design:**
- Visual-first (charts, graphs, maps)
- High contrast for accessibility
- Responsive (mobile-friendly)
- Print-friendly (when exported)

---

### **6. SURVEY DEPLOYMENT** (`/ali/deploy`)

**Purpose:** Deploy new surveys and manage deployment links

**Access:** Account Owner only

#### **Deploy New Survey Section:**

**System Cadence (Automatic):**
- Surveys are generated automatically on quarterly cadence from first send date (baseline_date)
- Links appear only when survey is ready (available_at date reached)
- **No manual scheduling** - system controls cadence

**Form:**
- **Next survey:** S# (auto-calculated, read-only display)
- **Available on:** {date} (auto-calculated from cadence, read-only display)
- Division selection (optional, if segmentation is used):
  - Company-wide (default)
  - Specific division (dropdown)
- Deployment settings (optional overrides - only if explicitly allowed):
  - Opens at (date/time picker) - **Note:** Only if override allowed, otherwise uses system calculated available_at
  - Closes at (date/time picker) - **Note:** Only if override allowed
  - Minimum responses (default: 5 for team, 10 for org-level results)
- "Generate Deployment Link" button (generates link for distribution, does not create survey)

#### **Deployment Link Display:**

**After generation:**
- Unique survey URL: `https://archetypeoriginal.com/ali/survey/{token}`
- Copy link button (one-click copy)
- QR code generation (for in-person distribution)
- Email template with link
- Share options:
  - Email
  - Copy link
  - Download QR code

#### **Active Deployments List:**

**Table View:**
- Columns:
  - Survey (S1, S2, etc.)
  - Status (pending, active, closed)
  - Responses (X / minimum)
  - Opens at / Closes at
  - Actions (view link, close, archive)

**Features:**
- Real-time response counter
- Progress bar (X / minimum responses)
- "Results available" indicator (when threshold met)
- Close deployment early
- Extend closing date
- Resend link to team

**Design:**
- Clean form layout
- Clear action buttons
- Status indicators
- Mobile-responsive table

**API:** POST `/api/ali/deploy-survey`

---

### **7. ACCOUNT MANAGEMENT** (`/ali/settings` or `/ali/account`)

**Purpose:** Manage company profile, contacts, and divisions

#### **Company Profile Section:**

**Editable Fields:**
- Company name
- Company size
- Industry
- Website
- View-only: Account creation date, subscription status

**Design:**
- Form with save button
- Validation
- Success/error messages

#### **Contact Management Section:**

**Features:**
- List all contacts (Account Owners + View Only)
- Add new contact button
- Edit contact (name, role, permission level)
- Remove contact (with confirmation)
- Permission level indicators:
  - 🟢 Account Owner badge
  - 🔵 View Only badge

**Add Contact Form:**
- Email (required)
- Full name (required)
- Role/title (optional)
- Permission level (Account Owner / View Only)
- Save button

**Design:**
- Table or card list
- Clear permission indicators
- Confirmation dialogs for destructive actions

**API:** GET/POST/PATCH `/api/ali/contacts`

#### **Division Management Section (If Needed):**

**Features:**
- List all divisions
- Create new division (name, description, parent division)
- Edit division details
- Delete division (only if no sub-divisions)
- Visual hierarchy tree view

**Design:**
- Tree or nested list
- Create/edit forms
- Confirmation for deletion

**API:** GET/POST/PATCH/DELETE `/api/ali/divisions`

---

### **8. BILLING & SUBSCRIPTION** (`/ali/billing`)

**Purpose:** Manage subscription and payment

**Access:** Account Owner only

#### **Current Plan Display:**

**Card:**
- Plan name (Starter, Professional, Enterprise)
- Current status (active, trial, past_due, canceled)
- Next billing date
- Price per month/year

#### **Payment Method:**

**Section:**
- Current payment method (card ending in XXXX)
- Update payment method button
- Add payment method (Stripe Elements)

#### **Billing History:**

**Table:**
- Invoice date
- Amount
- Status (paid, pending, failed)
- Download invoice button

#### **Plan Management:**

**Actions:**
- Upgrade plan button
- Downgrade plan button
- Cancel subscription (with retention flow)

**Design:**
- Clean, professional
- Clear pricing display
- Secure payment form
- Mobile-responsive

**Integration:** Stripe

---

### **9. REPORTS / RESULTS** (`/ali/reports` or `/ali/results`)

**Purpose:** Detailed reports and historical analysis

#### **Quarterly Report View:**

**Full-page report (printable):**
- Executive summary section
- All visualizations (full-size)
- Narrative insights
- Action items/recommendations
- Export options:
  - PDF (formatted for presentation)
  - PNG (individual charts)
  - CSV (raw data)

#### **Comparison View:**

**Side-by-side quarter comparison:**
- Change indicators (↑↓)
- Highlighted improvements/declines
- Narrative summary of changes

#### **Detailed Pattern View:**

**Deep dive into one pattern:**
- Question-level breakdown
- Leader vs. Team Member responses
- Historical trend for this pattern
- Actionable recommendations

**Design:**
- Print-friendly layouts
- Clear section headers
- Professional formatting
- Export functionality

---

## **DESIGN SYSTEM**

### **Colors:**
- Text: `#1A1A1A`
- Accent: `#C85A3C` (orange-red)
- Background: `#FAFAF9`, `#F5F3F0`, `white`
- Success: `#10B981` (green)
- Warning: `#F59E0B` (yellow)
- Error: `#EF4444` (red)
- Info: `#3B82F6` (blue)

### **Typography:**
- Headings: Serif font (matches brand)
- Body: Sans-serif (readable)
- Numbers: Monospace (for scores)

### **Components:**
- Cards: White background, subtle shadow, rounded corners
- Buttons: Primary (accent color), Secondary (outline), Danger (red)
- Forms: Clean inputs, clear labels, validation messages
- Tables: Striped rows, hover states, sortable columns
- Charts: High contrast, accessible, responsive

### **Spacing:**
- Consistent padding/margins
- Mobile: 16px base
- Desktop: 24px base

### **Responsive Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## **USER FLOWS**

### **Flow 1: New Company Signup**
1. Land on `/ali` (marketing page)
2. Click "Join the ALI Pilot" → `/ali/signup`
3. Fill signup form
4. Submit → Company + Account Owner created
5. Email verification sent
6. Welcome screen → `/ali/dashboard`

### **Flow 2: Existing User Login**
1. Land on `/ali/login`
2. Enter email/password (or magic link)
3. Authenticate
4. Redirect to `/ali/dashboard`

### **Flow 3: Deploy Survey (Account Owner)**
1. Navigate to `/ali/deploy`
2. Select survey index (S1, S2, etc.)
3. Set deployment dates (optional)
4. Click "Generate Deployment"
5. Copy link or share via email
6. View active deployments list

### **Flow 4: Take Survey (Team Member)**
1. Receive survey link (email, Slack, etc.)
2. Click link → `/ali/survey/:token`
3. View questions (10 total)
4. Answer each (Likert 1-5)
5. Submit
6. See confirmation

### **Flow 5: View Dashboard**
1. Login → `/ali/dashboard`
2. View all visualizations:
   - Score cards
   - Team Experience Map
   - Pattern analysis
   - Historical trends
   - Leadership Profile
   - Leadership Mirror
3. Click any visualization to drill down
4. Export reports if needed

---

## **DATA STRUCTURES & API SHAPES**

### **Dashboard API Response** (`GET /api/ali/dashboard/:companyId`)

```typescript
{
  "company": {
    "id": "uuid",
    "name": "Acme Corp",
    "subscription_status": "active" | "trial" | "past_due" | "canceled"
  },
  "scores": {
    "ali": {
      "current": 71.2,  // REQUIRED: Current survey ALI score
      "rolling": 69.5,  // REQUIRED: Rolling ALI score (4-survey window)
      "zone": "yellow" // "green" | "yellow" | "orange" | "red"
    },
    "anchors": {
      "current": 74.0,
      "rolling": 72.8
    },
    "patterns": {
      "clarity": { "current": 68.0, "rolling": 70.1 },
      "consistency": { "current": 72.4, "rolling": 71.3 },
      "trust": { "current": 65.2, "rolling": 66.0 },
      "communication": { "current": 73.1, "rolling": 72.5 },
      "alignment": { "current": 69.8, "rolling": 68.9 },
      "stability": { "current": 75.0, "rolling": 73.6 },
      "leadership_drift": { "current": 62.5, "rolling": 64.0 }
    }
  },
  "coreScores": {
    "alignment": 68.9, // PatternRolling(alignment)
    "stability": 73.6, // PatternRolling(stability)
    "clarity": 70.1    // PatternRolling(clarity)
  },
  "experienceMap": {
    "x": 70.1,  // Rolling Clarity
    "y": 69.6,  // (Rolling Stability + Rolling Trust) / 2
    "zone": "harmony" // "harmony" | "strain" | "stress" | "hazard"
  },
  "leadershipProfile": {
    "profile": "guardian", // "guardian" | "aspirer" | "protector" | "producer_leader" | "stabilizer" | "operator" | "profile_forming"
    "honesty": {
      "score": 72.5,
      "state": "courageous" // "courageous" | "selective" | "protective"
    },
    "clarity": {
      "level": 70.1,
      "stddev": 5.2,
      "state": "high" // "high" | "unstable" | "ambiguous"
    }
  },
  "leadershipMirror": {
    "gaps": {
      "ali": 12.3,
      "alignment": 8.4,
      "stability": 5.2,
      "clarity": 10.1
    },
    "severity": {
      "ali": "caution", // "neutral" | "caution" | "critical"
      "alignment": "neutral",
      "stability": "neutral",
      "clarity": "caution"
    },
    "leaderScores": {
      "ali": 75.0,
      "alignment": 72.0,
      "stability": 78.0,
      "clarity": 75.0
    },
    "teamScores": {
      "ali": 62.7,
      "alignment": 63.6,
      "stability": 72.8,
      "clarity": 64.9
    }
  },
  "drift": {
    "delta_ali": -1.4, // REQUIRED: Quarter-over-quarter change: ALI(t) - ALI(t-1)
    "drift_index": -0.8 // REQUIRED: Mean of recent deltas (stabilized with anchors), null if insufficient surveys
  },
  "trajectory": {
    "value": -0.8, // REQUIRED: DriftIndex (preferred) or QoQ delta (if DriftIndex null/unavailable)
    "direction": "declining", // "improving" | "stable" | "declining"
    "magnitude": 0.8, // Absolute value
    "method": "drift_index" // REQUIRED: "drift_index" | "qoq_delta" - indicates which calculation was used
  },
  "historicalTrends": [
    {
      "period": "2024-Q1",
      "ali": 68.2,
      "alignment": 67.5,
      "stability": 72.1,
      "clarity": 69.8
    },
    {
      "period": "2024-Q2",
      "ali": 69.5,
      "alignment": 68.9,
      "stability": 73.6,
      "clarity": 70.1
    }
  ],
  "responseCounts": {
    "overall": 42,  // REQUIRED: Total responses across all roles
    "leader": 8,    // REQUIRED: Leader role responses
    "team_member": 34 // REQUIRED: Team member role responses
  },
  "dataQuality": {
    "meets_minimum_n": true, // REQUIRED: Overall meets minimum threshold (≥5)
    "meets_minimum_n_team": true, // REQUIRED: ≥5 responses
    "meets_minimum_n_org": true,  // REQUIRED: ≥10 responses (preferred)
    "response_count": 42, // REQUIRED: Total response count
    "standard_deviation": 11.2,
    "data_quality_banner": false // REQUIRED: true if 5-9 responses (show banner, suppress zones/profiles)
  },
  "deployments": [
    {
      "id": "uuid",
      "survey_index": "S1",
      "status": "active",
      "response_count": 42,
      "minimum_responses": 5,
      "opens_at": "2024-01-15T00:00:00Z",
      "closes_at": "2024-02-15T00:00:00Z"
    }
  ]
}
```

### **Survey Questions API** (`GET /api/ali/survey/:token`)

```typescript
{
  "deployment": {
    "id": "uuid",
    "survey_index": "S1",
    "status": "active",
    "opens_at": "2024-01-15T00:00:00Z",
    "closes_at": "2024-02-15T00:00:00Z"
  },
  "questions": [
    {
      "stable_id": "Q-CLARITY-001",
      "question_text": "I communicate the top priorities clearly enough that people can act without guessing.",
      "pattern": "clarity",
      "role": "leader", // "leader" | "team_member"
      "is_negative": false,
      "is_anchor": true,
      "order": 1
    },
    // ... 9 more questions
  ],
  "total_questions": 10
}
```

### **Submit Response API** (`POST /api/ali/submit-response`)

**Request:**
```typescript
{
  "deploymentToken": "unique-token",
  "responses": {
    "Q-CLARITY-001": 4,
    "Q-CLARITY-002": 5,
    "Q-TRUST-001": 3,
    // ... 10 questions total
  },
  "deviceType": "desktop" // optional
}
```

**Response:**
```typescript
{
  "success": true,
  "response": {
    "id": "uuid",
    "submittedAt": "2024-01-15T10:30:00Z"
  },
  "statistics": {
    "totalResponses": 42,
    "minimumRequired": 5,
    "thresholdMet": true
  },
  "message": "Response submitted successfully. Results are now available."
}
```

### **Deploy Survey API** (`POST /api/ali/deploy-survey`)

**Request:**
```typescript
{
  "companyId": "uuid",
  "surveyIndex": "S1", // Auto-calculated if not provided
  "opensAt": "2024-01-15T00:00:00Z", // optional
  "closesAt": "2024-02-15T00:00:00Z", // optional
  "minimumResponses": 5
}
```

**Response:**
```typescript
{
  "success": true,
  "deployment": {
    "id": "uuid",
    "survey_index": "S1",
    "deployment_token": "unique-token",
    "survey_url": "https://archetypeoriginal.com/ali/survey/unique-token",
    "status": "pending",
    "opens_at": "2024-01-15T00:00:00Z",
    "closes_at": "2024-02-15T00:00:00Z"
  }
}
```

---

## **TECHNICAL CONSTRAINTS**

### **Data Requirements:**
- **Two-tier minimum N:**
  - Team-level: ≥5 responses
  - Org-level: ≥10 responses (preferred)
- **Data quality gating:**
  - Overall < 10 but ≥ 5: Show results with data quality banner, suppress zones/profiles
  - Overall < 5: Show "Insufficient data"
  - Overall ≥ 10: Full dashboard enabled
- Rolling scores only (4-survey window, ≈1 year)
  - **Note:** Rolling uses available surveys up to K=4 (not null if <4 surveys exist)
  - Profiles still require 3+ surveys regardless
- Real-time updates (polling every 30 seconds)
- All scores use rolling calculations (never snapshot for dashboard)

### **API Endpoints:**
- `GET /api/ali/dashboard/:companyId` - Complete dashboard data
- `GET /api/ali/survey/:token` - Survey questions by token
- `POST /api/ali/submit-response` - Submit anonymous response
- `POST /api/ali/deploy-survey` - Deploy new survey
- `GET /api/ali/contacts?companyId=xxx` - List contacts
- `POST /api/ali/contacts` - Add contact
- `PATCH /api/ali/contacts/:id` - Update contact
- `GET /api/ali/divisions?companyId=xxx` - List divisions (if needed)
- `POST /api/ali/divisions` - Create division (if needed)

### **Authentication:**
- Supabase Auth (to be implemented)
- Session management
- Permission checks (Account Owner vs. View Only)

### **Charting Libraries:**
- Recharts (React) - For standard charts
- D3.js - For custom visualizations (Team Experience Map)
- Chart.js - Alternative option

---

## **SCORING CALCULATIONS (LOCKED SPECIFICATION)**

### **API Field Requirements (V0 Design Contract):**
V0 should design expecting these exact field names in the API response:
- `scores.ali.current` - Current survey ALI score
- `scores.ali.rolling` - Rolling ALI score (4-survey window)
- `drift.drift_index` - DriftIndex value (null if insufficient surveys)
- `drift.delta_ali` - Quarter-over-quarter ALI change
- `dataQuality.meets_minimum_n` - Overall minimum threshold met
- `responseCounts.overall` - Total responses
- `responseCounts.leader` - Leader role responses
- `responseCounts.team_member` - Team member role responses

**Note:** Even if backend implementation maps these differently, V0 should design to this stable contract.

### **Core Scores:**
- **Alignment Score** = `PatternRolling(alignment)` (rolling only, no composite)
- **Stability Score** = `PatternRolling(stability)` (rolling only, no composite)
- **Clarity Score** = `PatternRolling(clarity)` (rolling only, no composite)

### **Team Experience Map:**
- **X-axis** = `PatternRolling(clarity)` (0-100)
- **Y-axis** = `(PatternRolling(stability) + PatternRolling(trust)) / 2` (0-100)
- **Zones:**
  - Harmony: X ≥ 70 AND Y ≥ 70 (Green)
  - Strain: X < 70 AND Y ≥ 70 (Yellow)
  - Stress: X < 70 AND Y < 70 (Orange)
  - Hazard: X ≥ 70 AND Y < 70 (Red)

### **Trajectory Calculation:**
- **Primary:** Trajectory = DriftIndex(t)
  - DriftIndex = mean of recent ALI deltas over K-1 surveys (where K=4)
  - **For K=4 surveys, DriftIndex uses the most recent 3 deltas (t−3→t−2, t−2→t−1, t−1→t)**
  - Stabilized: `0.5 × mean(ΔALI) + 0.5 × mean(ΔAnchorScore)`
- **Fallback:** Trajectory = ALI(t) − ALI(t−1) (quarter-over-quarter change)
  - **Use fallback ONLY if DriftIndex is null/unavailable due to insufficient prior surveys**
  - Never mix methods when DriftIndex exists
- **API Field:** `trajectory.method` indicates which calculation was used ("drift_index" | "qoq_delta")

### **Leadership Profile:**
- **Honesty** = `(PatternRolling(trust) + PatternRolling(communication) + (100 - abs(Gap_Trust))) / 3`
  - **Note:** Gap_Trust = Trust_leader - Trust_team (requires both leader and team scores)
  - **Fallback:** If leader-role N < 3 (below threshold), compute Honesty as: `(PatternRolling(trust) + PatternRolling(communication)) / 2`
  - **API Field:** `leadershipProfile.honesty.gap_component_used` = true/false (indicates if gap component was available)
- **Honesty States:** Courageous (≥70), Selective (55-69), Protective (<55)
- **Clarity States:** High (≥70, stddev<8), Unstable (≥60, stddev≥8), Ambiguous (<60)
  - **Note:** Uses standard deviation (stddev), not variance. Variance is squared-units and would have different thresholds.
- **Profile Matrix (LOCKED):**

| Honesty \ Clarity | High | Unstable | Ambiguous |
|-------------------|------|----------|-----------|
| **Courageous** | Guardian | Aspirer | Producer-Leader |
| **Selective** | Protector | Stabilizer | Operator |
| **Protective** | Operator | Operator | Operator |

- **Rules:**
  - Protective honesty **never** maps to Guardian/Aspirer
  - Profiles update quarterly only
  - <3 surveys → "Profile forming"
- **Requires:** 3+ surveys. Profile uses rolling team experience as primary input, and uses leader/team gap terms (e.g., Gap_Trust) only when leader-role N meets minimum (≥3). If leader-role N is below threshold, Honesty uses fallback formula without gap component.

### **Leadership Mirror:**
- **Gap** = `Leader_Score - Team_Score` (for ALI, Alignment, Stability, Clarity)
- **Severity:** Neutral (<8), Caution (8-14), Critical (≥15)
- **Visual:** Side-by-side bars

### **Important Rules:**
- ✅ Rolling scores only (never snapshot for dashboard)
- ✅ Team responses only for profiles
- ✅ All calculations deterministic
- ✅ Two-tier minimum N: Team ≥5, Org ≥10 (preferred)
  - 5-9 responses: Show results with data quality banner, suppress zones/profiles
  - <5 responses: Show "Insufficient data"
  - ≥10 responses: Full dashboard enabled

---

## **CRITICAL DESIGN REQUIREMENTS**

### **Visual-First Design:**
- Charts, graphs, and maps are PRIMARY
- Text is secondary
- Make data visible, not just readable
- **This is the key differentiator** - visual design is critical to success

### **Accessibility:**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast
- Clear focus states
- Alt text for all charts

### **Mobile Responsiveness:**
- All visualizations responsive
- Touch-friendly interactions
- Simplified views for small screens
- Horizontal scrolling for tables (if needed)
- Stack cards vertically on mobile

### **Performance:**
- Lazy load historical data
- Optimize chart rendering
- Skeleton screens for loading
- Efficient data fetching
- Virtual scrolling for large datasets

### **Error Handling:**
- Clear error messages
- Graceful degradation
- Retry mechanisms
- Helpful guidance
- "Insufficient data" states when <5 responses
- Data quality banner when 5-9 responses (suppress zones/profiles)

---

## **SUCCESS METRICS**

**Dashboard Engagement:**
- Time spent on dashboard
- Report views/downloads
- Feature usage

**User Satisfaction:**
- Clear, actionable insights
- Easy to understand visualizations
- Professional appearance

---

## **COMPONENT LIBRARY REQUIREMENTS**

### **Reusable Components Needed:**

1. **Score Card Component**
   - Large number display (0-100)
   - Circular progress indicator
   - Trend indicator (↑↓→)
   - Color coding
   - Mini trend chart

2. **Team Experience Map Component**
   - Quadrant chart (D3.js or Recharts)
   - Four zones with colors
   - Interactive dots (current + historical)
   - Trajectory arrows
   - Zone boundaries
   - Hover tooltips

3. **Pattern Card Component**
   - Pattern name
   - Score display
   - Mini trend chart
   - Status indicator
   - Expandable details

4. **Historical Trend Chart Component**
   - Multi-line chart
   - Interactive (hover, click)
   - Annotations
   - Zoom/pan

5. **Leadership Mirror Component**
   - Side-by-side bars
   - Gap number
   - Severity indicator
   - Leader vs. team comparison

6. **Leadership Profile Card**
   - Profile name
   - Description
   - Honesty/Clarity axes
   - Color-coded

7. **Form Components**
   - Input fields
   - Select dropdowns
   - Date/time pickers
   - Checkboxes
   - Validation messages

8. **Table Components**
   - Sortable columns
   - Responsive (mobile-friendly)
   - Pagination
   - Filters

9. **Button Components**
   - Primary (accent color)
   - Secondary (outline)
   - Danger (red)
   - Loading states
   - Disabled states

10. **Modal/Dialog Components**
    - Confirmation dialogs
    - Form modals
    - Info modals

---

## **OUTPUT REQUIREMENTS**

Design the complete UI/UX for all views listed above, including:

1. **Wireframes/Layouts** for each page
2. **Component Specifications** (cards, charts, forms, etc.)
3. **Interaction Patterns** (hover states, clicks, transitions)
4. **Responsive Breakpoints** (mobile, tablet, desktop)
5. **Color Palette** (using brand colors)
6. **Typography System** (headings, body, numbers)
7. **Iconography** (consistent icon set)
8. **Loading States** (skeleton screens, spinners)
9. **Error States** (empty states, error messages)
10. **Accessibility Features** (keyboard nav, screen readers)
11. **Data Visualization Specs** (exact chart types, colors, interactions)
12. **Component Library** (reusable components with props)

**Priority Order:**
1. **Dashboard** (most critical - visual-heavy reporting)
2. **Survey Taking Page** (anonymous, simple, trustworthy)
3. **Survey Deployment** (Account Owner workflow)
4. **Login/Signup** (onboarding flow)
5. **Account Management** (settings, contacts)
6. **Billing** (subscription management)
7. **Reports** (detailed views, exports)

---

## **SPECIAL INSTRUCTIONS FOR V0**

### **Dashboard Design (CRITICAL):**
- **Visual-first:** Charts and graphs are the primary content
- **Team Experience Map:** Must be prominent, interactive, beautiful
- **Score Cards:** Large, clear, color-coded
- **Historical Trends:** Show progression over time clearly
- **Leadership Mirror:** Make gaps obvious and actionable
- **Mobile:** Simplify but don't hide data - stack vertically, make charts scrollable

### **Survey Taking Page:**
- **Trustworthy:** Clean, professional, no distractions
- **Simple:** One question at a time or clear scrollable form
- **Progress:** Show "Question 3 of 10" clearly
- **Mobile-optimized:** Large touch targets, easy to answer

### **Survey Deployment:**
- **Clear workflow:** Step-by-step, obvious next actions
- **Link display:** Prominent, easy to copy
- **Status indicators:** Clear visual feedback on deployment status
- **Response tracking:** Real-time counter, progress bar

### **Authentication Pages:**
- **Simple:** Clean forms, clear error messages
- **Branded:** Match site design
- **Helpful:** Clear instructions, recovery options

### **Account Management:**
- **Organized:** Clear sections (Company, Contacts, etc.)
- **Actions:** Obvious edit/delete buttons
- **Confirmation:** Clear dialogs for destructive actions

### **Billing:**
- **Transparent:** Clear pricing, obvious plan differences
- **Secure:** Stripe Elements, clear security indicators
- **History:** Easy-to-read invoice table

---

## **TECHNICAL STACK CONTEXT**

**Framework:** React (existing codebase uses React)
**Styling:** Tailwind CSS (existing codebase uses Tailwind)
**Charts:** Recharts or D3.js (for custom visualizations)
**API:** Vercel serverless functions (existing pattern)
**Database:** Supabase (PostgreSQL)
**Auth:** Supabase Auth (to be implemented)

**Existing Patterns:**
- Components in `/src/components/`
- Pages in `/src/pages/`
- API routes in `/api/`
- Uses React hooks, functional components
- Tailwind utility classes for styling

---

## **SUCCESS CRITERIA**

The design is successful if:

1. ✅ **Dashboard is visual-first** - Charts and graphs are primary, text is secondary
2. ✅ **Team Experience Map is beautiful and clear** - Users immediately understand their zone
3. ✅ **All scores are clearly displayed** - Large numbers, color-coded, with trends
4. ✅ **Mobile-responsive** - Works perfectly on all screen sizes
5. ✅ **Accessible** - Keyboard navigation, screen readers, high contrast
6. ✅ **Professional appearance** - Builds trust with business leaders
7. ✅ **Clear user flows** - Obvious next steps at every stage
8. ✅ **Error handling** - Graceful degradation, helpful messages
9. ✅ **Loading states** - Skeleton screens, spinners, progress indicators
10. ✅ **Consistent branding** - Matches existing site design

---

## **FINAL NOTES**

- **This is a B2B SaaS product** - Professional, trustworthy, data-driven
- **Target users are business leaders** - Not technical, need clear insights
- **Visual design is the differentiator** - Make data beautiful and actionable
- **Mobile is important** - Many users will access on mobile devices
- **Performance matters** - Fast loading, smooth interactions
- **Accessibility is required** - WCAG 2.1 AA compliance

**Design all views with these principles in mind. The dashboard is the centerpiece - make it exceptional.**

---

## **CRITICAL FIXES APPLIED (2026-01-XX)**

### **1. Trajectory Score Definition (LOCKED)**
- **Calculation:** Trajectory = DriftIndex(t) (preferred)
  - DriftIndex = mean of recent ALI deltas over K-1 surveys (where K=4)
  - **For K=4 surveys, DriftIndex uses the most recent 3 deltas (t−3→t−2, t−2→t−1, t−1→t)**
  - Stabilized: `0.5 × mean(ΔALI) + 0.5 × mean(ΔAnchorScore)`
- **Fallback:** Trajectory = ALI(t) − ALI(t−1) (quarter-over-quarter change)
  - **Use fallback ONLY if DriftIndex is null/unavailable due to insufficient prior surveys**
  - Never mix methods when DriftIndex exists
- **API Field:** `trajectory.method` indicates which calculation was used
- **Must match backend calculation exactly**

### **2. Standard Deviation (Not Variance)**
- **Fixed:** All references to "variance" changed to "stddev"
- **Clarity States:** High (≥70, stddev<8), Unstable (≥60, stddev≥8), Ambiguous (<60)
- **Reason:** Variance is squared-units; stddev is the correct metric

### **3. Two-Tier Minimum N (LOCKED)**
- **Team-level:** ≥5 responses
- **Org-level:** ≥10 responses (preferred)
- **Data Quality Rules:**
  - Overall < 10 but ≥ 5: Show results with "Data Quality" banner, suppress zone labeling and profile classification
  - Overall < 5: Show "Insufficient data"
  - Overall ≥ 10: Full dashboard enabled

### **4. Profile Matrix Included**
- Complete 3x3 matrix included in prompt for accurate UI design
- Protective honesty always maps to Operator (no exceptions)

### **5. Rolling Behavior Clarified**
- Rolling uses available surveys up to K=4 (not null if <4 exist)
- Profiles still require 3+ surveys regardless

### **6. Explicit API Fields for V0 Design Contract**
- V0 should design expecting these exact field names:
  - `scores.ali.current`, `scores.ali.rolling`
  - `drift.drift_index`, `drift.delta_ali`
  - `dataQuality.meets_minimum_n`
  - `responseCounts.overall`, `responseCounts.leader`, `responseCounts.team_member`
- Even if backend maps differently, V0 designs to this stable contract

---

**END OF PROMPT FOR V0**

- **Visual design is critical** - This is what differentiates ALI
- **Mobile-first** - Many users will access on mobile
- **Professional appearance** - Builds trust with business leaders
- **Clear data visualization** - Makes invisible cultural reality visible
- **Consistent branding** - Match existing site design

**This is the complete specification for the ALI system UI/UX. Design all views with these requirements in mind.**

---

**END OF PROMPT**

