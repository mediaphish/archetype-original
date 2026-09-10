/**
 * Tell search engines the site changed.
 *
 * Context, measured in Search Console on 2026-09-10: Google had indexed 32 of
 * 393 pages and knew about 81. The sitemap was last read on 20 January 2026.
 * Everything published in eight months was invisible, not because it could not
 * be crawled but because nobody had told anyone it existed.
 *
 * TWO MECHANISMS, AND ONE THAT LOOKS RIGHT BUT IS NOT.
 *
 * NOT USED: Google's Indexing API. It officially supports only JobPosting and
 * BroadcastEvent structured data. Using it for journal entries violates the
 * terms and risks losing API access. Plenty of guides recommend it anyway. It
 * is not an option here and should not be added later.
 *
 * USED:
 *
 *   IndexNow. One POST, no credentials, covers Bing, Yandex, Seznam and Naver.
 *   Authenticated by a key file served from the site root, which proves the
 *   submitter controls the domain. Google does not participate, so this is
 *   free coverage on everything else rather than a Google answer.
 *
 *   Google Search Console API, sitemap submission. The sanctioned way to say
 *   "come look". Runs only when a service account is configured, and skips
 *   quietly otherwise so a deploy never fails for want of a credential.
 *
 * Never fails the build. A search engine being unreachable is not a reason to
 * stop a deploy, and a hard failure here would get the step deleted.
 */

import fs from 'fs';
import path from 'path';

const SITE_HOST = 'www.archetypeoriginal.com';
const SITE = `https://${SITE_HOST}`;
const SC_PROPERTY = 'sc-domain:archetypeoriginal.com';

/** The key file lives in public/ and is served from the site root. */
function findIndexNowKey() {
  const dir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(dir)) return null;
  const file = fs.readdirSync(dir).find((f) => /^[0-9a-f]{16,64}\.txt$/i.test(f));
  if (!file) return null;
  const key = fs.readFileSync(path.join(dir, file), 'utf8').trim();
  // The file's contents must equal its name, or the engines reject the batch.
  return key === path.basename(file, '.txt') ? key : null;
}

function sitemapUrls() {
  const p = path.join(process.cwd(), 'public', 'sitemap.xml');
  if (!fs.existsSync(p)) return [];
  return [...fs.readFileSync(p, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

/**
 * URLs changed recently enough to be worth announcing.
 *
 * Submitting all 393 on every deploy is the kind of thing that gets a host
 * rate-limited and teaches the engines to ignore the feed. Recent entries only,
 * capped, which is the actual point of IndexNow.
 */
function recentUrls(days = 14, cap = 100) {
  const p = path.join(process.cwd(), 'public', 'sitemap.xml');
  if (!fs.existsSync(p)) return [];
  const xml = fs.readFileSync(p, 'utf8');
  const cutoff = Date.now() - days * 86400000;

  const out = [];
  for (const block of xml.split('<url>').slice(1)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    const mod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    if (!loc || !mod) continue; // no date means no claim that it changed
    const t = Date.parse(mod);
    if (Number.isFinite(t) && t >= cutoff) out.push(loc);
  }
  return out.slice(0, cap);
}

async function pingIndexNow() {
  const key = findIndexNowKey();
  if (!key) {
    console.log('notify-search-engines: no IndexNow key file in public/, skipping IndexNow');
    return;
  }

  const urlList = recentUrls();
  if (!urlList.length) {
    console.log('notify-search-engines: nothing changed in the last 14 days, skipping IndexNow');
    return;
  }

  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: SITE_HOST,
        key,
        keyLocation: `${SITE}/${key}.txt`,
        urlList,
      }),
    });
    // 200 and 202 both mean accepted. 422 means the key file did not validate.
    console.log(`notify-search-engines: IndexNow ${res.status} for ${urlList.length} URL(s)`);
    if (res.status === 422) {
      console.warn('  422 usually means the key file is not reachable at the site root yet.');
    }
  } catch (err) {
    console.warn('notify-search-engines: IndexNow unreachable:', err?.message || err);
  }
}

