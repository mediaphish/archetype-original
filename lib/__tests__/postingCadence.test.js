/**
 * @jest-environment node
 *
 * The cadence Bart set, 2026-10-02.
 *
 *   "Quotes are every 3 days skipping weekends."
 *   "Reshares would be Monday Wednesday and Friday no weekends."
 *   "I wouldn't want it to run on Sunday."
 *
 * Both schedulers used to count plain calendar days and allow any weekday the
 * engagement numbers liked, so a cadence he had decided on drifted. These are the
 * rules themselves, checked against the files that hold them.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const bundle = readFileSync(join(root, 'api/ao/publishing/schedule-weekly-pull-bundle.js'), 'utf8');
const review = readFileSync(join(root, 'api/ao/auto/reshare-review.js'), 'utf8');
const engine = readFileSync(join(root, 'api/ao/auto/reshare-journal.js'), 'utf8');
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));

/** The same walk the bundle scheduler does, so the dates can be checked directly. */
function slots(startIso, count, gapDays) {
  const nextWeekday = (d0) => {
    const d = new Date(d0.getTime());
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  };
  const addBusinessDays = (d0, days) => {
    const d = new Date(d0.getTime());
    let left = Math.max(1, days);
    while (left > 0) {
      d.setUTCDate(d.getUTCDate() + 1);
      if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) left -= 1;
    }
    return d;
  };
  const out = [];
  let cursor = nextWeekday(new Date(startIso));
  for (let i = 0; i < count; i += 1) {
    out.push(new Date(cursor.getTime()));
    cursor = addBusinessDays(cursor, gapDays);
  }
  return out;
}

describe('quote cards go out every three working days', () => {
  test('the scheduler counts working days, not calendar days', () => {
    expect(bundle).toContain('function addBusinessDays');
    expect(bundle).toContain('slotsSkippingWeekends(start, items.length, gapDays)');
  });

  test('three days is the default rather than one', () => {
    expect(bundle).toMatch(/gap_days \?\? '3'/);
  });

  test('five cards from a Monday land Mon, Thu, Tue, Fri, Wed and never on a weekend', () => {
    const days = slots('2026-10-05T15:00:00Z', 5, 3).map((d) => d.getUTCDay());
    expect(days).toEqual([1, 4, 2, 5, 3]);
    expect(days.some((d) => d === 0 || d === 6)).toBe(false);
  });
});

describe('reshares go out Monday, Wednesday and Friday', () => {
  test('both day pickers are limited to those three', () => {
    expect(review).toContain('const RESHARE_DAYS = [1, 3, 5]');
    expect(engine).toContain('const RESHARE_DAYS = [1, 3, 5]');
  });

  test('neither falls back to "tomorrow", which could be a Saturday', () => {
    for (const source of [review, engine]) {
      expect(source).not.toMatch(/setDate\((?:today|tomorrow)\.getDate\(\) \+ 1\);\s*\n\s*(?:scheduleDay = tomorrow|return tomorrow)/);
    }
  });
});

describe('the reshare job does not run on a Sunday', () => {
  test('it runs on the three posting days instead', () => {
    const cron = vercel.crons.find((c) => c.path === '/api/ao/auto/reshare-journal');
    expect(cron).toBeTruthy();
    const dayField = cron.schedule.trim().split(/\s+/)[4];
    expect(dayField).toBe('1,3,5');
    expect(dayField).not.toMatch(/(^|,)0($|,)/);
  });
});
