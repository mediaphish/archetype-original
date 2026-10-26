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
import {
  nextWeekday as serverNextWeekday,
  addBusinessDays as serverAddBusinessDays,
  slotsSkippingWeekends,
  RESHARE_DAYS,
  nextReshareDay,
  QUOTE_CARD_GAP_DAYS,
} from '../ao/postingCadence.js';
import {
  nextWeekday as clientNextWeekday,
  addBusinessDays as clientAddBusinessDays,
  nextOpenCardDay,
} from '../../src/lib/postingCadence.js';

const root = process.cwd();
const bundle =
  readFileSync(join(root, 'api/ao/publishing/schedule-weekly-pull-bundle.js'), 'utf8') +
  readFileSync(join(root, 'lib/ao/scheduleWeeklyBundle.js'), 'utf8');
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
    expect(bundle).toContain('slotsSkippingWeekends(start, items.length, gapDays)');
    expect(bundle).not.toMatch(/i \* gapDays \* 86400000/);
  });

  test('three working days is the default rather than one calendar day', () => {
    expect(QUOTE_CARD_GAP_DAYS).toBe(3);
    expect(bundle).toMatch(/gap_days \?\? QUOTE_CARD_GAP_DAYS/);
  });

  test('five cards from a Monday land Mon, Thu, Tue, Fri, Wed and never on a weekend', () => {
    const days = slots('2026-10-05T15:00:00Z', 5, 3).map((d) => d.getUTCDay());
    expect(days).toEqual([1, 4, 2, 5, 3]);
    expect(days.some((d) => d === 0 || d === 6)).toBe(false);
  });
});

describe('resurfaces go out on Fridays', () => {
  // 2026-10-25: "Resurface is a Friday task. Not Wednesday."
  test('both day pickers use the shared Friday rule and skip a taken Friday', () => {
    expect(RESHARE_DAYS).toEqual([5]);
    for (const source of [review, engine]) {
      expect(source).toContain('RESHARE_DAYS');
      expect(source).toContain("['ao_journal_reshare', 'journal_launch']");
      // No weekday is allowed through on a bare weekend check any more.
      expect(source).not.toMatch(/if \(dow === 0 \|\| dow === 6\) continue;/);
    }
  });

  test('neither falls back to "tomorrow", which could be a Saturday', () => {
    for (const source of [review, engine]) {
      expect(source).not.toMatch(/setDate\((?:today|tomorrow)\.getDate\(\) \+ 1\);\s*\n\s*(?:scheduleDay = tomorrow|return tomorrow)/);
    }
  });
});

describe('the reshare job does not run on a Sunday', () => {
  test('it runs once a week, on Monday, to ready that Friday\'s resurface for review', () => {
    const cron = vercel.crons.find((c) => c.path === '/api/ao/auto/reshare-journal');
    expect(cron).toBeTruthy();
    const dayField = cron.schedule.trim().split(/\s+/)[4];
    expect(dayField).toBe('1');
    expect(dayField).not.toMatch(/(^|,)0($|,)/);
  });
});

describe('the rules live in one place', () => {
  test('both schedulers import them rather than keeping their own copy', () => {
    expect(bundle).toContain("from '../../../lib/ao/postingCadence.js'");
    expect(bundle).toContain("from './postingCadence.js'");
    expect(review).toContain("from '../../../lib/ao/postingCadence.js'");
    expect(engine).toContain("from '../../../lib/ao/postingCadence.js'");
    // No scheduler redefines the day list for itself.
    expect(review).not.toMatch(/const RESHARE_DAYS = \[/);
    expect(engine).not.toMatch(/const RESHARE_DAYS = \[/);
  });

  test('the browser copy gives the same answers as the server one', () => {
    // A year of start dates, so a drift between the two cannot hide in a corner.
    for (let i = 0; i < 365; i += 1) {
      const start = new Date(Date.UTC(2026, 0, 1 + i, 15, 0, 0));
      expect(clientNextWeekday(start).toISOString()).toBe(serverNextWeekday(start).toISOString());
      for (const gap of [1, 2, 3, 7]) {
        expect(clientAddBusinessDays(start, gap).toISOString()).toBe(
          serverAddBusinessDays(start, gap).toISOString()
        );
      }
    }
  });

  test('the shared helpers hold the cadence Bart set', () => {
    expect(RESHARE_DAYS).toEqual([5]);
    const days = slotsSkippingWeekends(new Date('2026-10-05T15:00:00Z'), 5, 3).map((d) => d.getUTCDay());
    expect(days).toEqual([1, 4, 2, 5, 3]);
    // From a Friday, the next resurface day is the following Friday.
    expect(nextReshareDay(new Date('2026-10-09T15:00:00Z')).getDay()).toBe(5);
  });
});

describe('a new run of cards continues the stream', () => {
  test('it starts three working days after the last card already scheduled', () => {
    // Last card on Friday Oct 16: the next lands Wednesday Oct 21, not Monday.
    // The clock is pinned to the week this was written. Without that, the test
    // began failing on Oct 21 itself, when "never schedule into the past"
    // correctly pushed the answer to the 22nd.
    jest.useFakeTimers().setSystemTime(new Date('2026-10-17T12:00:00Z'));
    try {
      const next = nextOpenCardDay('2026-10-16T15:00:00Z', 3);
      expect(next.toISOString().slice(0, 10)).toBe('2026-10-21');
    } finally {
      jest.useRealTimers();
    }
  });

  test('a stream that ended in the past does not schedule into the past', () => {
    const next = nextOpenCardDay('2020-01-06T15:00:00Z', 3);
    expect(next.getTime()).toBeGreaterThan(Date.now());
    expect([0, 6]).not.toContain(next.getUTCDay());
  });

  test('with nothing scheduled it still picks a working day', () => {
    const next = nextOpenCardDay(null, 3);
    expect(next.getTime()).toBeGreaterThan(Date.now());
    expect([0, 6]).not.toContain(next.getUTCDay());
  });
});

test('approving a reshare keeps its time only when that time is a Friday (2026-10-26)', () => {
  expect(review).toMatch(/RESHARE_DAYS\.includes\(chicagoDow\)/);
});