/**
 * Resubmit the sitemap through the Search Console API.
 *
 * Needs GOOGLE_SC_SERVICE_ACCOUNT_JSON: the full service-account JSON, with
 * that account added as an owner of the Search Console property. Skips quietly
 * when absent, so this runs in CI without blocking a local build.
 */
async function submitSitemapToGoogle() {
  const raw = process.env.GOOGLE_SC_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.log('notify-search-engines: GOOGLE_SC_SERVICE_ACCOUNT_JSON not set, skipping Google');
    return;
  }

  let creds;
  try {
    creds = JSON.parse(raw);
    // A value that was quoted somewhere on its way into the dashboard parses
    // into a string rather than an object. One more parse recovers it, and
    // this is a common enough paste accident to be worth handling rather than
    // reporting as a credential problem.
    if (typeof creds === 'string') creds = JSON.parse(creds);
  } catch {
    console.warn('notify-search-engines: GOOGLE_SC_SERVICE_ACCOUNT_JSON is not valid JSON, skipping');
    return;
  }

  // Check the shape before handing it to Google.
  //
  // The library's own failure for a missing private key is "No key or keyFile
  // set", which says nothing about which field is wrong or what to do. These
  // messages name the field and never print a value.
  const problems = [];
  if (!creds || typeof creds !== 'object') problems.push('the value did not parse into an object');
  else {
    if (creds.type !== 'service_account') {
      problems.push(`"type" is ${JSON.stringify(creds.type)}, expected "service_account" (an OAuth client JSON will not work here)`);
    }
    if (!creds.client_email) problems.push('"client_email" is missing');
    if (!creds.private_key) problems.push('"private_key" is missing');
    else if (!String(creds.private_key).includes('BEGIN PRIVATE KEY')) {
      problems.push('"private_key" is present but does not look like a PEM block');
    }
  }

  if (problems.length) {
    console.warn('notify-search-engines: GOOGLE_SC_SERVICE_ACCOUNT_JSON is set but unusable, skipping Google');
    for (const p of problems) console.warn(`  - ${p}`);
    console.warn('  Paste the whole downloaded service-account JSON file, unmodified, braces included.');
    return;
  }

  try {
    const { google } = await import('googleapis');
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/webmasters'],
    });
    const webmasters = google.webmasters({ version: 'v3', auth });

    // The www URL deliberately. The property had the non-www sitemap submitted,
    // which 307-redirects, and it had not been read since January.
    await webmasters.sitemaps.submit({
      siteUrl: SC_PROPERTY,
      feedpath: `${SITE}/sitemap.xml`,
    });
    console.log(`notify-search-engines: submitted ${SITE}/sitemap.xml to Search Console`);
  } catch (err) {
    console.warn('notify-search-engines: Search Console submit failed:', err?.message || err);
    // The two failures that actually happen, and what each one means. Both
    // return an opaque status otherwise, and both are fixed in Search Console
    // rather than in this repo.
    const status = err?.code || err?.response?.status;
    if (status === 403) {
      console.warn(`  403 means ${creds.client_email} is not an owner of ${SC_PROPERTY}.`);
      console.warn('  Search Console > Settings > Users and permissions > Add user, permission Owner. Full is not enough.');
    } else if (status === 404) {
      console.warn(`  404 means the property ${SC_PROPERTY} does not exist under that account, or is a URL-prefix property rather than a domain one.`);
    }
  }
}

const urls = sitemapUrls();
console.log(`notify-search-engines: sitemap has ${urls.length} URL(s)`);

// Only announce from a real deploy.
//
// This sits in the build chain, so without this guard every local `npm run
// build` would tell four search engines the site changed. That is how a host
// gets rate limited and how the signal stops being believed. --force is for
// testing it deliberately.
const isDeploy = Boolean(process.env.VERCEL || process.env.CI);
const forced = process.argv.includes('--force');

if (!isDeploy && !forced) {
  console.log('notify-search-engines: local build, not notifying anyone (use --force to override)');
} else {
  await pingIndexNow();
  await submitSitemapToGoogle();
}
