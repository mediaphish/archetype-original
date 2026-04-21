#!/usr/bin/env node
/**
 * After deploy: GET public URLs on the deployment host and fail if HTML is hollow.
 * Uses VERCEL_URL or HTML_CHECK_BASE_URL. Skips locally when no base URL is set.
 * If the host returns 401/403 (e.g. Vercel Deployment Protection on previews), skips —
 * dist/ is already validated by verify-dist-html and verify-dist-marketing-html.
 * Optional: VERCEL_AUTOMATION_BYPASS_SECRET + header x-vercel-protection-bypass for protected URLs.
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

function fetchHeaders() {
  const h = {
    'user-agent':
      'Mozilla/5.0 (compatible; ArchetypeOriginal-deploy-check/1.0; +https://www.archetypeoriginal.com)',
    accept: 'text/html,application/xhtml+xml',
  };
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypass) {
    h['x-vercel-protection-bypass'] = bypass;
  }
  return h;
}

/** Preview deployments often use Vercel Deployment Protection (401/403 without auth). Dist/ is already checked. */
async function probeSkippableProtection() {
  const res = await fetch(`${base}/`, {
    redirect: 'follow',
    headers: fetchHeaders(),
  });
  if (res.status !== 401 && res.status !== 403) {
    return false;
  }
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    console.error(
      `❌ verify-deployment-html: deployment still returned HTTP ${res.status} with VERCEL_AUTOMATION_BYPASS_SECRET set — check the secret in Vercel → Deployment Protection.`
    );
    process.exit(1);
  }
  console.log(
    `⏭️  verify-deployment-html: skipped (HTTP ${res.status} — this deployment URL requires a login screen; ` +
      `marketing and journal HTML were already verified in dist/ by verify-dist-html and verify-dist-marketing-html). ` +
      `Optional: add VERCEL_AUTOMATION_BYPASS_SECRET in the project so automated checks can reach protected previews.`
  );
  process.exit(0);
}

await probeSkippableProtection();

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
    headers: fetchHeaders(),
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
