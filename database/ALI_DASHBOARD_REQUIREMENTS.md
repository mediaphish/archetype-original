# ALI Dashboard Requirements for Account Owners

## Overview
The ALI Dashboard is the **centerpiece of the product** - it's where leaders see the invisible cultural reality their leadership creates. This is not a survey report. It's a **navigation instrument** that transforms data into actionable insight.

**Key Principle:** Visual-heavy reporting is the key to success. Leaders need to **see** their culture, not just read about it.

---

## 1. ACCOUNT CREATION & MANAGEMENT

### 1.1 Account Setup Flow
**Route:** `/ali/signup` or `/ali/onboarding`

**Features:**
- Company information form:
  - Company name (required, unique)
  - Company size (dropdown: 1-10, 11-50, 51-100, 101-250, 251-500, 500+)
  - Industry (optional)
  - Website (optional)
- Primary contact (Account Owner):
  - Full name (required)
  - Email (required, unique across system)
  - Role/title (optional)
- Pilot program toggle (if applicable)
- Terms acceptance
- Email verification

**Post-Signup:**
- Auto-create company in `ali_companies`
- Auto-create first contact as `account_owner`
- Send welcome email with:
  - Account credentials/login link
  - Next steps guide
  - Support contact info

### 1.2 Account Management Dashboard
**Route:** `/ali/settings` or `/ali/account`

**Features:**
- **Company Profile:**
  - Edit company name, size, industry, website
  - View company status (active, inactive, pilot)
  - View account creation date
  - View subscription status

- **Contact Management:**
  - List all contacts (Account Owners + View Only)
  - Add new contacts (email, name, role, permission level)
  - Edit contact details
  - Remove contacts (with confirmation)
  - Permission level indicators:
    - 🟢 Account Owner badge
    - 🔵 View Only badge

- **Division Management:**
  - List all divisions
  - Create new division (name, description, parent division)
  - Edit division details
  - Delete division (only if no sub-divisions)
  - Visual hierarchy tree view

- **Billing & Subscription:**
  - Current plan display
  - Payment method management
  - Invoice history
  - Upgrade/downgrade options
  - Cancel subscription (with retention flow)

---

## 2. PAYMENT PROCESSING

### 2.1 Payment Integration
**Service:** Stripe (recommended - already used elsewhere in codebase)

**Required Features:**
- **Subscription Management:**
  - Monthly/annual billing options
  - Per-company pricing (not per-user)
  - Free trial period (optional)
  - Pilot program discounts

- **Payment Methods:**
  - Credit card (Stripe Elements)
  - ACH/bank transfer (for enterprise)
  - Invoice billing (for enterprise)

- **Billing Dashboard:**
  - Current subscription status
  - Next billing date
  - Payment method on file
  - Billing history (downloadable invoices)
  - Usage metrics (surveys deployed, responses collected)

### 2.2 Pricing Tiers (Suggested)
- **Starter:** $X/month - 1 company, 4 surveys/year, basic reporting
- **Professional:** $Y/month - 1 company, unlimited surveys, full reporting, Team Experience Map
- **Enterprise:** Custom pricing - Multiple companies, white-label, API access, dedicated support

### 2.3 Payment Flow
1. Account signup → Free trial (if applicable)
2. Trial ends → Payment required to continue
3. Payment success → Account activated
4. Payment failure → Grace period → Account suspended
5. Account suspended → Cannot deploy surveys or view results

**Database Schema Needed:**
```sql
-- Add to ali_companies
ALTER TABLE ali_companies ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE ali_companies ADD COLUMN subscription_status TEXT DEFAULT 'trial' 
  CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'suspended'));
ALTER TABLE ali_companies ADD COLUMN subscription_plan TEXT;
ALTER TABLE ali_companies ADD COLUMN subscription_started_at TIMESTAMPTZ;
ALTER TABLE ali_companies ADD COLUMN subscription_ends_at TIMESTAMPTZ;
ALTER TABLE ali_companies ADD COLUMN trial_ends_at TIMESTAMPTZ;
```

---

## 3. LINK DELIVERY FOR DISTRIBUTION

### 3.1 Survey Deployment Interface
**Route:** `/ali/deploy` (Account Owner only)

**Features:**
- **Deploy New Survey:**
  - Survey selection (S1, S2, S3, etc. - auto-calculated based on cadence)
  - Division selection:
    - Company-wide (default)
    - Specific division (dropdown)
    - Multiple divisions (checkbox list)
  - Deployment settings:
    - Opens at (date/time picker)
    - Closes at (date/time picker)
    - Minimum responses (default: 5)
  - Generate deployment button

- **Deployment Link Display:**
  - Unique survey URL: `https://archetypeoriginal.com/ali/survey/{token}`
  - Copy link button (one-click copy)
  - QR code generation (for in-person distribution)
  - Email template with link (send to team)
  - Share options:
    - Email
    - Slack
    - Microsoft Teams
    - Copy link

- **Active Deployments List:**
  - All active deployments (table view)
  - Columns:
    - Survey (S1, S2, etc.)
    - Division (or "Company-wide")
    - Status (pending, active, closed)
    - Responses (X / minimum)
    - Opens at / Closes at
    - Actions (view link, close, archive)

