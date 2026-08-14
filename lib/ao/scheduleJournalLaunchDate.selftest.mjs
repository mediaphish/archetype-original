/**
 * #128 journal launch date resolution — must use draft scheduled_publish_at,
 * never the unrelated cross-content queue.
 * Run: node lib/ao/scheduleJournalLaunchDate.selftest.mjs
 */
import assert from 'assert';
import {
  resolveJournalLaunchPublishYmd,
  ymdFromScheduledPublishAt,
  assertLaunchDateNearTarget,
} from './resolveJournalLaunchDate.js';

function dateFromYmd(ymd) {
  if (!ymd) return null;
  const d = new Date(`${ymd}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// YMD from DB timestamptz (Aug 19 11:00 UTC = Aug 19 morning CT)
{
  const ymd = ymdFromScheduledPublishAt('2026-08-19T11:00:00.000Z');
  assert.strictEqual(ymd, '2026-08-19');
}

// Test 1 + 4: DB date wins; markdown unused; quote-card queue irrelevant (not consulted)
{
  const resolved = resolveJournalLaunchPublishYmd({
    slug: 'the-standard-that-held',
    scheduledPublishAt: '2026-08-19T11:00:00.000Z',
    readMarkdownPublishDate: () => {
      throw new Error('markdown must not be read when DB date exists');
    },
  });
  assert.ok(resolved.ok);
  assert.strictEqual(resolved.publishYmd, '2026-08-19');
  assert.strictEqual(resolved.source, 'db');
  const launch = dateFromYmd(resolved.publishYmd);
  assert.ok(launch);
  assert.strictEqual(launch.toISOString().slice(0, 10), '2026-08-19');
}

// Test 2: neither DB nor markdown → clear error (no queue fallback)
{
  const resolved = resolveJournalLaunchPublishYmd({
    slug: 'no-date-post',
    scheduledPublishAt: null,
    readMarkdownPublishDate: () => null,
  });
  assert.strictEqual(resolved.ok, false);
  assert.match(resolved.error, /No target publish date/i);
  assert.match(resolved.error, /will not guess/i);
}

// Markdown legacy fallback when DB empty
{
  const resolved = resolveJournalLaunchPublishYmd({
    slug: 'legacy-md',
    scheduledPublishAt: null,
    readMarkdownPublishDate: () => '2026-09-01',
  });
  assert.ok(resolved.ok);
  assert.strictEqual(resolved.source, 'markdown');
  assert.strictEqual(resolved.publishYmd, '2026-09-01');
}

// Drift backstop: Oct 7 vs Aug 19 refuses; matching Aug 19 accepts
{
  const driftBad = assertLaunchDateNearTarget(
    dateFromYmd('2026-10-07'),
    '2026-08-19T11:00:00.000Z'
  );
  assert.strictEqual(driftBad.ok, false);
  assert.ok(driftBad.drift_days > 14);

  const driftOk = assertLaunchDateNearTarget(
    dateFromYmd('2026-08-19'),
    '2026-08-19T11:00:00.000Z'
  );
  assert.strictEqual(driftOk.ok, true);
}

console.log('scheduleJournalLaunchDate.selftest: PASS');
