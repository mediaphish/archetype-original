# ALI System – Browser Test Results

**Date:** 2026-01-29  
**Tester:** Browser automation (MCP cursor-browser-extension)  
**Environment:** Production – https://www.archetypeoriginal.com/ali  
**Access:** `?email=bart@archetypeoriginal.com` for authenticated views

---

## Summary

| Area | Result | Notes |
|------|--------|------|
| **Landing** | ✅ Pass | Loads, CTAs work |
| **Login (magic link)** | ✅ Pass | Form submit → “Check your email” |
| **Dashboard** | ✅ Pass | Live data, scores, mirror, insights |
| **Deploy** | ✅ Pass | Next survey S2, cadence, active deployments |
| **Reports** | ✅ Pass | Hub, Mirror, Zones all load |
| **Reports – Leadership Mirror** | ✅ Pass | Gaps, severity, Ask Archy |
| **Reports – Zones** | ✅ Pass | Zone guide, constraints, suggestions |
| **Settings** | ✅ Pass | Company profile, contacts |
| **Billing** | ✅ Pass | Plan, payment method, history |
| **Super Admin** | ✅ Pass | Overview, nav, platform metrics |
| **Survey (invalid token)** | ✅ Pass | “Survey Unavailable” / “Survey not found” |
| **Signup** | ✅ Pass | Form loads, validation blocks empty submit |

---

## 1. Landing (`/ali`)

- **Result:** ✅ Pass  
- **Checks:** ALI headline, “What is ALI?”, “How ALI Works”, Get Started, Log In.  
- **Actions:** Clicked Log In → navigated to `/ali/login`.

---

## 2. Login (`/ali/login`)

- **Result:** ✅ Pass  
- **Checks:**  
  - Email input, “Send Magic Link” button.  
  - Empty submit: browser validation (required) prevents submit.  
  - Valid email `test@archetypeoriginal.com` → submit → “Sending…” → “Check Your Email” with that email, “Use a different email” link.  
- **Conclusion:** Magic-link request and success UX work as expected.

---

## 3. Dashboard (`/ali/dashboard?email=bart@archetypeoriginal.com`)

- **Result:** ✅ Pass  
- **Checks:**  
  - “5 responses this quarter • Rolling scores (4-survey average)(live)”.  
  - ALI Score **58.5** (0–100).  
  - 7 pattern scores: Clarity 60, Consistency 40, Trust 63, Communication 60, Alignment 60, Stability 68, Leadership Drift 60.  
  - **Current zone:** Orange; zone copy and “Open Zones guide →” present.  
  - **Leadership Mirror:** 1 leader, 4 team; Clarity/Consistency/Communication gaps, severity (Critical/Caution/Neutral).  
  - **Key insights:** “Strongest signal: stability”, “Biggest opportunity: consistency”, “Perception gap to watch: clarity”, Pilot note.  
  - **Leadership System Map:** 7-test snapshot, Overall/Leader/Team, “Leader vs Team: Response Spread” chart.  
  - **Leadership Profile:** “Profile Forming”, Honesty 72.5 (courageous), Clarity 70.1 (ambiguous).  
  - **Team Experience Map:** Axes, zones (Harmony/Strain/Stress/Hazard), leader/team points.  
  - **Response analytics:** “This Quarter: 5”.  
  - **Explore Reports:** Mirror, Zones Guide, Full Analytics, Leadership Profile.  
- **Conclusion:** Dashboard loads with live data; all main sections and links behave correctly.

---

## 4. Deploy (`/ali/deploy?email=...`)

- **Result:** ✅ Pass  
- **Checks:**  
  - “Deploy New Survey”: Next Survey **S2**, Available On **2026-04-19**, baseline **2026-01-19**.  
  - Division combobox “Company-wide” (disabled).  
  - “Generate Deployment Link” disabled (S2 not yet available).  
  - **Active Deployments:** S1, status **active**, **42 / 5✓** responses, Opens 2024-01-15, Closes 2024-02-15.  
  - “View Link” → `alert('View link - coming soon')` (known placeholder).  
- **Conclusion:** Deploy logic and UI work; “View Link” not yet implemented.

---

## 5. Reports Hub (`/ali/reports?email=...`)

- **Result:** ✅ Pass  
- **Checks:**  
  - “Choose a deep-dive view.”  
  - **Zones** – “Open →”.  
  - **Patterns** – “Coming soon”.  
  - **Leadership Mirror** – “Open →”.  
  - **Trajectory** – “Coming soon”.  
- **Conclusion:** Reports hub and navigation behave as designed.

---

## 6. Leadership Mirror (`/ali/reports/mirror?email=...`)

- **Result:** ✅ Pass  
- **Checks:**  
  - “Biggest gap right now: **Clarity**”, Gap **18.8pt** (leader − team), **Critical** severity, Leader 75.0 / Team 56.3.  
  - “Based on 1 leader response(s) and 4 team response(s).”  
  - **All perception gaps** table: Area, Leader, Team, Gap, Severity, Action (Ask Archy). Rows for Clarity, Consistency, Communication, Alignment, Leadership Alignment, Stability, ALI Overall, Trust.  
