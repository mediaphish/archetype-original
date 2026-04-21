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
}

if (errors > 0) {
  console.error(`\n❌ verify-dist-html: ${errors} error(s)`);
  process.exit(1);
}

console.log('✅ verify-dist-html: all journal/devotional static files present with substance');
