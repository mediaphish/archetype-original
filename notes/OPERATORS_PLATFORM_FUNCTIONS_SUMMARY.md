# The Operators — functions, roles, and where they live

This note summarizes how **The Operators** product works in the Archetype Original codebase: who can do what, which pages exist, and which server routes back them. It is **not** a user manual for end users; it is a **map** for you and anyone maintaining the system.

**Related long-form docs (repo root, more detail):** [OPERATORS_PLATFORM_FEATURES.md](../OPERATORS_PLATFORM_FEATURES.md), [OPERATORS_PLATFORM_VERBOSE_SUMMARY.md](../OPERATORS_PLATFORM_VERBOSE_SUMMARY.md), [TESTING_PLAN_OPERATORS.md](../TESTING_PLAN_OPERATORS.md).

---

## 1. What it is (one paragraph)

The Operators is an **invitation-only** web app for a peer community: **events**, **RSVPs**, **check-in**, **voting**, **ROI / outcomes**, and **candidate applications** (apply to join, get approved, then get promoted to full operator). There is **no** open self-serve “create an account from the public page” flow—an email must **already exist** in the membership table before a magic link can complete sign-in.

---

## 2. Membership and sign-in

| Piece | Behavior |
| --- | --- |
| **Who can log in** | Rows in Supabase table `operators_users` (email + roles + profile/card fields). |
| **Magic link send** | `POST /api/operators/auth/send-magic-link` — only sends a link if that email **already** has a membership row (invite-only). |
| **Magic link verify** | `GET /api/operators/auth/verify-magic-link` — validates token, marks it used, then redirects into the app **only if** the email still exists in `operators_users`. |
| **Frontend session** | Operators screens expect `operators_email` in `localStorage` (and often `?email=` on URLs during testing). |

**Bootstrap a super admin / owner:** see [database/operators_setup_user.sql](../database/operators_setup_user.sql) (adjust email to match what you type at login).

---

## 3. Roles (stored on each user)

Roles are a **string array** on `operators_users.roles`. Typical values:

| Role | Plain-language purpose |
| --- | --- |
| **super_admin** | Full platform authority; Admin tools; bypasses most fine-grained checks. |
| **chief_operator** | Creates/edits events, approves/denies candidates, runs much of event lifecycle. |
| **operator** | Full member; RSVP, attend, vote (when rules allow). |
| **candidate** | Applicant path; limited actions until promoted. |
| **accountant** | Check-in, offenses, close/open coordination with CO on events. |

One person can hold **multiple** roles (e.g. super_admin + chief_operator).

---

## 4. App pages (React) and routes

All under **`/operators`** unless noted. Implemented as lazy-loaded pages from [src/App.jsx](../src/App.jsx).

| Route | Page component | Purpose |
| --- | --- | --- |
| `/operators` | `Landing.jsx` | Public marketing-style landing; CTAs go to login. |
| `/operators/login` | `Login.jsx` | Request magic link by email. |
| `/operators/events` | `Events.jsx` | List / browse events. |
| `/operators/events/new` | `CreateEvent.jsx` | Create event (chief_operator capability). |
| `/operators/events/:id` | `EventDetail.jsx` | Single event: RSVP, scenarios, voting UI, candidate invites/approvals **per event** where UI allows. |
| `/operators/events/:id/edit` | `EditEvent.jsx` | Edit event details. |
| `/operators/dashboard` | `Dashboard.jsx` | Metrics / summaries (uses dashboard API). |
| `/operators/candidates` | `Candidates.jsx` | **Global** list of candidates across events; approve / deny. |
| `/operators/admin` | `Admin.jsx` | **Super admin**: list users, promote to chief operator, reverse offenses, etc. |
| `/operators/profile` | `Profile.jsx` | User profile / headshot / settings as implemented. |

Unknown `/operators/*` paths fall back to landing per router logic.

---

## 5. Header navigation (who sees what)

[src/components/operators/OperatorsHeader.jsx](../src/components/operators/OperatorsHeader.jsx)

| Nav item | Who sees it |
| --- | --- |
| Events, Dashboard, Profile | Everyone logged in (typical build). |
| **Candidates** | Chief operators **or** super admins (approve pipeline). |
| **Admin** | Super admins only. |

---

## 6. Permission helpers (shared library)

File: [lib/operators/permissions.js](../lib/operators/permissions.js)

| Function | What it does |
| --- | --- |
| `getUserOperatorsRoles(email)` | Loads `roles[]` from `operators_users`. |
| `hasRole(email, role)` | True if user has that single role. |
| `hasAnyRole(email, roles[])` | True if user has any of the listed roles. |
| `canPerformAction(email, eventState, action)` | Main **event-state** gate: `LIVE`, `OPEN`, or `CLOSED` plus an action name (e.g. `approve_candidate`, `vote`, `check_in`). **Super admin short-circuits to allow everything** before role switches. |
| `getOperatorsUser(email)` | Full row from `operators_users`. |
| `isBenched(email)` | Uses `benched_until`. |
| `hasOwedBalance(email)` | Uses `owed_balance`. |
| `canManageTopics(email)` | Super admin, chief operator, or accountant. |

