# SEO: HTML-first journal + pre-render contingency

## What shipped

- **Journal posts and devotionals** (`/journal/{slug}`) are built as **fully static HTML** from `public/knowledge.json` plus markdown bodies via `scripts/generate-static-journal-html.mjs`. Crawlers get article text **without relying on React**.
- **Marketing URLs** remain **Vite SPA + Puppeteer pre-render** (`scripts/prerender.mjs`). Individual `/journal/*` URLs are **no longer** pre-rendered with Puppeteer so static files are not overwritten.
- **Sitemap** journal URLs are driven by **`public/knowledge.json`** (includes devotionals and all corpus-backed posts).
- **Canonical URLs** for SPA pages use **`window.location.pathname`** (`src/components/SEO.jsx`).
- **Apex → www** redirect is configured in **`vercel.json`** for host `archetypeoriginal.com`.

## Public URL inventory (single list)

- **Module:** `scripts/lib/public-url-inventory.mjs` — marketing paths + `/journal/{slug}` for every published post and devotional (same rules as the knowledge build).
- **Summary counts** (after `npm run build-knowledge`): `node scripts/print-public-inventory-summary.mjs`
- **Checks:** `scripts/verify-dist-html.mjs` (journal/devotional files on disk), `scripts/verify-dist-marketing-html.mjs` (after pre-render). On Vercel, `scripts/verify-deployment-html.mjs` GETs every inventory path on the preview host (`VERCEL_URL`) so hollow responses fail the build.

## If static journal generation fails

Re-run locally: `npm run build:no-prerender` (runs knowledge build, static HTML, verification). Fix markdown or `knowledge.json` issues reported in the console.

## If full-site static HTML is required later

Replace SPA pre-render for marketing routes with the same markdown-driven or templated pipeline used for journal posts (see SEO plan Track 1).
