# Repository Cleanup Audit — 2026-07-24

**Purpose:** Inventory for Claude / cleanup planning. **Nothing was deleted.**  
**Workspace:** `/Users/mediaphish/archetype-original`  
**Method:** Static inspection (directory trees, git status, import/reference greps, `package.json` / `vercel.json`, known broken patterns). Runtime “is this SQL applied in production?” was **not** fully verified.

**How to use this with Claude:** Treat each section as a candidate list. Prefer archive/quarantine over delete on first pass. Confirm production SQL / live routes before removing anything marked medium/low confidence.

---

## Executive summary (plain language)

The repo is large and carries a lot of history: old Auto UI backups, ~114 planning notes, ~107 database install scripts (many one-off), placeholder pages that no longer route, a 71MB video that doesn’t appear used by the site, and an untracked 2.5MB `project_map.txt` dump in the project root.

Recent live-site failures you’ve hit (missing images, corpus gaps, chat display strips) are **not primarily caused by notes clutter** — but messiness does increase the chance of agents editing the wrong file, committing junk, or leaving broken content in the knowledge kit.

**Highest-confidence “clean these first” targets:**
1. Explicit `*-v1-backup*` Auto files (superseded by Auto V2)
2. Malformed journal file `we-live-in-a-not-my-fault-era.md.md`
3. Untracked root `project_map.txt` and untracked `dist/videos/*.mov` copy
4. Tracked `public/videos/ao-posting-platform-linkedin-review.mov` if confirmed unused (71MB)
5. Dead `AutoHubPanel.jsx` (only imported by a backup page)
6. Placeholder Mentoring / Archy subpage components that no longer route
7. Nested duplicate Archy tree `src/app/app/` (live app uses `src/app/ChatApp.jsx`)
8. Content-kit zip archives that duplicate already-extracted markdown
9. Legacy unused homepage components + dead `Hero` import in `App.jsx`

*Deeper pass merged from parallel audit [Audit orphaned/broken files](bbaae400-f40e-41f7-8fdf-162dd9e2f296).*

---

## 1. No connection to the living site

| Path | Why | Confidence |
|------|-----|------------|
| `project_map.txt` (root, **untracked**) | ~2.5MB / 46k-line filesystem dump; not used by build or site | **high** |
| `dist/videos/ao-posting-platform-linkedin-review.mov` (**untracked**) | 71MB copy under `dist/`; not in git; not referenced by app code | **high** |
| `public/videos/ao-posting-platform-linkedin-review.mov` (**tracked**) | Same 71MB file; no `src`/`api`/`lib` references found to this filename | **high** |
| `ao-knowledge-hq-kit/journal/AO-Journal-Posts.zip` | Tracked zip; journal posts already exist as `.md` | **high** |
| `ao-knowledge-hq-kit/knowledge/accidental-ceo/Accidental_CEO.zip` | Tracked zip; chapters already extracted as `.md` | **high** |
| `ao-knowledge-hq-kit/PATCH_instructions/package.json.additions.json` | Kit scaffolding patch; not runtime | **high** |
| `ao-knowledge-hq-kit/scripts/build-index.mjs` | Kit-local; live build uses `scripts/build-knowledge.mjs` | **medium** |
| `ao-knowledge-hq-kit/.github/workflows/build-knowledge.yml` | Nested kit workflow; real workflows are in `/.github/workflows/` | **medium** |
| `sl-psychology-research/*.md` (10 short research notes) | Standalone research folder; not wired into knowledge build or site routes | **high** |
| `notes/**` (~114 files) | Planning / handoff / ChatGPT prompts — intentional archive, **not** served on the live site | **high** (keep as docs; not “site” assets) |
| `notes/` export dumps (`faq-full-export-for-review.txt`, `faq-review-*.html`, `culture-science-corpus-export.txt`, `journal-summary.txt`, `mobile-qa-*-results.json`, `ali-instrument-v2-curation*.csv`) | Review/QA artifacts, not served | **high** |
| `database/*.sql` (~107 files) | Manual install scripts; not auto-run by Vercel build. Many are historical one-offs | **medium** (needed for ops, not “live pages”) |
| `src/pages/mentoring/*.jsx` | Placeholder “Hero placeholder text here” pages; App no longer appears to route a Mentoring section (comment left, then Culture Science) | **high** |
| `src/pages/archy/Ask.jsx`, `Corpus.jsx`, `HowItWorks.jsx` | App explicitly forces all `/archy/*` to main Archy page (“placeholder subpages removed”) | **high** |
| `src/pages/cultureScience/Research.jsx` | `/culture-science/research` redirects to `/culture-science` | **high** |
| `src/pages/Playbooks.jsx`, `src/pages/ALI.jsx` | Contain placeholder patterns; confirm routing before removal | **medium** |
| `tests/test-roi-announcements.js` | Ad-hoc test file; not clearly part of Jest suite naming | **medium** |
| `notes/com.archetypeoriginal.devotionals.autopublish.plist` | macOS launchd plist — local machine automation, not the website | **high** |
| ~44 `public/images/*` with no hit in code or `knowledge.json` (heuristic) | Largest examples: `bart-character-001b.png`, `archy-character-008.png`, `*-layer-*.png`, `ali-dash-03/04.png`, `ao-pod-*`, `bart-headshot-*.jpg`, `ao-mark-white.png` | **medium** (may be used outside repo) |