API routes import these helpers (sometimes indirectly) to return 403 when needed.

---

## 7. HTTP API (serverless) — grouped by job

Base path: **`/api/operators/`**. Implementation lives under [api/operators/](../api/operators/).

### Authentication

| Method | Path | Role |
| --- | --- | --- |
| POST | `/api/operators/auth/send-magic-link` | Issue token + email (membership required). |
| GET | `/api/operators/auth/verify-magic-link` | Consume token; redirect into app if valid + user exists. |

### Users and admin

| Method | Path | Role |
| --- | --- | --- |
| GET | `/api/operators/users` | List users (super admin flows). |
| GET | `/api/operators/users/me` | Current user profile. |
| POST | `/api/operators/users/[email]/promote` | Promote user (e.g. to chief operator). |
| POST | `/api/operators/users/[email]/reverse-offense` | Reverse an offense (restricted). |

### Events (lifecycle)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/operators/events` | List events (filtered by caller). |
| POST | `/api/operators/events/create` | Create event. |
| GET | `/api/operators/events/[id]` | Event detail payload. |
| POST | `/api/operators/events/[id]/update` | Update fields. |
| POST | `/api/operators/events/[id]/open` | Move toward meeting night / open state. |
| POST | `/api/operators/events/[id]/close` | Close event, ROI, etc. (large handler). |
| POST | `/api/operators/events/[id]/close-rsvp` | Close RSVP phase. |
| POST | `/api/operators/events/[id]/announce` | Announce to attendees. |
| POST | `/api/operators/events/[id]/reopen` | Reopen. |
| POST | `/api/operators/events/[id]/revert-to-live` | Revert state. |
| POST | `/api/operators/events/[id]/promote-waitlist` | Waitlist promotion. |
| POST | `/api/operators/events/[id]/remove-rsvp` | Force-remove RSVP (privileged). |
| GET | `/api/operators/events/[id]/roi` | ROI data. |
| POST | `/api/operators/events/[id]/recalculate-roi` | Recalc. |
| GET | `/api/operators/events/[id]/test-roi` | Test helper. |

### RSVP, attendance, votes

| Method | Path |
| --- | --- |
| POST | `/api/operators/events/[id]/rsvp` |
| POST | `/api/operators/events/[id]/check-in` |
| POST | `/api/operators/events/[id]/votes` |
| GET | `/api/operators/events/[id]/votes/remaining` |

### Candidates (applications)

| Method | Path | Role |
| --- | --- | --- |
| POST | `/api/operators/candidates/submit` | Operator invites candidate to an event (essay, etc.). |
| GET | `/api/operators/candidates` | List **all** candidates (chief operator **or** super admin). |
| POST | `/api/operators/candidates/[id]/approve` | Approve (CO path; **super admin** allowed via `canPerformAction`). |
| POST | `/api/operators/candidates/[id]/deny` | Deny. |

### Scenarios / topics / uploads

| Method | Path |
| --- | --- |
| GET/POST | `/api/operators/events/[id]/scenarios` |
| POST | `/api/operators/events/[id]/generate-scenarios` |
| POST | `/api/operators/upload-logo` |
| POST | `/api/operators/upload-headshot` |

### Dashboard and offenses

| Method | Path |
| --- | --- |
| GET | `/api/operators/dashboard` — aggregate metrics for dashboard UI. |
| POST | `/api/operators/offenses/record` |

---

## 8. Event states (mental model)

Events move through states such as **`LIVE`** (planning / RSVP), **`OPEN`** (event night / voting / check-in), and **`CLOSED`** (wrapped). Exact transitions are enforced in API handlers and `canPerformAction`. See verbose doc for full narrative.

---

## 9. Database

Canonical schema and migrations under [database/](../database/) — files named `operators_*.sql`. Core tables include `operators_users`, `operators_events`, `operators_rsvps`, `operators_candidates`, `operators_votes`, `operators_attendance`, `operators_magic_link_tokens`, and related ROI/promotion tables.

---

## 10. Frontend implementation folders

| Folder | Contents |
| --- | --- |
| [src/pages/operators/](../src/pages/operators/) | Page components above. |
| [src/components/operators/](../src/components/operators/) | Shared UI (header, modals, toast, loading, a11y helpers). |
| [src/lib/operators/](../src/lib/operators/) | Client helpers (API client, validation, query client, analytics, etc.). |

---

## 11. What this summary does **not** cover

- **ALI**, **Archy**, **AO Automation**, and the **main marketing site** use different routes and APIs (`/api/ali`, `/api/ao`, etc.). Treat them as separate products unless you are wiring cross-links.
- Detailed **ROI math** and **edge cases** — use [OPERATORS_PLATFORM_VERBOSE_SUMMARY.md](../OPERATORS_PLATFORM_VERBOSE_SUMMARY.md) and code comments in `close.js` / ROI handlers.

---

*Last aligned with repo layout and roles as of the date this file was added. If behavior and docs disagree, trust the code paths above and the database truth in Supabase.*
