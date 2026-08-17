/**
 * Caption-length engagement buckets + metrics sync-failure alerts.
 * Run: node lib/ao/captionLengthPerformance.selftest.mjs
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findUnbackedActionClaims } from './gateActionClaims.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadEnvLocal() {
  try {
    const raw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
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

const {
  CAPTION_LENGTH_MIN_SAMPLES,
  aggregateCaptionLengthPerformance,
  captionCharLength,
  captionLengthBucketKey,
  getCaptionLengthPerformance,
  summarizeMetricsSyncHealth,
} = await import('./postMetrics.js');

assert.strictEqual(captionCharLength('hi'), 2);
assert.strictEqual(captionLengthBucketKey(125), '0-125');
assert.strictEqual(captionLengthBucketKey(126), '126-300');
assert.strictEqual(captionLengthBucketKey(800), '501-800');
assert.strictEqual(captionLengthBucketKey(801), '800+');

const rows = [
  { platform: 'instagram', caption: 'x'.repeat(80), engagement_score: 10, sync_error: null },
  { platform: 'instagram', caption: 'x'.repeat(90), engagement_score: 20, sync_error: null },
  { platform: 'instagram', caption: 'x'.repeat(200), engagement_score: 40, sync_error: null },
  { platform: 'instagram', caption: 'x'.repeat(200), engagement_score: 50, sync_error: null },
  { platform: 'instagram', caption: 'x'.repeat(200), engagement_score: 60, sync_error: null },
  { platform: 'instagram', caption: 'x'.repeat(200), engagement_score: 70, sync_error: null },
  { platform: 'instagram', caption: 'x'.repeat(200), engagement_score: 80, sync_error: null },
  { platform: 'linkedin', caption: 'x'.repeat(400), engagement_score: 0, sync_error: 'LinkedIn: Not enough permissions to access: partnerApiSocialActions.GET.20260701' },
];

const agg = aggregateCaptionLengthPerformance(rows);
assert.strictEqual(agg.instagram.scored_count, 7);
assert.strictEqual(agg.instagram.buckets.find((b) => b.bucket === '0-125').sample_count, 2);
assert.strictEqual(agg.instagram.buckets.find((b) => b.bucket === '0-125').too_few_samples, true);
assert.strictEqual(agg.instagram.buckets.find((b) => b.bucket === '126-300').sample_count, 5);
assert.strictEqual(agg.instagram.buckets.find((b) => b.bucket === '126-300').too_few_samples, false);
assert.strictEqual(agg.instagram.buckets.find((b) => b.bucket === '126-300').mean_engagement, 60);
assert.strictEqual(agg.linkedin.scored_count, 0);
assert.strictEqual(agg.linkedin.skipped_sync_error, 1);

const tool = await getCaptionLengthPerformance({
  loadRows: async () => rows,
  loadSyncRows: async () => rows,
});
assert.strictEqual(tool.ok, true);
assert.strictEqual(tool.min_samples_for_confidence, CAPTION_LENGTH_MIN_SAMPLES);
assert.ok(tool.platforms.instagram.buckets.some((b) => b.sample_count === 5));
assert.strictEqual(tool.metrics_sync.has_alert, true);
assert.ok(tool.metrics_sync.alerts.some((a) => /LinkedIn/.test(a) && /Reconnecting will not fix this/.test(a)));

const mixed = summarizeMetricsSyncHealth([
  { platform: 'facebook', sync_error: null, synced_at: '2026-08-17T00:00:00Z' },
  { platform: 'facebook', sync_error: 'Facebook: gone', synced_at: '2026-08-16T00:00:00Z' },
  { platform: 'instagram', sync_error: null, synced_at: '2026-08-17T00:00:00Z' },
]);
assert.strictEqual(mixed.platforms.facebook.alert, false);
assert.strictEqual(mixed.platforms.instagram.alert, false);
assert.strictEqual(mixed.has_alert, false);

const allFail = summarizeMetricsSyncHealth(
  Array.from({ length: 5 }, (_, i) => ({
    platform: 'linkedin',
    sync_error: 'LinkedIn: Not enough permissions to access: partnerApiSocialActions.GET.20260701',
    synced_at: `2026-08-1${i}T00:00:00Z`,
  }))
);
assert.strictEqual(allFail.has_alert, true);
assert.strictEqual(allFail.platforms.linkedin.failing_all, true);

const autoV2 = fs.readFileSync(path.join(ROOT, 'lib/ao/autoV2.js'), 'utf8');
assert.ok(/name: 'get_caption_length_performance'/.test(autoV2), 'tool is wired into AUTO_TOOL_SCHEMAS');
assert.ok(/get_caption_length_performance is mandatory/.test(autoV2), 'system prompt requires the tool');
const mandatoryIdx = autoV2.indexOf('get_caption_length_performance is mandatory');
const mandatoryPara = autoV2.slice(mandatoryIdx, autoV2.indexOf('\n\n', mandatoryIdx));
assert.ok(!mandatoryPara.includes('`'), 'new prompt text must not contain backticks');
assert.ok(!mandatoryPara.includes('${'), 'new prompt text must not contain ${');

const handlers = fs.readFileSync(path.join(ROOT, 'lib/ao/autoToolHandlers.js'), 'utf8');
assert.ok(/case 'get_caption_length_performance'/.test(handlers), 'handler switch includes the new tool');

const panel = fs.readFileSync(path.join(ROOT, 'src/components/ao/AutoV2Panel.jsx'), 'utf8');
assert.ok(/metricsSyncAlerts/.test(panel), 'Auto panel surfaces metrics sync alerts');
assert.ok(/Engagement numbers are not updating on some channels/.test(panel), 'warning uses the existing amber box pattern');

const session = fs.readFileSync(path.join(ROOT, 'api/ao/auto/session.js'), 'utf8');
assert.ok(/metrics_sync_alerts/.test(session), 'session load includes sync alerts');

const cron = fs.readFileSync(path.join(ROOT, 'api/cron/ao/sync-post-metrics.js'), 'utf8');
assert.ok(/fetchFacebookPostMetrics/.test(cron) && /fetchInstagramMediaMetrics/.test(cron) && /fetchTwitterPostMetrics/.test(cron));
assert.ok(/r_member_social_feed/.test(cron), 'LinkedIn fetch documents the partner-gated permission');

{
  const reply = 'Longer captions perform better on Instagram.';
  const { unbacked } = findUnbackedActionClaims(reply, { toolResults: [] });
  assert.ok(unbacked.some((u) => u.ruleId === 'caption_length_performance'));
}

console.log('captionLengthPerformance.selftest: PASS');