---

## 2. Not connected to any active function

### Explicit superseded Auto stack (strongest)

| Path | Why | Confidence |
|------|-----|------------|
| `api/ao/auto/chat-v1-backup.js` | Rollback snapshot of old chat handler (~3800 lines). Live handler is `chat.js`. Only referenced in notes as rollback instructions | **high** |
| `src/components/ao/AutoHubPanel-v1-backup.jsx` | Backup of old Auto UI | **high** |
| `src/pages/ao/Review-v1-backup.jsx` | Backup Review page; live `Review.jsx` uses `AutoV2Panel` | **high** |
| `src/components/ao/AutoHubPanel.jsx` | Only imported by `Review-v1-backup.jsx` — not by live Review. Effectively dead with V2 | **high** |

### Nested duplicate Archy chat tree

| Path | Why | Confidence |
|------|-----|------------|
| `src/app/app/ChatApp.jsx` | Older duplicate; App uses `src/app/ChatApp.jsx` | **high** |
| `src/app/app/components/*` | DarkHoursBanner, EscalationButton, MessageBubble, QuickPrompts — only under nested tree | **high** |
| `src/app/app/utils/darkHours.js` | Only under nested tree | **high** |

### Legacy pages not imported by `App.jsx`

| Path | Why | Confidence |
|------|-----|------------|
| `src/pages/ALI.jsx`, `ALIApply.jsx`, `ALIThanks.jsx` | Superseded by `src/pages/cultureScience/*` / `pages/ali/*` | **high** |
| `src/pages/Admin.jsx` | Not routed; uses placeholder secret `'your-secret-key'` | **high** |
| `src/pages/Methods.jsx`, `Playbooks.jsx`, `FractionalLeadership.jsx`, `MentoringConsulting.jsx`, `SpeakingWorkshops.jsx` | Old shells; App uses newer methods/advisory paths | **high** |
| `src/pages/methods/Mentorship.jsx` | `/methods` redirects to `/advisory` | **high** |
| `src/pages/cultureScience/ALIDashboard.jsx` | Not imported (SaaS dashboard is `pages/ali/*`) | **high** |
| `src/pages/research.jsx` | Not imported | **high** |

### Unused homepage / shared components (after HomePage rewrite)

| Path | Why | Confidence |
|------|-----|------------|
| `src/components/Hero.jsx` | Imported in `App.jsx` but **never rendered** (dead import + component) | **high** |
| `src/components/home/*` unused set | AntiProjects, ArchetypeFitness, FinalCTA, HomeHero, JournalHighlights, LeadershipLegacy, MeetArchy, MeetBart, PillarCard, PsychologyBehind, WhatImBuilding, WhyArchetypeOriginal — current HomePage is self-contained | **high** |
| Other unused shared components (no page imports found) | AboutTeaser, MethodsTeaser, PhilosophyTeaser, Philosophy, PhilosophySection, Methods, Playbooks, Speaking, ValueStatement, QuickPaths, ProofBoxPsychology, ClosingConfidence, FeaturedFAQs, SocialShare, etc. | **high** / some **medium** |

