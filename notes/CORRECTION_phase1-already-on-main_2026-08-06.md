# Correction note: Phase 1 wiring is already on main

**Date:** 2026-08-06 (re-verified 2026-08-13 against live `main`)  
**Source:** Bart pasted `cursor-prompt-correction-phase1-already-on-main.md` after a “finish remaining Phase 1 steps” prompt wrongly claimed the ledger wiring never landed. Same correction was re-pasted 2026-08-13; Cursor re-checked the live files — still already present. **No code re-writes were made.**

## Corrected status

Phase 1 ground-truth + activity-ledger wiring is **complete on `main`**.

| Piece | Present? | Evidence |
|---|---|---|
| Prompt paragraphs in `lib/ao/autoV2.js` | Yes | `daaabb4e2` (re-checked 2026-08-13) |
| `logActivity` in `appendDesignImageToReplyIfNeeded.js` | Yes | `0e58c7e2b` (re-checked 2026-08-13) |
| `logActivity` on opportunity-image + reshare success in `chat.js` | Yes | `0e58c7e2b` (re-checked 2026-08-13) |
| Merged to main | Yes | `5545fcbe8` |

Also live: `enforceNoFabricatedConfirmations`, `lib/ao/logActivity.js`, table `ao_activity_log`.

## Empty log ≠ unwired

`ao_activity_log` having zero (or few) rows only means those success paths have not been exercised since deploy. It does **not** mean the call sites are missing.

## What not to do

- Do not re-apply the same three file edits.
- Do not claim the ledger is unwired because the table is empty.
- Do not treat a stale repo audit as authoritative over `origin/main`.

## Sensible next prompts

1. **Verification / proof:** generate one real image (or reshare) on the live site → confirm a row in `ao_activity_log`.
2. **Phase 1 fast-follow:** publish / scheduling logging — not a redo of Steps 2/4/5.
