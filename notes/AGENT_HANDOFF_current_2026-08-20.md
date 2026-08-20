# Agent handoff — current (2026-08-20)

This replaces the March 2026 handoff as the **default** context file for new Cursor sessions.  
The older note `notes/AGENT_HANDOFF_preparing-for-major-system-updates_2026-03-10.md` is **historical** (Topics & Scenarios era). Read it only if Bart points at that work.

---

## How to work with Bart (non-negotiables)

- Bart is **not** an engineer and does **not** work locally. He checks the **live site**.
- Use **plain language** only when talking to him.
- **Plan first** for new product/UX work; wait for approval — except standing approvals and Claude-authored prompt specs (see `.cursorrules`).
- **Finishing always includes commit + push.** Never ask “Should I commit?” / “Want me to deploy?”
- **Questions and judgment requests come first.** If he asks what you think, answer that before executing.
- Trust is fragile after a long Auto image saga. Prefer honesty over “this should work now.”

---

## Product areas that matter right now

1. **Live site content** — devotionals, journal, knowledge index  
2. **Auto** — chat assistant used for writing, publishing help, and image generation  
3. **Social publish** — scheduled posts for journal launches and captions  

Bart’s bar for images is the ChatGPT experience: attach a real photo, give a full brief in one message, get a usable image quickly, then small corrections without re-attaching.

---

## Hard-won lessons (Auto / images) — do not re-learn the hard way

### 1. Instructions-only fixes are not enough
Telling Auto in the system prompt to “just generate” does not force it. Server-side enforcement (detect attach + complete brief → run generation) was required. Prompt text alone is not “done.”

### 2. Verify Claude’s claims against the live repo
Claude has written Cursor prompts that were partly right and partly wrong (wrong table/column guesses, “selftest doesn’t exist” when it lived under a different folder, “Phase 1 never landed” when it was already on `main`). Before executing a Claude prompt:

- Check the live files and `origin/main`
- Correct false claims; do not carry them into implementation
- See `notes/CORRECTION_phase1-already-on-main_2026-08-06.md`

**Empty activity log ≠ missing wiring.** It often means the success path has not been exercised since deploy.

### 3. Likeness checks must use a real photo, not the last AI image
Correction rounds correctly **generate** from the last output for continuity. Verification must still compare against Bart’s **real uploaded reference** (latest chat attachment in the thread), or the chain rubber-stamps gradual face drift while logging `likeness_verified: true`. Identity-level features beat “heavyset man with gray beard and glasses.”

### 4. Bart’s literal prompt wording
When Bart already wrote a complete scene/wardrobe/constraint brief, Auto should reuse his sentences closely — not paraphrase them into a “better” prompt. Server paths that already pass the user message through verbatim should stay that way.

### 5. Journal-launch social images
Schedule-time `image_url` snapshots can be null/stale. Publish-time refresh from the journal draft exists so Instagram is not permanently failed. **Failed** rows are not auto-retried; only reset them if Bart explicitly wants those posts sent again.

### 6. Bart’s trust and Auto’s future
As of 2026-08-20, Bart is exhausted with Auto image issues and has said he is nearly ready to delete Auto. Do not:

- Sell another round of speculative image prompts as if trust is restored
- Minimize failures or claim the pipeline is “basically ChatGPT now”
- Expand Auto image scope without a clear, approved plan and a pass/fail live test he chooses

If he asks to pause, strip, or delete Auto — follow that direction. Do not talk him into keeping it.

---

## Standing “do not re-ask” (also in `.cursorrules`)

- Publish finished work (commit + push)
- Execute attached Claude prompt specs (after live-repo sanity check)
- “I don’t care” / prior explicit approve for the same decision type
- Established routines (devotional overlap stop → wait; knowledge refresh on content publish; remote reconcile; same-style cleanup passes)

Still ask once when the product choice is genuinely new, unclear, conflicting, or would delete/change live customer-facing messaging without approval.

---

## Sensible next work (only if Bart asks)

- Live proof of image + activity log after a real successful generation  
- Pause / strip / delete Auto if he chooses that path  
- Content work (devotionals, journal) as usual  
- Do **not** invent a new Auto image mega-prompt unprompted

---

## One-sentence summary

**Verify against live `main`, enforce image behavior in code not just prose, keep likeness anchored to real photos, respect Bart’s literal briefs, publish finished work without re-asking — and treat Auto’s future as Bart’s call, not the agent’s.**