- **Deployment Management:**
  - Close deployment early
  - Extend closing date
  - View response count (real-time)
  - Resend link to team
  - Archive completed deployments

### 3.2 Link Distribution Features
- **Email Integration:**
  - Pre-built email templates
  - Customizable message
  - Bulk email to team (via Resend)
  - Email tracking (opened, clicked)

- **Reminder System:**
  - Auto-reminder emails (configurable)
  - Reminder schedule (e.g., 3 days, 1 week after deployment)
  - Manual reminder button

- **Response Tracking:**
  - Real-time response counter
  - Progress bar (X / minimum responses)
  - "Results available" indicator (when threshold met)

---

## 4. VISUAL-HEAVY REPORTING (KEY TO SUCCESS)

### 4.1 Dashboard Overview
**Route:** `/ali/dashboard` (Account Owner + View Only)

**Layout:**
- Top navigation: Overview | Reports | Deployments | Settings
- Left sidebar: Company info, subscription status, quick stats
- Main content: Visual reports (full-width, scrollable)

### 4.2 Core Visualizations

#### A. Team Experience Map (PRIMARY VISUALIZATION)
**Purpose:** Show where the team currently sits across four zones

**Visual Design:**
- **Four-zone quadrant chart:**
  - X-axis: Clarity (Low → High)
  - Y-axis: Trust/Stability (Low → High)
  - Four zones:
    1. **Harmony Zone** (top-right) - Green
    2. **Strain Zone** (top-left) - Yellow
    3. **Stress Zone** (bottom-left) - Orange
    4. **Hazard Zone** (bottom-right) - Red

- **Interactive Features:**
  - Hover to see zone description
  - Click to drill down into zone details
  - Animated transition when data updates
  - Historical position markers (previous quarters)

- **Data Points:**
  - Current position (large dot)
  - Previous quarter positions (smaller dots, connected by line)
  - Trajectory arrow (showing direction of movement)
  - Zone boundaries (clearly marked)

**Implementation:**
- Use D3.js or Recharts for custom visualization
- Responsive design (mobile-friendly)
- Export as PNG/PDF

#### B. Score Dashboard (Four Core Scores)
**Layout:** Four large cards in a row (or 2x2 grid on mobile)

**1. Alignment Score**
- Large number display (0-100)
- Circular progress indicator
- Trend indicator (↑ improving, ↓ declining, → stable)
- Comparison to previous quarter
- Color coding:
  - Green: 70-100 (strong alignment)
  - Yellow: 50-69 (moderate alignment)
  - Orange: 30-49 (weak alignment)
  - Red: 0-29 (poor alignment)

**2. Stability Score**
- Same format as Alignment
- Focus on predictability and safety
- Historical trend line (mini chart)

**3. Clarity Score**
- Same format as Alignment
- Focus on communication and expectations
- Historical trend line

**4. Trajectory Score** (The Secret Weapon)
- Most prominent display
- Shows momentum (improving, declining, stable)
- Large arrow indicator (direction + magnitude)
- Quarter-over-quarter comparison
- Color coding:
  - Green: Improving
  - Yellow: Stable
  - Red: Declining

#### C. Pattern Analysis (7 Leadership Patterns)
**Layout:** Seven cards in a grid (or scrollable row)

**Each Pattern Card:**
- Pattern name (Clarity, Consistency, Trust, etc.)
- Current score (0-100)
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

#### D. Historical Trends
**Layout:** Large line/area chart

**Features:**
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
  - Threshold markers (e.g., "Harmony Zone boundary")

#### E. Division Comparison
**Layout:** Side-by-side comparison cards or stacked bar chart

**Features:**
- Compare divisions (if company has multiple)
- Each division shows:
  - Zone position (Team Experience Map mini version)
  - Core scores
  - Response count
- Filter by division
- Aggregate view (all divisions combined)

#### F. Response Analytics
**Layout:** Dashboard cards + table

**Metrics:**
- Total responses (all time)
- Responses this quarter
- Response rate (if team size known)
- Average completion time
- Device breakdown (mobile vs. desktop)
- Division breakdown

**Table:**
- List of all deployments
- Response count per deployment
- Completion status
- Date range

### 4.3 Report Views

#### Quarterly Report View
**Route:** `/ali/dashboard/report/:quarterId`

**Features:**
- Full-page report (printable)
- Executive summary section
- All visualizations (full-size)
- Narrative insights (AI-generated or template-based)
- Action items/recommendations
- Export options:
  - PDF (formatted for presentation)
  - PNG (individual charts)
  - CSV (raw data)

#### Comparison View
**Route:** `/ali/dashboard/compare`

**Features:**
- Side-by-side quarter comparison
- Change indicators (↑↓)
- Highlighted improvements/declines
- Narrative summary of changes

#### Detailed Pattern View
**Route:** `/ali/dashboard/pattern/:patternName`

**Features:**
- Deep dive into one pattern
- Question-level breakdown
- Leader vs. Team Member responses
- Historical trend for this pattern
- Actionable recommendations

