# Summary: How the Cursor Agent Is Used in Archetype Original

**Last refreshed:** 2026-08-20

## Role of the Agent

Inside **archetype-original** (product name: **Archetype Original**), the Cursor AI agent is the **technical owner**. Bart does not work in local development or run builds and deploys himself. He relies on the **live site** and on the agent for all technical work. The agent is expected to:

- **Plan first** and present changes in plain language (no technical jargon) for approval — except standing approvals and Claude-authored prompt specs (see `.cursorrules`).
- **Execute** all code changes, commits, and deploys so the live site reflects the work.
- **Never leave work uncommitted or undeployed** — commit and push so the host gets the updates. Do not ask “Should I commit?”
- **Read the latest handoff notes** before acting:
  - `notes/AGENT_USAGE_SUMMARY.md` (this file)
  - `notes/AGENT_HANDOFF_current_2026-08-20.md` (current expectations and hard-won lessons)
  - Older notes such as `notes/AGENT_HANDOFF_preparing-for-major-system-updates_2026-03-10.md` are **historical only** unless Bart points at them.

So in practice: the agent writes and edits code, runs checks, commits, and deploys; Bart approves direction and checks the live site.

---

## Common Uses

### 1. Devotionals: adding and importing

- **Adding new devotionals**  
  Bart provides markdown files (e.g. from Downloads). The agent:
  - Copies them into `ao-knowledge-hq-kit/journal/devotionals/`
  - Ensures front matter and sections match the project (title, slug, date, scripture_reference, summary, etc.)
  - Normalizes details (e.g. categories, ESV reference format) to match existing posts

- **Overlap checks before adding**  
  When Bart is unsure whether a new devotional repeats others, the agent:
  - Compares **scripture references** to existing devotionals (no duplicate passages)
  - Compares **themes and summaries** and reports heavy overlap or a clear lane
  - Recommends skipping, merging, or refocusing in plain language
  - **Stops** before copy/build/commit if overlap is found, and waits for Bart’s decision

- **Knowledge build and deploy**  
  After adding or changing devotionals, the agent refreshes the knowledge index, commits, and pushes so the live site updates.

### 2. Journal and corpus publish

- Long-form journal articles stay **`status: draft`** until Bart approves them for the public Journal.
- Corpus publish defaults to draft. Live publish requires Bart’s explicit approval token flow — Auto/tools must not imply “live” without that step.
- Publication actions that can push site content should leave an audit trail Bart can inspect.

### 3. Auto (chat assistant) and images

Auto is a major product surface. Recent work (summer 2026) focused on making image generation behave more like a simple “attach photo + describe what you want → get the image” flow, plus likeness checks and social publish reliability.

**Hard-won lessons and current expectations** live in:

- `notes/AGENT_HANDOFF_current_2026-08-20.md`
- `notes/CORRECTION_phase1-already-on-main_2026-08-06.md` (do not re-apply Phase 1 wiring)

Bart has been burned by repeated Auto image failures and by agents/Claude re-diagnosing work that is already on `main`. Treat trust as fragile: verify against the live repo before claiming something is missing; prefer proof on the live site over another speculative prompt.

### 4. Social / journal-launch posts

Scheduled journal-launch posts can snapshot an empty image URL at schedule time. Publish-time refresh from the source draft was added so Instagram/Facebook are not stuck with a permanent blank image when the header exists later. Failed rows still need a deliberate reset if Bart wants a retry — they do not auto-heal.

### 5. Commit and deploy discipline

- Commit and push **all** project changes that belong in the repo (except secrets / explicit excludes).
- If the remote moved, reconcile and push — do not hand “run git pull/push” to Bart.

### 6. Other technical work

Architecture, bugs, UX/UI, research — always in human language, with approval for **new** product decisions. Standing processes (publish, Claude specs, already-chosen cleanup styles) do not get a second approval gate.

---

## Summary in one sentence

**Inside archetype-original, the agent is the technical owner that plans and executes code and content work (devotionals, journal, Auto, social), verifies claims against the live repo, and commits and deploys so the live site stays current — without re-asking for work Bart already approved.**
