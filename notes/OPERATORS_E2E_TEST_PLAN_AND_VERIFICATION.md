# The Operators — full path: interest → approval → RSVP → votes → ROi pot

This document is the **master checklist** for what you asked to verify: the full journey a person could take (request to join, approval, RSVP, sign in, up/down votes, and the night’s pot / winner), plus **what was actually run** on the live public site and **where automation stopped cold**.

**Update — live execution (May 4, 2026):**  
Automated browser sessions and public API checks were run against `https://www.archetypeoriginal.com` while the temporary testing login bypass was enabled for Operators. Results are summarized in **Live run summary** (below) and repeated under each flow.

---

## Live run summary (May 4, 2026)

| Area | Result |
| --- | --- |
| **Public “Request Access” form** (`/operators`) | Form filled and submitted end-to-end in a real browser. The page showed **“We could not save your application. Please try again in a moment.”** The submission **did not** complete successfully from automation’s perspective (server/database side — confirm whether a row was written to `operators_interest` or retry manually). Test payload used email `operators.e2e.browser.20260504@example.com`. |
| **Membership lookup for the bypass email** (`bartpaden@gmail.com`) | `GET /api/operators/users/me` returned **`User not found in Operators system`**. That means **the bypass lets the browser into Operators screens**, but **server actions that depend on a real membership row** (RSVP, voting, etc.) can still **fail permission checks**. |
| **RSVP** (`POST .../rsvp` on LIVE test event) | **`You do not have permission to RSVP`** — consistent with rules that only **operator** or **candidate** roles may RSVP; Chief Operator alone does **not** RSVP via this endpoint. |
| **Voting** (`POST .../votes` on an OPEN event) | **`You do not have permission to vote`** — same underlying issue: server-side roles for that email did not grant vote permission at test time. |
| **OPEN event page** (May 19 Operators Meeting) | Page loaded; **no voting controls appeared** in the accessibility snapshot (consistent with no vote permission / check-in gating in product rules). |
| **CLOSED event — ROi / pot display** (ROI Test Event - Jan 2026, id `d39f3574-3083-4a6e-a7ec-d53067e85956`) | **Worked as a read-only verification:** **Event Outcomes** showed **ROi Winner:** Operator01, **Pot Won:** $305.00, net score and vote tallies. This confirms the **winner/pot presentation path** on a closed night **when data exists**. |
| **Candidates approval UI** (`/operators/candidates`) | Page loaded; filters present; list showed **“No candidates found”** (empty queue at test time — approval buttons had nothing to act on). |

### Critical takeaway for the next test pass

1. **Pick one email that already exists in `operators_users`** with the roles you need for the step you’re testing (**operator** or **candidate** for RSVP and votes per server rules), **or** create that row before testing.  
2. Put **that same email** in the temporary bypass setting (`VITE_OPERATORS_BYPASS_EMAIL`) so the browser session and the database agree.  
3. Until those match, **full “happy path” automation cannot complete** — not because the UI is missing, but because **the server correctly rejects actions for accounts that aren’t set up as Operators membership**.

---

## Important: two different “request to join” paths

| Path | What it is | Approval inside this product? |
| --- | --- | --- |
| **Public marketing form** | `/operators` → saves to **`operators_interest`**. | **No dedicated queue screen** in this app yet. Follow-up is manual (database / email / process), then you create **`operators_users`** (+ roles) when you onboard someone. |
| **Candidate (invited to an event)** | Someone submits a candidate application on a **LIVE** event → **`operators_candidates`** → Chief Operator approves on **`/operators/candidates`** or the event page. | **Yes** — flows exist in the product. |

Your original question blends both. Treat **public interest** as “capture + manual onboarding,” and **candidate** as “in-app approval pipeline.”

---

## Preconditions (all flows)

- Tables exist in Supabase (`operators_interest`, `operators_users`, `operators_events`, etc.) per your migrations.
- **Magic link:** user must exist in **`operators_users`** with appropriate **roles** before `/operators/login` will behave normally (without testing bypass).
- Event lifecycle: **LIVE → OPEN → CLOSED** (see `notes/OPERATORS_USER_FLOWS_CANDIDATES_AND_OPERATORS.md`).

---

## Flow A — Public interest (marketing landing)

| Step | Actor | Action |
| --- | --- | --- |
| A1 | Visitor | Open `/operators`, scroll to **Request Access**, fill name, email, role/title, company size, bio (≥ 100 characters). |
| A2 | Visitor | Submit → browser posts to **`POST /api/operators/interest/submit`**. |
| A3 | System | Row should appear in **`operators_interest`** with pending/review status (confirm in Supabase if unsure). |
| A4 | Staff | Outside the app: review, then create **`operators_users`** (+ roles) when inviting someone to log in. |

**Live run (May 2026):** Automation submitted the form; **server responded with an error message on the page** (see summary table). **Database insert not confirmed from here.**

**Files:** `api/operators/interest/submit.js`, `src/pages/operators/Landing.jsx`.

---

## Flow B — Candidate invite + approval (in-app)

