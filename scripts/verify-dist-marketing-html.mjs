#!/usr/bin/env node
/**
 * After Puppeteer pre-render: ensure each marketing route has a saved HTML file with visible text.
 * Run only as part of build:prerender (not build:no-prerender).
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getMarketingStaticPaths } from './lib/public-url-inventory.mjs';
import { approxVisibleBodyText } from './lib/html-substance.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');

/** Short pages (e.g. ALI dashboard login gate) can be just under 200 visible chars after tag stripping. */
const MIN_MARKETING_TEXT = 130;
let errors = 0;

function fail(msg) {
  console.error(`❌ ${msg}`);
  errors++;
}

function distFileForRoute(path) {
  if (path === '/') return join(dist, 'index.html');
  const parts = path.split('/').filter(Boolean);
  return join(dist, ...parts, 'index.html');
}

const paths = getMarketingStaticPaths();
console.log(`🔍 Verifying ${paths.length} pre-rendered marketing HTML files in dist/...`);

for (const path of paths) {
  const file = distFileForRoute(path);
  if (!existsSync(file)) {
    fail(`Missing ${file} (route ${path})`);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  if (html.length < 2500) {
    fail(`Suspiciously short HTML (${html.length} chars): ${file}`);
  }
  const visible = approxVisibleBodyText(html);
  if (visible < MIN_MARKETING_TEXT) {
    fail(`Too little visible body text (${visible} chars < ${MIN_MARKETING_TEXT}): ${file}`);
  }
}

if (errors > 0) {
  console.error(`\n❌ verify-dist-marketing-html: ${errors} error(s)`);
  process.exit(1);
}

console.log('✅ verify-dist-marketing-html: all marketing routes have substantive pre-rendered HTML');

const SCHEMA_ROUTE_CHECKS = [
  { path: '/the-room', types: ['Book'] },
  { path: '/accidental-ceo', types: ['Book'] },
  { path: '/remaining-human', types: ['Book'] },
  { path: '/books', types: ['ItemList'] },
  { path: '/advisory', types: ['Service'] },
  { path: '/consulting', types: ['Service'] },
  { path: '/fractional-roles', types: ['Service'] },
  { path: '/fractional-roles/cco', types: ['Service'] },
  { path: '/meet-bart', types: ['ProfilePage'] },
];

function htmlHasJsonLdType(html, type) {
  const pattern = new RegExp(`"@type"\\s*:\\s*"${type}"`);
  return pattern.test(html);
}

function htmlHasEntityIds(html) {
  return html.includes('#organization') && html.includes('#person');
}

console.log(`🔍 Verifying JSON-LD schema in ${SCHEMA_ROUTE_CHECKS.length + 1} pre-rendered pages...`);

for (const check of SCHEMA_ROUTE_CHECKS) {
  const file = distFileForRoute(check.path);
  if (!existsSync(file)) {
    fail(`Schema check: missing ${file} (route ${check.path})`);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  for (const type of check.types) {
    if (!htmlHasJsonLdType(html, type)) {
      fail(`Missing @type ${type} JSON-LD in ${file}`);
    }
  }
}

const homeFile = join(dist, 'index.html');
if (!existsSync(homeFile)) {
  fail(`Schema check: missing ${homeFile} (route /)`);
} else {
  const homeHtml = readFileSync(homeFile, 'utf8');
  if (!htmlHasEntityIds(homeHtml)) {
    fail(`Home page JSON-LD missing #organization or #person @id anchors in ${homeFile}`);
  }
}

if (errors > 0) {
  console.error(`\n❌ verify-dist-marketing-html schema checks: ${errors} error(s)`);
  process.exit(1);
}

console.log('✅ verify-dist-marketing-html: all required JSON-LD schema checks passed');