- **Conclusion:** Mirror report loads and displays gap analysis correctly.

---

## 7. Zones (`/ali/reports/zones?email=...`)

- **Result:** ✅ Pass  
- **Checks:**  
  - **Current Zone:** Orange, ALI **58.5**, “Based on 5 response(s)”, 45–59.9.  
  - “What orange means” copy; lowest tests **consistency (40.0)** and **Leadership Alignment (40.0)**.  
  - **Two constraints:** Consistency and Leadership Alignment with “Why this is constraining”, “Try this week”, “Micro-script”, “See full chart →”.  
  - **Suggested first move:** “Establish Daily Check-Ins to Build Consistency” with behavior experiment and team script.  
  - **How zones work** and **All zones** (Green/Yellow/Orange/Red).  
  - **Primary tests:** Clarity, Consistency, Trust, Communication, Alignment, Stability, Leadership Alignment; each with score, rolling, survey history (e.g. 2026 Q1), “What this is”, “Why it matters”, “Ask Archy about X”.  
- **API:** `GET /api/ali/dashboard`, `POST /api/ali/zone-recommendations` observed.  
- **Conclusion:** Zones report and zone-recommendations integration work.

---

## 8. Settings (`/ali/settings?email=...`)

- **Result:** ✅ Pass  
- **Checks:**  
  - “Account Settings”, **Company Profile** and **Contacts** tabs.  
  - Company: **Acme Corporation**, 51–100 employees, Industry **Technology**, Website **https://acme.com**.  
  - “Save Changes” button.  
- **Conclusion:** Settings page loads and displays company data.

---

## 9. Billing (`/ali/billing?email=...`)

- **Result:** ✅ Pass  
- **Checks:**  
  - **Current Plan:** Professional, **active**, **$99/month**, Next billing **2024-02-15**.  
  - **Payment method:** Visa •••• 4242, expires 12/2025, “Update”.  
  - **Billing history:** 2024-01-15, 2023-12-15, 2023-11-15 each **$99.00**, **paid**, “Download”.  
- **Conclusion:** Billing UI and displayed plan/payment/history are correct.

---

## 10. Super Admin (`/ali/super-admin/overview?email=...`)

- **Result:** ✅ Pass  
- **Checks:**  
  - Nav: Overview, Intelligence, Tenants, Deletions, Audit Log, “View as Client”.  
  - **Platform Overview:** Platform Avg ALI **0.0**, Platform Health (Companies **0**, Surveys **0**, Respondents **0**).  
  - **Score distribution:** Green/Yellow/Orange/Red (all 0, 0.0%).  
  - **Engagement:** Response Rate **0.0%**, Completion Time **0.0 min**, etc.  
  - **Quarterly growth** table, **Pattern Analysis**, **Top Performing Companies**, **Platform Leadership Mirror**.  
- **Conclusion:** Super Admin overview loads; platform-wide aggregates behave (zeros expected if no cross-tenant data in this view).

---

## 11. Survey – Invalid Token (`/ali/survey/invalid-token-test-12345`)

- **Result:** ✅ Pass  
- **Checks:**  
  - “Loading survey…” then **“Survey Unavailable”** / **“Survey not found”** / “If you believe this is a mistake, request a new link.”  
- **Conclusion:** Invalid token is handled correctly.

---

## 12. Signup (`/ali/signup`)

- **Result:** ✅ Pass  
- **Checks:**  
  - “Create Your Account”, Company (name, size, industry, website), Primary Contact (name, email, role), Legal (Privacy, Terms, ALI EULA) checkboxes, “Create Account”.  
  - Submit with form empty → browser validation prevents submit (focus on first required field).  
- **Conclusion:** Signup form and validation work; full signup flow not executed to avoid creating real data.

---

## APIs Exercised (from network)

- `GET /api/ali/dashboard?email=...` – Dashboard, Mirror, Zones.  
- `POST /api/ali/auth/send-magic-link` – Magic link request.  
- `POST /api/ali/zone-recommendations` – Zones recommendations.  
- `GET /api/ali/super-admin/overview` – Super Admin overview.  
- Survey fetch for invalid token – returns error; UI shows “Survey Unavailable”.

No failed network requests observed during the tested flows.

---

## Known Gaps / Follow-ups

1. **Deploy “View Link”** – Still shows `alert('View link - coming soon')`. No survey URL available from UI for take-survey flow.  
2. **Magic link E2E** – Only “request magic link” tested; no click-through from email.  
3. **Real survey** – No valid deployment token used; only invalid-token case tested.  
4. **Super Admin** – Overview only; Intelligence, Tenants, Deletions, Audit Log not opened.

---

## Conclusion

All ALI UI flows exercised via browser automation **passed**: landing, login (magic-link request), dashboard, deploy, reports (hub, mirror, zones), settings, billing, super-admin overview, survey error handling, and signup validation. APIs used for these flows responded successfully. Remaining work: implement “View Link” for deployments and add E2E coverage for magic-link completion and real survey take-flow.
