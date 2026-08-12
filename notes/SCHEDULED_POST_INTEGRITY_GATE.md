# Scheduled post integrity gate (2026-08-12)

One shared checkpoint before any row is written to `ao_scheduled_posts`, plus a last-mile check in `publishOne()` before anything reaches a live platform.

## Why

Three incidents (placeholder quote-card copy going live, dozens of scheduled placeholders sitting undetected, and a journal launch that scheduled zero social posts) all shared the same gap: each insert path invented (or skipped) its own checks. Fixes aimed at one endpoint left the other ten exposed.

## What to use

- `lib/social/scheduledPostIntegrity.js`
  - `validateScheduledPostRows(rows)` → `{ valid, rejected }` (never voids good rows)
  - `insertScheduledPostsSafely(rows)` → preferred write wrapper
  - `assertRowReadyToPublish(row)` → used by `publishOne()`
- Standing audit: `node scripts/audit-scheduled-post-integrity.mjs` (needs Supabase env locally)

## Rule for future work

Do **not** call `supabaseAdmin.from('ao_scheduled_posts').insert(...)` directly. Use `insertScheduledPostsSafely`. If a response includes `rejected` / `integrity_summary`, surface it to Bart — never compute and discard.