### Lib modules with no importers found

| Path | Why | Confidence |
|------|-----|------------|
| `lib/supabase.js` | Anon client; API code uses `lib/supabase-admin.js` | **high** |
| `lib/ao/postMetricsStub.js` | Deprecated re-export; nothing imports stub | **high** |
| `lib/ao/detectSchedulingIntent.js` | No importers | **high** |
| `lib/ao/requireOwnerEmail.js` | No importers | **high** |
| `lib/ao/voiceReview.js` | No importers | **high** |
| `lib/operators/sanitize.js` | No importers | **medium** |

### Scripts present but not named in `package.json` scripts

These are **not automatically dead** (many are manual/ops tools). Candidates for “document or archive”:

| Path | Notes | Confidence |
|------|-------|------------|
| `scripts/send-duplicate-apology.mjs` | One-time apology email trigger | **high** (one-off) |
| `scripts/disable-prerender-on-commit.mjs` | Local git-hook helper | **medium** |
| `scripts/ali-volume-survey-runner.mjs` | ALI volume testing | **medium** |
| `scripts/auto-publish-devotionals-local.mjs` | Local-only publish helper | **medium** |
| `scripts/check-subscription*.mjs` | Manual diagnostics | **medium** |
| `scripts/fetch-knowledge.mjs` | Manual | **medium** |
| `scripts/fix-journal-image-paths.mjs` | One-off repair | **high** (one-off) |
| `scripts/generate-devotional-index.mjs` | May be superseded by `build-knowledge` | **medium** |
| `scripts/generate-faq-review-html.mjs` | Review helper | **medium** |
| `scripts/list-journal-entries.mjs` | Overlaps `manage-journal` | **medium** |
| `scripts/migrate-journal-explicit-published.mjs` | Migration; keep until all journals clean | **medium** (keep for now) |
| `scripts/mobile-qa-*.mjs` (4 files) | QA tooling | **medium** |
| `scripts/notify-todays-devotionals-from-corpus.mjs` | Ops | **medium** |
| `scripts/operators-*.mjs` (3 files) | Operators seed/probe | **medium** |
| `scripts/print-public-inventory-summary.mjs` | Inventory | **medium** |
| `scripts/repair-queue-schedule.mjs` | One-off repair | **high** (one-off) |
| `scripts/seed-corpus-embeddings.mjs` | **Still important** for corpus ops (not in npm scripts but used) | **keep** |
| `scripts/strip-em-dashes-journal.mjs` | Content cleanup one-off | **medium** |
| `scripts/test-longform-truncation.mjs`, `test-retry-emails.mjs` | Ad-hoc tests | **medium** |

**Active scripts (do not treat as dead):** anything named in `package.json` (`build-knowledge`, verify/prerender chain, `audit:corpus`, regression tests, etc.).

### API routes

`vercel.json` does **not** list every file; many routes rely on filesystem/`@vercel/node` builds. **Do not** treat “not mentioned in vercel.json” as unused.  
Known dead/superseded API file: `api/ao/auto/chat-v1-backup.js` only.

---

## 3. Obviously broken

| Path | Why | Confidence |
|------|-----|------------|
| `ao-knowledge-hq-kit/journal/we-live-in-a-not-my-fault-era.md.md` | Double extension; build-knowledge **skips** `*.md.md`; also appears to contain RTF markers | **high** |
| (Pattern) Any future `*.md.md` or `*.rtf` under journal | Explicitly skipped as malformed in `scripts/build-knowledge.mjs` | **high** |

**Note:** No zero-byte source files found in a quick pass (excluding `node_modules` / `.git`).

---

## 4. Outdated or duplicates

