/**
 * Single source for public crawl URL lists (verification + docs).
 * Journal/devotional URLs come from public/knowledge.json after build-knowledge (same corpus as live API).
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { PUBLIC_STATIC_SITEMAP_ROUTES } from './public-static-routes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

/** @returns {{ docs: Array<object>, generated_at?: string }} */
export function loadKnowledgeInventory() {
  const path = join(ROOT, 'public', 'knowledge.json');
  if (!existsSync(path)) {
    throw new Error(`public/knowledge.json not found — run build-knowledge first (${path})`);
  }
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return {
    docs: raw.docs || [],
    generated_at: raw.generated_at,
  };
}

/** Published journal posts + devotionals — same eligibility as corpus (already filtered at build-knowledge). */
export function getJournalDevotionalSlugDocs() {
  const { docs } = loadKnowledgeInventory();
  return docs.filter((d) => d.type === 'journal-post' || d.type === 'devotional');
}

/** Marketing paths from route list (no trailing slash). */
export function getMarketingStaticPaths() {
  return PUBLIC_STATIC_SITEMAP_ROUTES.map((r) => r.path);
}

/**
 * Combined list of pathname strings we expect to have crawlable HTML after full build:
 * marketing paths + one per journal/devotional slug.
 */
export function getExpectedCrawlPaths() {
  const marketing = getMarketingStaticPaths();
  const jd = getJournalDevotionalSlugDocs().map((d) => `/journal/${d.slug}`);
  return [...new Set([...marketing, ...jd])].sort();
}

/** Summary counts for audits / CI logs */
export function getInventorySummary() {
  const jd = getJournalDevotionalSlugDocs();
  const marketing = getMarketingStaticPaths().length;
  return {
    marketingRoutes: marketing,
    journalPosts: jd.filter((d) => d.type === 'journal-post').length,
    devotionals: jd.filter((d) => d.type === 'devotional').length,
    totalJournalUrls: jd.length,
    combinedCrawlTargets: getExpectedCrawlPaths().length,
  };
}
