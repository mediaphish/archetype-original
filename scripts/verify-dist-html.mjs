#!/usr/bin/env node
/**
 * Fail the build if journal/devotional static HTML is missing or hollow.
 * Marketing pages are still SPA+pre-render; journal posts must be fully static from markdown.
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getJournalDevotionalSlugDocs } from './lib/public-url-inventory.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');

let errors = 0;

function fail(msg) {
  console.error(`❌ ${msg}`);
  errors++;
}

// The feeds themselves have to reach dist/, not just public/.
//
// vite copies public/ into dist/ before generate-rss runs, so a feed left out
// of copy-public-to-dist.mjs sits in dist one build stale, and a missing file
// does not 404 here: {"handle":"filesystem"} falls through to the SPA catch-all
// and every reader gets the homepage with a 200. That is the failure that hid
// the absent /rss.xml for months.
for (const feed of ['rss.xml', 'devotionals.xml']) {
  const p = join(dist, feed);
  if (!existsSync(p)) {
    fail(`Missing dist/${feed}. Add it to scripts/copy-public-to-dist.mjs.`);
    continue;
  }
  const xml = readFileSync(p, 'utf8');
  if (!xml.startsWith('<?xml')) fail(`dist/${feed} is not XML. Likely the SPA shell.`);
  if (!xml.includes('<item>')) fail(`dist/${feed} has no items.`);
}

const docs = getJournalDevotionalSlugDocs();
console.log(`🔍 Verifying ${docs.length} static journal/devotional files in dist/...`);

for (const doc of docs) {
  const slug = doc.slug;
  const file = join(dist, 'journal', slug, 'index.html');
  if (!existsSync(file)) {
    fail(`Missing ${file} (${doc.title || slug})`);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  if (html.length < 800) {
    fail(`Suspiciously short HTML (${html.length} chars): ${file}`);
  }
  if (!html.includes('static-article')) {
    fail(`Expected .static-article body container in ${file}`);
  }
  // Feed autodiscovery. These files are built by their own generator rather
  // than from index.html, so they shipped without it while every SPA-rendered
  // page had it. Nothing looks wrong when it is absent: the page renders, the
  // feed exists, and readers simply never find it from the page a visitor
  // actually landed on.
  if (!html.includes('application/rss+xml')) {
    fail(`Missing RSS autodiscovery link in ${file}`);
  }

  // The matching feed must come first, because a reader offered two feeds takes
  // the first. Journal posts and devotionals share the /journal/<slug> path, so
  // getting this backwards is invisible in the URL and subscribes someone to
  // the wrong thing.
  const firstFeed = html.match(/<link rel="alternate" type="application\/rss\+xml"[^>]*href="([^"]+)"/)?.[1] || '';
  const wanted = String(doc.type) === 'devotional' ? '/devotionals.xml' : '/rss.xml';
  if (firstFeed && !firstFeed.endsWith(wanted)) {
    fail(`${doc.type} page offers ${firstFeed} first, expected ${wanted}: ${file}`);
  }
}

if (errors > 0) {
  console.error(`\n❌ verify-dist-html: ${errors} error(s)`);
  process.exit(1);
}

console.log('✅ verify-dist-html: all journal/devotional static files present with substance');