| Step | Actor | Action |
| --- | --- | --- |
| B1 | Operator | Event is **LIVE**. On event detail: invite candidate → essay (200+ words per validation), contact info, candidate email. |
| B2 | API | **`POST /api/operators/candidates/submit`** creates **`operators_candidates`** and ties user records as designed. |
| B3 | Chief Operator | **`/operators/candidates`** (filter **pending**) and/or event detail **Approve** / **Deny**. |
| B4 | Candidate | **`/operators/login`** → dashboard / events (magic link or testing bypass). |

**Live run (May 2026):** `/operators/candidates` loaded; **no pending rows** — approve/deny buttons were not exercised against real data.

**Files:** `api/operators/candidates/submit.js`, `api/operators/candidates/[id]/approve.js`, `src/pages/operators/Candidates.jsx`, `src/pages/operators/EventDetail.jsx`.

---

## Flow C — RSVP for a LIVE event

| Step | Actor | Action |
| --- | --- | --- |
| C1 | Operator or approved candidate | `/operators/events` or dashboard → open a **LIVE** event. |
| C2 | User | Tap **RSVP** (or join waitlist if full). |
| C3 | API | **`POST /api/operators/events/:id/rsvp`** with `{ email, action: 'rsvp' }`. |

**Permission rule (server):** Only **`operator`** or **`candidate`** may RSVP — **not** Chief Operator by role alone (`lib/operators/permissions.js`).

**Live run (May 2026):** Direct API test returned **`You do not have permission to RSVP`** for `bartpaden@gmail.com`. **RSVP success path not demonstrated** until the test account has the right membership row and roles.

---

## Flow D — Event night: OPEN → vote up / down

| Step | Actor | Action |
| --- | --- | --- |
| D1 | Chief Operator / staff | Move event from **LIVE** to **OPEN** (“Start event”). |
| D2 | Accountant (typical) | Check in attendees who RSVP’d. |
| D3 | Operator | On **OPEN** event detail: cast votes (budget/rules per product). |
| D4 | API | **`POST /api/operators/events/:id/votes`** with vote payload. |

**Live run (May 2026):** Vote API returned **`You do not have permission to vote`** for the bypass email used. OPEN event page showed **no voting UI** in automation snapshots (consistent with permissions / gating).

---

## Flow E — Close event → ROi winner (“pot for the night”)

| Step | Actor | Action |
| --- | --- | --- |
| E1 | Authorized role | **Close event** from OPEN. |
| E2 | API / database | Close pipeline runs **`calculate_roi_winner`** (and related writes). |
| E3 | Viewer | **CLOSED** event detail shows **Event Outcomes** (winner, pot, stats). |

**Live run (May 2026):** **Confirmed on CLOSED event “ROI Test Event - Jan 2026”:** ROi winner label **Operator01**, **Pot Won** **$305.00**, plus score summaries — **winner/pot display path works** when the event is closed and data exists.

---

## Pressure-test matrix (every step — how to stress it)

Use staging or a dedicated test event when possible so real members are not affected.

| Step | What could go wrong | How to stress-test |
| --- | --- | --- |
| **Interest submit** | Spam, duplicates, oversized fields | Rapid repeated submits; same email twice; bio just under/over 100 chars; very long strings; malformed JSON if calling API directly. |
| **Onboarding** | Person thinks they’re “in” but no DB row | Try login after interest only — should **not** unlock Operators until **`operators_users`** exists. |
| **Candidate submit** | Weak validation | Essay under 200 words; missing fields; duplicate candidate same event. |
| **Approve / deny** | Wrong role | Attempt approve while logged in as non–Chief Operator (expect refusal). |
| **RSVP** | Capacity, timing | Fill last seat with two browsers; cancel inside/outside 24h window; RSVP while benched or with owed balance (expect block). |
| **OPEN voting** | Budget / rules | Exhaust vote budget; attempt self-vote if forbidden; vote after close; double-click / rapid repeats. |
| **Check-in** | Wrong state | Check-in when event not OPEN; no-show then vote. |
| **Close / ROi** | Edge cases | Close with no check-ins; ties; RPC failure paths documented in `close` handler. |

**Live run (May 2026):** These stress cases were **not** all executed automatically — only **spot checks** and API probes were done. The matrix remains the **manual / scripted** agenda for a full stress pass.

---

## Automated vs manual testing (honest scope)

| Mechanism | What it’s good for | Limit |
| --- | --- | --- |
| **Browser automation (this run)** | Public form, navigation, read-only CLOSED outcomes, empty-state screens | Cannot grant database roles or receive magic links **unless** you align bypass email + `operators_users` + event state. |
| **Direct API calls** | Permission checks, quick probes | Same membership rules as the UI. |
| **Unit tests in repo** | Regression on pure functions | Last known issue: Jest environment missed `@babel/preset-env` in one environment — fix if you want CI green. |
| **Cypress specs** | Scripted repeats once base URL + data are stable | Needs configured run environment; mocks don’t replace permission truth. |

---

## Changed files

- `notes/OPERATORS_E2E_TEST_PLAN_AND_VERIFICATION.md` (this file — rewritten after live execution)
