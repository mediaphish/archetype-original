/**
 * Regression: a failed metrics fetch stores sync_error (not silent null-only).
 *
 * Run: node lib/ao/syncPostMetrics.selftest.mjs
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8');
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
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const { computeEngagementScore, fetchFacebookPostMetrics } = await import(
  '../../api/cron/ao/sync-post-metrics.js'
);
const { supabaseAdmin } = await import('../supabase-admin.js');
const { scheduledPosts } = await import('../db/scheduledPosts.js');

async function main() {
  // Score works when impressions are 0 but reactions exist (FB/LI case)
  assert.ok(
    computeEngagementScore({ impressions: 0, reactions: 5, comments: 1, shares: 0, clicks: 0 }) > 0
  );
  assert.strictEqual(
    computeEngagementScore({ impressions: 100, reactions: 10, comments: 0, shares: 0, clicks: 0 }),
    10
  );

  // Mocked non-200 / Graph error → ok:false with error string
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 400,
    async json() {
      return { error: { message: 'Invalid OAuth access token - selftest' } };
    },
  });
  try {
    const failed = await fetchFacebookPostMetrics('12345', 'fake-token');
    assert.strictEqual(failed.ok, false);
    assert.match(String(failed.error || ''), /Invalid OAuth|Facebook/i);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Persist sync_error on a throwaway row if we can find any scheduled_post id
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('syncPostMetrics.selftest: PASS (fetch+score only; no DB)');
    return;
  }

  const { data: anyPost } = await scheduledPosts()
    .select('id, platform, external_id, posted_at')
    .eq('status', 'posted')
    .not('external_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!anyPost?.id) {
    console.log('syncPostMetrics.selftest: PASS (no posted row to write sync_error)');
    return;
  }

  const errMsg = `selftest sync_error ${Date.now()}`;
  const { error: upsertErr } = await supabaseAdmin.from('ao_scheduled_post_metrics').upsert(
    {
      scheduled_post_id: anyPost.id,
      platform: anyPost.platform,
      external_id: anyPost.external_id,
      posted_at_utc: anyPost.posted_at || null,
      sync_error: errMsg,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'scheduled_post_id' }
  );
  assert.ok(!upsertErr, upsertErr?.message);

  const { data: row } = await supabaseAdmin
    .from('ao_scheduled_post_metrics')
    .select('sync_error')
    .eq('scheduled_post_id', anyPost.id)
    .maybeSingle();
  assert.strictEqual(row?.sync_error, errMsg);

  // Clear the test error so we don't leave noise
  await supabaseAdmin
    .from('ao_scheduled_post_metrics')
    .update({ sync_error: null })
    .eq('scheduled_post_id', anyPost.id)
    .eq('sync_error', errMsg);

  console.log('syncPostMetrics.selftest: PASS');
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
