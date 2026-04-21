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
