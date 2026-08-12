# Permanent data-access enforcement (2026-08-12)

Shared tables that had many independent writers now have **one sanctioned door** each:

- `lib/db/scheduledPosts.js` — only place that may `.from('ao_scheduled_posts')`
- `lib/db/contentDrafts.js` — only place that may `.from('ao_content_drafts')`

Draft identity is always `(created_by_email, slug, kind)` via `saveDraft` / `getBySlug` / `markPublished` / `attachImageUrl`.

Build gate: `scripts/verify-no-direct-table-access.mjs` (wired into `build:prerender` and `build:no-prerender`). Any new direct `.from(...)` outside those two files fails the deploy.

Template for the next multi-writer table: add `lib/db/<table>.js`, migrate call sites, add the table to the verify script allow-list.
