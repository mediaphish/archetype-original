# Quote card placeholder publish incident (2026-08-10 / fix 2026-08-12)

## What went live
- Card index 1 (thread `6d66810a-4347-42f9-9a3f-d4e9a932eb22`) posted the literal text `Quote card 1` on Facebook, Instagram, LinkedIn, and X.
- 56 additional scheduled rows (same placeholder in `text`) were corrected via one-time SQL on 2026-08-12 so they would not post the same garbage.

## Already-posted rows (cannot fix in DB)
Bart must manually edit/delete the 4 live platform posts. Tooling in this repo cannot edit third-party live posts.

## Sweep after code fix (2026-08-11)
Query across all `source_kind` values for:
- `text ~* '^Quote card [0-9]+$'`
- empty / whitespace `text`
- exact `none`
- `text` vs `caption` drift where `text` is a placeholder

Result after emergency SQL: **only the 4 already-posted `auto_quote_card` rows** still match. **0 scheduled rows** remain with placeholder `text`.

## Structural fix shipped
- Shared `lib/ao/scheduledPostCopy.js` always writes `text` + `caption` together
- `publishOne()` refuses placeholder/empty text and marks the row failed
- `schedule-cards.js` removed the `Quote card ${n}` fallback; caption is the publish body
