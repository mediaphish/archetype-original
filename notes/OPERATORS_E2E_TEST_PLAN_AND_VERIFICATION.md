# The Operators — end-to-end path: interest → approval → RSVP → votes → ROi pot

This note answers three questions:

1. **Can this workspace automatically “run through” every step as a real user?**  
   **No.** Signing in uses your live database, email links, and roles only your team controls. What we *can* do is trace the code and APIs, list exact steps for humans or staging accounts, run automated tests where the project’s test runner is healthy, and call out gaps (missing screens, manual DB steps).

2. **What is every step in order?**  
   See **§ Flow A–E** below. There are **two different “request to join” paths** today.

3. **How do you pressure-test each step?**  
   See **§ Pressure-test matrix** at the end.

---

## Important: two “join” paths (do not confuse them)

| Path | What it is | Approval in the app? |
| --- | --- | --- |
| **Public marketing form** | `/operators` → form posts to `POST /api/operators/interest/submit` → rows in **`operators_interest`**. | **No dedicated admin page** in this codebase yet. Review is expected to be **manual** (Supabase table, email, or internal process) until a queue UI is built. After you accept someone, they still need a row in **`operators_users`** (and usually roles) before magic link works. |
| **Candidate invite (event-scoped)** | Operator uses **Invite Candidate** on a **LIVE** event → `operators_candidates` → **Chief Operator / Super Admin** approves on **`/operators/candidates`** or the event page. | **Yes** — built into the product. |

Your question mixes both: **“Requesting to join through the approval process”** most closely matches **Path B** if you mean the in-app candidate pipeline. If you mean the **new public interest form**, treat **Path A** as “capture interest,” then **manual onboarding** into `operators_users`.

---

## Preconditions (all flows)

- **`operators_interest` table** exists in Supabase if you use the public form (`database/OPERATORS_INTEREST_SCHEMA.sql`).
- User **must** have a row in **`operators_users`** with the right **roles** for magic link to succeed (`/operators/login`).
- Events move **LIVE → OPEN → CLOSED** (see `notes/OPERATORS_USER_FLOWS_CANDIDATES_AND_OPERATORS.md`).

---

## Flow A — Public interest (marketing landing)

| Step | Actor | Where / what |
| --- | --- | --- |
| A1 | Visitor | Open `/operators`, fill **Request Access** (name, email, role, company size, bio ≥ 100 chars). |
| A2 | Browser | `POST /api/operators/interest/submit` inserts into **`operators_interest`** (`status` pending). |
| A3 | Staff | **Outside the app today:** review rows (e.g. Supabase), decide fit, then **create/update** `operators_users` (and roles) when you’re ready to onboard. |
| A4 | New member | Receive instructions from staff; use **`/operators/login`** once `operators_users` exists. |

**Code verified:** `api/operators/interest/submit.js`, landing form in `src/pages/operators/Landing.jsx`.  
**Not verified live:** End-to-end insert against your production DB from this environment.

---

## Flow B — Candidate invite + approval (in-app)

| Step | Actor | Where / what |
| --- | --- | --- |
| B1 | Operator | Event is **LIVE**. On event detail: **Invite Candidate** → essay (200+ words per schema), contact info, email. |
| B2 | API | `POST /api/operators/candidates/submit` creates **`operators_candidates`** (pending) and ensures **`operators_users`** exists for candidate email (typically **`candidate`** role). |
| B3 | Chief Operator or Super Admin | **`/operators/candidates`** (global) and/or **Pending Candidates** on event detail: **Approve** or **Deny**. |
| B4 | API | Approve: `POST /api/operators/candidates/:id/approve` — updates candidate row; creates/updates **`operators_users`** with bio fields; candidate remains **`candidate`** until promotion rules fire. |
| B5 | Candidate | **`/operators/login`** → dashboard/events. |

**Code verified:** `api/operators/candidates/submit.js`, `api/operators/candidates/[id]/approve.js`, `src/pages/operators/Candidates.jsx`, `EventDetail.jsx` invite + approve sections.

---

## Flow C — RSVP for a LIVE event

| Step | Actor | Where / what |
| --- | --- | --- |
| C1 | Operator or approved Candidate | **`/operators/events`** → open a **LIVE** event. |
| C2 | User | **RSVP** (or waitlist if full). |
| C3 | API | `POST /api/operators/events/:id/rsvp` with `{ email, action: 'rsvp' }`. |

**Code verified:** RSVP handlers and UI blocks in `EventDetail.jsx`, API under `api/operators/events/[id]/rsvp.js`.

---

## Flow D — Event night: OPEN → vote up/down

