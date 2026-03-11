# Summary: How the Cursor Agent Is Used in Archetype Original

## Role of the Agent

Inside **archetype-original**, the Cursor AI agent is used as the **technical owner** for the project. The user does not work in local development or run builds and deploys themselves; they rely on the live site and on the agent to do all technical work. The agent is expected to:

- **Plan first** and present changes in plain language (no technical jargon) for approval.
- **Execute** all code changes, commits, and deploys so the live site reflects the work.
- **Never leave work uncommitted or undeployed**—commit and push so the host (e.g. Vercel) gets the updates.
- **Read the latest handoff notes** when present (captures recent decisions and “how we work” expectations):
  - `notes/AGENT_HANDOFF_preparing-for-major-system-updates_2026-03-10.md`

So in practice: the agent writes and edits code, runs builds, commits, and deploys; the user approves direction and checks the live site.

---

## Common Uses

### 1. **Devotionals: adding and importing**

- **Adding new devotionals**  
  The user provides markdown files (e.g. from Downloads). The agent:
  - Copies them into `ao-knowledge-hq-kit/journal/devotionals/`
  - Ensures front matter and sections match the project (title, slug, date, scripture_reference, summary, etc.)
  - Normalizes details (e.g. categories, ESV reference format) to match existing posts

- **Overlap checks before adding**  
  When the user is unsure whether a new devotional repeats others, the agent:
  - Compares **scripture references** to existing devotionals (no duplicate passages)
  - Compares **themes and summaries** (e.g. courage + God’s presence, drift, self-control) and reports heavy overlap or a clear lane for the new post
  - Recommends skipping, merging, or refocusing (e.g. “focus only on the protective angle”) in plain language

- **Knowledge build and deploy**  
  After adding or changing devotionals, the agent:
  - Runs the knowledge build (`node scripts/build-knowledge.mjs`) so devotionals are included in `public/knowledge.json`
  - Commits new/updated devotional files (and, when appropriate, the updated `knowledge.json`)
  - Pushes to the remote so the site deploys (e.g. Vercel). If the remote has new commits, the agent handles merge/rebase and push so the deploy completes.

### 2. **Content and display**

- **Devotional display and API**  
  Past work (from conversation context) has included:
  - Month-overview parsing and display for devotionals
  - Normalizing scripture references (e.g. “5b, ESV”) in the API and in `esvUrl` so links and fetches work correctly

- **Faith route**  
  Devotionals are served from the knowledge corpus and appear on the `/faith` route; the agent’s edits and deploys keep that content and behavior in sync.

### 3. **Commit and deploy discipline**

- The agent is required to **commit and push all project changes** (except things the project explicitly excludes, e.g. secrets) so the live site is never left behind.
- When push is rejected (e.g. remote has new commits), the agent **stashes if needed, pulls, resolves conflicts** (e.g. for `public/knowledge.json`), and **pushes** so deploy happens. It does not hand off “run git pull/push” to the user.

### 4. **Other technical work**

- The agent is also used for general **engineering and UX work**: architecture, bug fixes, UI/design decisions, and research—always with plans and explanations in **human, non-technical language** and with approval before execution.
- **Notes and docs** (e.g. `notes/DEVOTIONAL_IMPORT_PROCESS.md`, `notes/CURSOR_GIT_PUSH.md`) are used to record processes so future agent sessions (or the user) can follow the same workflow.

---

## Summary in one sentence

**Inside archetype-original, the agent is used as the technical owner that plans and executes all code and content changes (especially devotionals), checks for overlap with existing posts, runs the knowledge build, and commits and deploys so the live site is always up to date.**
