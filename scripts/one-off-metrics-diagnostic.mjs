/**
 * One-off: run the same platform metric probes the fixed diagnostic uses,
 * print real error text for Facebook / LinkedIn / Instagram / Twitter.
 *
 * Run: node scripts/one-off-metrics-diagnostic.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const raw = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const { supabaseAdmin } = await import('../lib/supabase-admin.js');
const { scheduledPosts } = await import('../lib/db/scheduledPosts.js');
const {
  fetchFacebookPostMetrics,
  fetchInstagramMediaMetrics,
  fetchLinkedInPostMetrics,
  fetchTwitterPostMetrics,
} = await import('../api/cron/ao/sync-post-metrics.js');
const { getXAccessToken } = await import('../lib/social/xConnection.js');

async function main() {
  const { data: posts } = await scheduledPosts()
    .select('id, platform, external_id, posted_at')
    .eq('status', 'posted')
    .not('external_id', 'is', null)
    .in('platform', ['facebook', 'instagram', 'linkedin', 'twitter'])
    .order('posted_at', { ascending: false })
    .limit(20);

  const byPlatform = {};
  for (const post of posts || []) {
    if (!byPlatform[post.platform]) byPlatform[post.platform] = post;
  }

  const { data: metaRow } = await supabaseAdmin
    .from('ao_meta_tokens')
    .select('user_access_token, page_access_token')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: linkedInRow } = await supabaseAdmin
    .from('ao_linkedin_tokens')
    .select('access_token')
    .limit(1)
    .maybeSingle();

  const report = {};

  if (byPlatform.facebook && metaRow?.page_access_token) {
    report.facebook = await fetchFacebookPostMetrics(
      byPlatform.facebook.external_id,
      metaRow.page_access_token
    );
  } else {
    report.facebook = {
      ok: false,
      error: !byPlatform.facebook ? 'no posted facebook post' : 'no page token',
    };
  }

  if (byPlatform.instagram && metaRow?.user_access_token) {
    report.instagram = await fetchInstagramMediaMetrics(
      byPlatform.instagram.external_id,
      metaRow.user_access_token
    );
  } else {
    report.instagram = {
      ok: false,
      error: !byPlatform.instagram ? 'no posted instagram post' : 'no user token',
    };
  }

  if (byPlatform.linkedin && linkedInRow?.access_token) {
    report.linkedin = await fetchLinkedInPostMetrics(
      byPlatform.linkedin.external_id,
      linkedInRow.access_token
    );
  } else {
    report.linkedin = {
      ok: false,
      error: !byPlatform.linkedin ? 'no posted linkedin post' : 'no linkedin token in Supabase',
    };
  }

  const x = await getXAccessToken();
  if (byPlatform.twitter && x?.ok) {
    report.twitter = await fetchTwitterPostMetrics(byPlatform.twitter.external_id, x.accessToken);
  } else {
    report.twitter = {
      ok: false,
      error: !byPlatform.twitter ? 'no posted twitter post' : x?.error || 'X not connected',
    };
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
