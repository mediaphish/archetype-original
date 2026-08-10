# JARVIS — March product layer follow-up (after tools are trustworthy)

The March 31, 2026 Auto hub plan (`.cursor/plans/ao-auto-hub-and-ready-post-import_1a74c946.plan.md`) described the product experience. JARVIS Phase 1/2 makes actions trustworthy. These March items still need dedicated prompts **after** tool-calling is stable in production:

## Still to build (product layer)

1. **Training mode manager** — say “switch to training mode,” save global guardrails, manage on/off/edit/revert in Memory.
2. **Librarian / Memory lanes** — “Didn’t we have something like this before?” → closest matches + nearby matches from saved bundles.
3. **Bundle DNA** — on Good ratings, store structure/tone/length fingerprints for reuse without silent rewrites.
4. **Undo last action** — especially schedule/publish steps, with receipts.
5. **Lockable approved sections** — long-form writing; never overwrite locked text.
6. **Quality alarm UX** — blocking major-issue acknowledgements when “don’t refine” is active (behavior rules exist; full UI flow may still need polish).
7. **Header-upload button redesign** — once `generate_image` is fully native, simplify/retire the confusing separate upload+slug prompt path.

## Sequencing

Do not start these until:

- `save_draft` / `approve_draft` / `fetch_full_text` are used successfully in live Auto threads
- Deferred tools (`generate_image`, `generate_quote_card`, `trigger_reshare`) are native (not legacy-signal deferrals)
- Phase 2 `verify_quote` is required before quote cards ship

Each item above should be its own Cursor prompt with live verification — same small-slice discipline as Phase 1.

Date: 2026-08-10