### 4.4 Visual Design Requirements

**Color Palette:**
- Harmony Zone: `#10B981` (green-500)
- Strain Zone: `#F59E0B` (yellow-500)
- Stress Zone: `#F97316` (orange-500)
- Hazard Zone: `#EF4444` (red-500)
- Neutral: `#6B7280` (gray-500)
- Accent: `#C85A3C` (brand orange)

**Typography:**
- Headings: Serif font (matches brand)
- Body: Sans-serif (readable)
- Numbers: Monospace (for scores)

**Charts:**
- High contrast for accessibility
- Tooltips on hover
- Legends clearly labeled
- Responsive (mobile-friendly)
- Print-friendly (when exported)

**Animations:**
- Smooth transitions when data loads
- Subtle hover effects
- Loading states (skeleton screens)
- No jarring movements

### 4.5 Data Requirements

**Minimum Threshold:**
- Results only visible when ≥5 responses
- Clear messaging: "X more responses needed"
- Progress indicator

**Real-time Updates:**
- Auto-refresh when new responses come in
- WebSocket or polling (every 30 seconds)
- Visual indicator when data is updating

**Data Aggregation:**
- All scores calculated server-side
- Cached for performance
- Recalculate on new response

---

## 5. ADDITIONAL DASHBOARD FEATURES

### 5.1 Notifications & Alerts
- Email notifications:
  - Survey threshold met (results available)
  - New survey deployed
  - Score changes (significant)
  - Zone transitions (e.g., moved to Hazard Zone)
- In-app notifications:
  - Badge counts
  - Toast messages
  - Alert banner (for critical changes)

### 5.2 Export & Sharing
- Export full report (PDF)
- Export individual charts (PNG)
- Export raw data (CSV)
- Share report link (read-only, password-protected)
- Email report to stakeholders

### 5.3 Help & Onboarding
- Tooltips on first visit
- Guided tour (for new users)
- Help center link
- Video tutorials
- FAQ section

### 5.4 Mobile Responsiveness
- All visualizations responsive
- Touch-friendly interactions
- Mobile-optimized navigation
- Simplified views for small screens

---

## 6. TECHNICAL IMPLEMENTATION NOTES

### 6.1 Charting Libraries
**Recommended:**
- **Recharts** (React) - Good for standard charts
- **D3.js** - For custom visualizations (Team Experience Map)
- **Chart.js** - Alternative, simpler option

### 6.2 API Endpoints Needed
```
GET /api/ali/dashboard/:companyId
  - Returns: All dashboard data (scores, trends, deployments)

GET /api/ali/report/:deploymentId
  - Returns: Detailed report for specific deployment

GET /api/ali/scores/:companyId
  - Returns: Calculated scores (Alignment, Stability, Clarity, Trajectory)

GET /api/ali/trends/:companyId
  - Returns: Historical trend data

GET /api/ali/experience-map/:companyId
  - Returns: Team Experience Map coordinates and zone data
```

### 6.3 Performance Considerations
- Cache calculated scores (recalculate on new response)
- Lazy load historical data
- Paginate deployment lists
- Optimize chart rendering (virtual scrolling for large datasets)

### 6.4 Security
- RLS policies enforce company-level access
- View Only users: Read-only dashboard
- Account Owners: Full access
- Export links: Time-limited, password-protected

---

## 7. PRIORITY IMPLEMENTATION ORDER

### Phase 1: MVP Dashboard (Critical)
1. ✅ Account creation/signup
2. ✅ Basic dashboard layout
3. ✅ Score cards (4 core scores)
4. ✅ Deployment interface (link generation)
5. ✅ Response tracking

### Phase 2: Visual Reporting (High Priority)
1. ✅ Team Experience Map (primary visualization)
2. ✅ Historical trends chart
3. ✅ Pattern analysis cards
4. ✅ Division comparison

### Phase 3: Payment & Billing
1. ✅ Stripe integration
2. ✅ Subscription management
3. ✅ Billing dashboard
4. ✅ Invoice generation

### Phase 4: Advanced Features
1. ✅ Export functionality
2. ✅ Email notifications
3. ✅ Advanced filtering
4. ✅ Custom reports

---

## 8. SUCCESS METRICS

**Dashboard Engagement:**
- Time spent on dashboard
- Report views/downloads
- Feature usage (which visualizations are most viewed)

**User Satisfaction:**
- NPS score
- Feature requests
- Support tickets

**Business Impact:**
- Subscription retention
- Upgrade rate
- Churn rate

---

## SUMMARY

The ALI Dashboard is **the product**. It's not a nice-to-have - it's the core value proposition. Leaders need to:

1. **See** their culture (visual, not text-heavy)
2. **Understand** what's changing (trends, not snapshots)
3. **Know** where to focus (actionable insights)
4. **Track** progress over time (longitudinal data)

**Key Principle:** If leaders can't see it, they can't fix it. The dashboard makes invisible cultural reality visible.

**Visual-first design is non-negotiable.** This is what differentiates ALI from every other leadership assessment tool.