| Path / group | Why | Confidence |
|------|-----|------------|
| Auto V1 backup trio + live `AutoHubPanel.jsx` | Duplicate/superseded Auto UI stack vs `AutoV2Panel` + `chat.js` | **high** |
| `database/ali-phase1-schema.sql` + `ali-phase1-schema-simple.sql` + `ali-phase1-schema-complete.sql` + `ali-phase1-migration-fix.sql` | Multiple overlapping ALI phase-1 schema variants | **high** |
| `database/ALI_V1_TEMP_REACTIVATE_FOR_V2_CURATION.sql` | Name says temporary V1 reactivation | **high** |
| `database/ao_quote_review_queue_brief_attempts.sql` vs `ao_quote_review_queue_brief_and_hold_fields.sql` | Likely sequential patches; confirm which is current | **medium** |
| `notes/ALI_*_STATUS.md` / `*_COMPLETE.md` / `*_PLAN.md` (many) | Overlapping ALI planning history | **medium** |
| `notes/*CHATGPT*` / `*V0_*` / `HOMEPAGE_CONTENT_FOR_CHATGPT.md` etc. | Prompt exports for external tools; often superseded | **medium** |
| `notes/AUTO_V2_*` + `auto-v2-CURSOR_PROMPT.md` | Historical V2 cutover docs (valuable for rollback story; not runtime) | **medium** |
| `public/images/*` vs `dist/images/*` | Expected duplicate of static assets after copy/prerender — **normal**, not junk | **keep** |
| `public/images/leadership-shoes-melted-feet.jpg` vs `leadership-shoes-and-melted-feet.jpg` | Near-duplicate names; content uses the `-and-` form | **medium** |
| `public/images/when-leaders-refuse-to-change.jpg` vs `…-the-enron-lesson.jpg` | Likely rename leftover | **medium** |
| `public/images/where-we-begin-instagram.jpg` vs `where-we-begin.jpg` | Instagram variant unused by knowledge image field | **medium** |
| `src/pages/ALI*.jsx` vs `src/pages/cultureScience/ALI*.jsx` | Parallel ALI marketing pages; only cultureScience / ali SaaS wired | **high** |
| `src/app/ChatApp.jsx` vs `src/app/app/ChatApp.jsx` | Nested duplicate tree | **high** |

---

## 5. Suspicious

| Path | Why | Confidence |
|------|-----|------------|
| `public/videos/ao-posting-platform-linkedin-review.mov` (71MB) | Huge binary in git; no code references found; large git-history blob | **high** |
| `dist/videos/...` (untracked duplicate) | Same video under dist; easy to accidentally `git add dist/` | **high** |
| `ao-knowledge-hq-kit/**/*.zip` | Binary archives in content kit | **medium** |
| `project_map.txt` | Looks like an accidental full-tree dump in root | **high** |
| `.env` / `.env.local` | Correctly gitignored; `.env.example` is fine. No secrets committed found in this pass | **ok** |
| `src/pages/Admin.jsx` | Hard-coded fake secret pattern if ever routed | **high** |
| `api/operators/auth/test-login.js` | Name suggests a test/backdoor login path — **review security posture** before assuming safe | **medium** (review, don’t delete blindly) |
| `api/providers/*/test-post.js` | Test posting endpoints — fine if auth-gated; confirm | **medium** |

---

## 6. Should not be present (org / hygiene)

| Path | Why | Confidence |
|------|-----|------------|
| `project_map.txt` in **root** | Violates root-cleanliness rule (non-essential); belongs in `notes/` only if kept, preferably deleted after archive | **high** |
| `sl-psychology-research/` at **root** | Research dump; rules prefer `notes/` | **high** |
| Untracked `dist/videos/` | Dist should not accumulate large untracked binaries | **high** |
| Committing future `*.mov` / random dumps without an explicit product need | Inflates repo and deploy noise | **high** |
| Missing root `README.md` | Org gap (not clutter); project rules allow a short overview README | **low** |

**Root that *does* belong:** `package.json`, configs, `index.html`, `vercel.json`, `README` if present, etc.

---

## 7. Needs a human look (unclear / risky)

