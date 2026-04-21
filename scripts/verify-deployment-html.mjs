#!/usr/bin/env node
/**
 * After deploy artifact exists: GET every public inventory path on the deployment host
 * and fail if HTML is hollow. Uses VERCEL_URL (set on Vercel) or HTML_CHECK_BASE_URL.
 * Skips (exit 0) locally when no base URL is available.
 */

import { approxVisibleBodyText, isJournalPostPath } from './lib/html-substance.mjs';
import { getExpectedCrawlPaths } from './lib/public-url-inventory.mjs';

const MIN_MARKETING_LISTING = 130;
const MIN_JOURNAL_POST_TEXT = 200;

function resolveBaseUrl() {
  const explicit = process.env.HTML_CHECK_BASE_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  const v = process.env.VERCEL_URL;
  if (v) {
    const host = v.startsWith('http') ? v : `https://${v}`;
    return host.replace(/\/$/, '');
  }
  return null;
}

const base = resolveBaseUrl();
if (!base) {
  console.log(
    '⏭️  verify-deployment-html: skipped (set VERCEL_URL on Vercel or HTML_CHECK_BASE_URL to run checks)'
  );
  process.exit(0);
}

const paths = getExpectedCrawlPaths();
console.log(`🌐 verify-deployment-html: checking ${paths.length} URLs at ${base} ...`);

const CONCURRENCY = 8;
let errors = 0;

function fail(msg) {
  console.error(`❌ ${msg}`);
  errors++;
}

async function fetchPath(pathname) {
  const url = `${base}${pathname === '/' ? '/' : pathname}`;
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent':
        'Mozilla/5.0 (compatible; ArchetypeOriginal-deploy-check/1.0; +https://www.archetypeoriginal.com)',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) {
    fail(`${pathname} → HTTP ${res.status}`);
    return null;
  }
  const html = await res.text();
  return html;
}

function verifyOne(pathname, html) {
  const textLen = approxVisibleBodyText(html);
  if (isJournalPostPath(pathname)) {
    if (!html.includes('static-article')) {
      fail(`${pathname}: missing static article marker`);
      return;
    }
    if (textLen < MIN_JOURNAL_POST_TEXT) {
      fail(`${pathname}: journal static HTML too thin (${textLen} visible chars)`);
    }
    return;
  }
  if (textLen < MIN_MARKETING_LISTING) {
    fail(`${pathname}: HTML too thin (${textLen} visible chars)`);
  }
}

async function run() {
  let i = 0;
  async function worker() {
    while (i < paths.length) {
      const idx = i++;
      const pathname = paths[idx];
      try {
        const html = await fetchPath(pathname);
        if (html) verifyOne(pathname, html);
      } catch (e) {
        fail(`${pathname}: ${e.message || String(e)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, paths.length) }, () => worker()));
}

await run();

if (errors > 0) {
  console.error(`\n❌ verify-deployment-html: ${errors} error(s)`);
  process.exit(1);
}

console.log('✅ verify-deployment-html: full inventory returned substantive HTML');
