/**
 * Merge + fallback tests for quote-card publish scheduling (no API calls).
 * Run: node scripts/publish-schedule-merge-test.mjs
 */

import { mergeScheduleOpts, parseLocalTimeFallback } from '../lib/ao/publishScheduleExtract.js';

let failed = 0;
function assert(name, cond) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failed += 1;
  } else {
    console.log(`ok: ${name}`);
  }
}

const t1 = parseLocalTimeFallback('Please not 5:30 AM');
assert('parseLocalTimeFallback not 5:30 → 10:00', t1.hour === 10 && t1.minute === 0);

const t2 = parseLocalTimeFallback('post at 14:30');
assert('parseLocalTimeFallback 24h', t2.hour === 14 && t2.minute === 30);

const t3 = parseLocalTimeFallback('3pm please');
assert('parseLocalTimeFallback pm', t3.hour === 15 && t3.minute === 0);

const t4 = parseLocalTimeFallback('prefer afternoons');
assert('parseLocalTimeFallback afternoon default', t4.hour === 14 && t4.minute === 0);

const m1 = mergeScheduleOpts({
  extracted: {},
  pending: { gap_days: 1 },
  message: 'I do not want consecutive days',
});
assert('merge bumps 1→2 when vague wider-than-daily', m1.gapDays === 2);

const m2 = mergeScheduleOpts({
  extracted: {},
  pending: { gap_days: 1 },
  message: 'every other day please',
});
assert('merge explicit every other day → 2', m2.gapDays === 2);

const m3 = mergeScheduleOpts({
  extracted: {},
  pending: { gap_days: 3, preferred_local_hour: 10, preferred_local_minute: 0 },
  message: 'ok',
});
assert('merge keeps pending gap and time', m3.gapDays === 3 && m3.localHour === 10 && m3.localMinute === 0);

const m4 = mergeScheduleOpts({
  extracted: { gap_days: 4, local_hour: null, local_minute: null, user_facing_note: '' },
  pending: { gap_days: 2 },
  message: 'space them more',
});
assert('merge prefers extracted gap', m4.gapDays === 4);

const m5 = mergeScheduleOpts({
  extracted: { gap_days: 99, local_hour: null, local_minute: null, user_facing_note: '' },
  pending: null,
  message: 'test',
});
assert('merge clamps gap to 14', m5.gapDays === 14);

const m6 = mergeScheduleOpts({
  extracted: {},
  pending: null,
  message: 'not every day please',
});
assert('merge initial vague wider-than-daily → gap 2', m6.gapDays === 2);

process.exit(failed ? 1 : 0);