| Item | Question for Claude / Bart | Confidence |
|------|----------------------------|------------|
| Entire `database/` set (~107 SQL) | Which have been applied in production Supabase? Which are superseded? Needs a “applied vs pending” matrix before archive | **high priority for Claude** |
| `scripts/` one-offs vs keepers | Label each: one-off / ops / build-critical | **high** |
| Mentoring + Archy placeholder pages | Confirm no deep links / marketing still pointing at them; then remove or quarantine | **high** |
| `AutoHubPanel.jsx` + V1 backups | Confirm no dynamic import / old bookmark to V1 Review; keep temporarily for rollback? | **high** |
| Nested `src/app/app/` removal | Confirm live ChatApp path only | **high** |
| Judas corpus categories missing “The Archetype Series” | Data quality (related recent issue), not a stray file — still part of “mess → wrong Auto answers” | **high** |
| Unreferenced images (~44) | May still be used in emails, Canva, social | **medium** |
| Local plist autopublish | Still how devotionals publish on the Mac? | **ask** |
| `api/cron/ao/external-scan.js` | Route exists; not in crons list — intentional? | **ask** |
| Whether `dist/` should stay fully committed | Project intentionally commits prerendered HTML; but asset/video creep is a recurring footgun | **medium** |
| Cypress / Jest coverage | Exist in package.json; not wired in GitHub workflows | **medium** |
| `babel/` + `babel.config.js` | Still needed for Jest transforms? | **low** |

---

## Probably keep (messy-looking but active)

- `api/ao/auto/chat.js`, `src/components/ao/AutoV2Panel.jsx` — live Auto
- `scripts/build-knowledge.mjs` + verify/prerender chain — live publish pipeline
- `scripts/seed-corpus-embeddings.mjs`, `scripts/audit-corpus-completeness.mjs`, `api/cron/ao/backfill-corpus-embeddings.js` — corpus health
- `scripts/migrate-journal-explicit-published.mjs` — required by project rules for journal status work
- `public/knowledge.json`, journal/devotional markdown with `status: published`
- `notes/AGENT_USAGE_SUMMARY.md`, `notes/AGENT_HANDOFF_*` — agent operating docs
- `config/ali-narrative-*.json` — loaded by live ALI narrative libs
- `dist/` prerendered HTML (intentional for SEO) — but do **not** add `dist/videos/`
- Most `api/ao/**`, `api/ali/**`, `api/operators/**` — live product surfaces (verify before any deletion)

---

## Suggested cleanup phases (for Claude plan — not executed)

1. **Quarantine / remove zero-risk junk:** `project_map.txt`, untracked `dist/videos/`, confirm delete/gitignore for unused `.mov` + content-kit `.zip` archives
2. **Quarantine Auto V1 backups** into `backups/auto-v1/` or rely on git history; remove dead `AutoHubPanel.jsx` after confirm
3. **Remove nested duplicate Archy tree** `src/app/app/` after confirm live ChatApp path
4. **Fix/remove broken content:** `we-live-in-a-not-my-fault-era.md.md`
5. **Dead route pages + unused homepage components:** Mentoring placeholders, unused Archy subpages, dead `Hero` import, legacy ALI/Methods shells
6. **Dead lib helpers** with no importers (`lib/supabase.js`, ao stubs listed above)
7. **Database inventory:** applied vs superseded SQL (requires Supabase check)
8. **Notes hygiene:** move or archive ChatGPT/status dumps older than N months; keep handoffs
9. **Script inventory:** tag one-offs; keep ops scripts documented in one index note
10. **Image audit** (visual + outside-repo use) before deleting unreferenced PNGs/JPGs

---

## Could not fully verify without runtime access

- Whether every `database/*.sql` was applied to production Supabase
- Whether every API file under `api/` is still hit in production traffic
- Whether the LinkedIn review `.mov` is linked from anywhere outside this repo (e.g. Notion, email)
- Whether unreferenced images appear only in scheduled social posts / Resend templates stored in DB
- Whether `/api/cron/ao/external-scan` is triggered outside `vercel.json` crons
- Whether Cypress/Jest suites still pass or are abandoned
- Whether local plist autopublish is still installed/running on the machine

---

## Changed Files

- `notes/REPO_CLEANUP_AUDIT_2026-07-24.md` (this report; enriched after deeper pass)
