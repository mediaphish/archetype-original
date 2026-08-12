/**
 * Regression: getRecommendedSchedule returns engagement_data when samples >= 3,
 * and fallback_insufficient_data (canonical PLATFORM_TIMES) when thin.
 *
 * Run: node lib/ao/getRecommendedSchedule.selftest.mjs
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

const { PLATFORM_TIMES } = await import('./unifiedScheduler.js');
const {
  __setResolveSuggestedLocalClockTestOverride,
} = await import('./postMetrics.js');
const { getRecommendedSchedule } = await import('./scheduleHeuristic.js');

async function main() {
  __setResolveSuggestedLocalClockTestOverride(async () => ({
    hour: 19,
    minute: 30,
    source: 'engagement_data',
    sample_count: 14,
  }));
  try {
    const rich = await getRecommendedSchedule({ platforms: ['instagram'], count: 1 });
    assert.strictEqual(rich.ok, true);
    assert.strictEqual(rich.channels.instagram.source, 'engagement_data');
    assert.strictEqual(rich.channels.instagram.sample_count, 14);
    assert.ok(rich.channels.instagram.scheduled_at);
    assert.strictEqual(rich.channels.instagram.local_hour, 19);
  } finally {
    __setResolveSuggestedLocalClockTestOverride(null);
  }

  __setResolveSuggestedLocalClockTestOverride(async () => ({
    hour: 10,
    minute: 30,
    source: 'fallback_insufficient_data',
    sample_count: 1,
  }));
  try {
    const thin = await getRecommendedSchedule({ platforms: ['linkedin'], count: 1 });
    assert.strictEqual(thin.channels.linkedin.source, 'fallback_insufficient_data');
    assert.strictEqual(
      thin.channels.linkedin.fallback_utc_time,
      String(PLATFORM_TIMES.linkedin).slice(0, 5)
    );
    // Old prompt table used 20:00 — must not be the canonical fallback anymore
    assert.notStrictEqual(thin.channels.linkedin.fallback_utc_time, '20:00');
  } finally {
    __setResolveSuggestedLocalClockTestOverride(null);
  }

  assert.strictEqual(PLATFORM_TIMES.linkedin, '15:00:00');
  assert.strictEqual(PLATFORM_TIMES.instagram, '16:00:00');
  assert.strictEqual(PLATFORM_TIMES.facebook, '18:00:00');
  assert.strictEqual(PLATFORM_TIMES.twitter, '14:00:00');

  console.log('getRecommendedSchedule.selftest: PASS');
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