| Step | Actor | Where / what |
| --- | --- | --- |
| D1 | Chief Operator | Event **Start** → state **OPEN** (from **LIVE**). |
| D2 | Accountant (typical) | **Check-in** for attendees who RSVP’d (`POST .../check-in`). |
| D3 | Operator | On event detail (OPEN): voting UI for **other** attendees; **10 votes** budget per event; cannot vote for self. |
| D4 | API | `POST /api/operators/events/:id/votes` with `vote_value` ±1. |

**Code verified:** `EventDetail.jsx` voting block; votes API.  
**Note:** UI shows voting for **`operator`** role; candidates may be restricted from the voting UI even if other code paths mention candidates—confirm with your product expectation (`notes/OPERATORS_USER_FLOWS_CANDIDATES_AND_OPERATORS.md`).

---

## Flow E — Close event → ROi winner (“pot for the night”)

| Step | Actor | Where / what |
| --- | --- | --- |
| E1 | Chief Operator or Accountant | Event detail (OPEN): **Close Event**. |
| E2 | API | `POST /api/operators/events/:id/close` — finalizes attendance fields, then calls **`calculate_roi_winner`** (`supabase.rpc`), with **manual fallback** in code if the RPC returns nothing. Writes **`operators_roi_winners`**, handles promotions/offenses per implementation. |
| E3 | Anyone allowed | Event **CLOSED**: event detail shows **Event Outcomes** (ROi winner, pot display when data exists). |
| E4 | Optional | `GET /api/operators/events/:id/roi` reads stored winner for CLOSED events. |

**Code verified:** `api/operators/events/[id]/close.js`, `database/operators_schema.sql` function `calculate_roi_winner`, `api/operators/events/[id]/roi.js`.

---

## What was “verified” from this workspace vs what was not

| Item | Status |
| --- | --- |
| API routes and main UI locations for each step | **Read from codebase** — consistent with tables above. |
| Full browser run on archetypeoriginal.com with real accounts | **Not run** (no credentials; cannot complete magic link). |
| Jest (`npm test` with operators tests) | **Failed in this environment** (`Cannot find module '@babel/preset-env'`). Fix devDependencies / CI if you want automated unit tests locally. |
| Cypress (`npm run test:e2e`) | **Not run** here; specs under `cypress/e2e/operators/` are **mock-heavy** (e.g. intercepts) and need a configured base URL + app running. |

---

## Recommended manual test script (single staging event)

Use **test emails** you control, all present in **`operators_users`**.

1. **CO / SA:** Create or pick a **LIVE** event with future date, seats, stake.  
2. **Operator:** Invite candidate **B** → submit.  
3. **CO:** Approve candidate **B** on `/operators/candidates`.  
4. **B:** Magic link login → RSVP.  
5. **CO:** Close RSVP / generate scenarios if your night requires it → **Start event** (OPEN).  
6. **Accountant:** Check in attendees including **B** and operators who will vote.  
7. **Two operators:** Cast votes (including edge: 0 remaining votes, vote for self attempt).  
8. **CO/Accountant:** **Close event**.  
9. **All:** Confirm **CLOSED** event detail shows winner; optional: compare **`operators_roi_winners`** row to DB function output.  
10. **Optional parallel:** Submit **public interest** form; confirm row in **`operators_interest`** and document your **manual** follow-up to create **`operators_users`**.

---

## Pressure-test matrix (by step)

| Step | Risk | Suggested stress |
| --- | --- | --- |
| Interest submit | Spam / duplicates | Many rapid POSTs; same email twice; oversized bio; invalid JSON. |
| Candidate submit | Validation bypass | Essay &lt; 200 words; missing fields; duplicate candidate same event. |
| Approve | Permission | Non-CO user calling approve API (expect 403). |
| RSVP | Race / capacity | Two users last seat; waitlist promotion; cancel RSVP inside/outside 24h window. |
| OPEN votes | Budget | 11th vote; rapid double-click; vote after close; network retry duplicate POSTs (if idempotent). |
| Check-in | State | Check-in when not OPEN; mark no-show then vote. |
| Close | Order of operations | Close with no check-ins; close with RPC failure (manual path in `close.js`). |
| ROi | Eligibility | Tie scores; CO excluded from winning per rules; benched / owed balance users per DB function. |

---

## Gaps to be aware of (product / engineering)

1. **`operators_interest`** has **no in-app review queue** yet—your “approval” for public applicants is **process + DB**, not a button in this repo.  
2. **Automated E2E** is limited until Jest/Cypress env is fixed and tests assert real APIs or a staging Supabase.  
3. **Promotion to `operator`** is tied to **close** logic and **`operators_promotions`** data—confirm per event that DB rows exist if you expect auto-promotion.

---

## Changed files

- `notes/OPERATORS_E2E_TEST_PLAN_AND_VERIFICATION.md` (this file)
