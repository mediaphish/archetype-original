# Publication schedule guardrails (journal + devotionals)

## Rule

Anything with **`publish_date` (or `date` for devotionals)** set to a **calendar day after “today”** must **not** appear in public surfaces: API, `/knowledge.json`, sitemap, static `/journal/{slug}` HTML, pre-render shell data, or highlighted lists—until that day arrives in the **publication timezone**.

“Today” is **not** pulled from mixed server-local clocks. It uses **one timezone** so Auto-generated drafts and scheduled social alignment stay consistent.

## Timezone

- **Default:** `America/Chicago`
- **Server / scripts:** set `PUBLICATION_TIME_ZONE` on Vercel (or locally) if you ever need a different canonical calendar.
- **Site bundle (optional):** `VITE_PUBLICATION_TIME_ZONE` so the browser matches if you override the default (same value as above if you use it).

## Where it’s enforced

- **Knowledge build** — future-dated markdown is skipped when building `public/knowledge.json`, plus a **second pass** on the final array in case anything slipped in.
- **GET `/api/knowledge`** — filters the corpus again before JSON is returned.
- **`/knowledge.json` in the browser** — `src/lib/knowledge.js` applies the same filter after fetch (stale deploys or hand-edited files don’t bypass the rule in the SPA).
- **Sitemap, static journal HTML generation, verification inventory, local prerender server** — all use the shared helper.

## Operational note

Changing when a post goes live is still done in the markdown **`publish_date`**. Drafts use `status: draft` in front matter as before.
