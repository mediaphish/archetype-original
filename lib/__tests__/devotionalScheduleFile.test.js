/**
 * @jest-environment node
 *
 * Eleven days off grid (2026-10-06). Bart: "I cannot have this fail."
 *
 * The devotional email had two senders and both were unreliable in the same way.
 * The GitHub job runs four to six times a day at GitHub's discretion, and had
 * carried this for months only because one of those runs usually landed shortly
 * after midnight Central. On October 6 the last run was 11:52pm the night before
 * and the next had not come by morning, so nothing sent.
 *
 * The 6:20am backup existed for exactly that and had never once worked. It read
 * the site's content list, which deliberately excludes future dates so the
 * website cannot show a devotional early, so a devotional only entered the list
 * once a rebuild happened to run on its own publish date. Reading the markdown
 * files instead was right in principle and died in deployment: the 302 files
 * were never bundled into the function, so it fell back to the stale list every
 * morning and two days of "fixed" changed nothing.
 *
 * The schedule file is the fix: built alongside knowledge.json, carrying future
 * dates on purpose, one small file where a 302-file directory would not travel.
 */
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devotionalsFromSchedule } from '../devotionalsForDate.js';

const root = process.cwd();
const SCHEDULE = join(root, 'public', 'devotional-schedule.json');

describe('the schedule file exists and looks right', () => {
  test('the build produced it', () => {
    expect(existsSync(SCHEDULE)).toBe(true);
  });

  test('it carries future dates, which is the entire point', () => {
    const data = JSON.parse(readFileSync(SCHEDULE, 'utf8'));
    const today = new Date().toISOString().slice(0, 10);
    const ahead = data.devotionals.filter((d) => d.publish_date > today);
    // Without future dates this is just the content list again, and the race
    // that caused two missed mornings comes straight back.
    expect(ahead.length).toBeGreaterThan(0);
  });

  test('every entry has what the email needs', () => {
    const data = JSON.parse(readFileSync(SCHEDULE, 'utf8'));
    expect(data.devotionals.length).toBeGreaterThan(100);
    for (const d of data.devotionals.slice(0, 50)) {
      expect(d.slug).toBeTruthy();
      expect(d.title).toBeTruthy();
      expect(d.publish_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.status).toBe('published');
    }
  });

  test('no two devotionals share a day, which would send two emails', () => {
    const data = JSON.parse(readFileSync(SCHEDULE, 'utf8'));
    const seen = new Map();
    for (const d of data.devotionals) {
      if (seen.has(d.publish_date)) {
        throw new Error(`${d.publish_date} has both ${seen.get(d.publish_date)} and ${d.slug}`);
      }
      seen.set(d.publish_date, d.slug);
    }
    expect(seen.size).toBe(data.devotionals.length);
  });
});

describe('reading a day out of it', () => {
  test('a day with a devotional returns it', () => {
    const data = JSON.parse(readFileSync(SCHEDULE, 'utf8'));
    const some = data.devotionals[data.devotionals.length - 1];
    const found = devotionalsFromSchedule(some.publish_date);
    expect(found.map((d) => d.slug)).toContain(some.slug);
  });

  test('a day with none returns empty, not a failure', () => {
    expect(devotionalsFromSchedule('1999-01-01')).toEqual([]);
  });

  test('an unreadable file returns null, so the caller falls back', () => {
    // "I could not look" and "I looked and there is nothing" must stay
    // distinguishable. Collapsing them is what sent nothing on a day that had
    // a devotional sitting right there.
    expect(devotionalsFromSchedule('2026-10-06', { file: 'no/such/file.json' })).toBeNull();
  });

  test('a corrupt file returns null rather than throwing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sched-'));
    const bad = join(dir, 'bad.json');
    writeFileSync(bad, 'not json at all');
    expect(devotionalsFromSchedule('2026-10-06', { file: bad })).toBeNull();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('it is wired up where it has to be', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  const cron = readFileSync(join(root, 'api/cron/daily-devotional-notify.js'), 'utf8');

  test('the build generates it', () => {
    expect(pkg.scripts['build:prerender']).toContain('generate-devotional-schedule.mjs');
  });

  test('it ships inside the function, without which none of this applies', () => {
    const build = vercel.builds.find((b) => b.src === 'api/cron/daily-devotional-notify.js');
    expect(build.config.includeFiles).toContain('public/devotional-schedule.json');
    const all = vercel.builds.find((b) => b.src === 'api/**/*.js');
    expect(all.config.includeFiles).toContain('public/devotional-schedule.json');
  });

  test('the sender reads it first, then files, then the old list', () => {
    const atSchedule = cron.indexOf('devotionalsFromSchedule(todayStr)');
    const atFiles = cron.indexOf('devotionalsPublishedOn(todayStr)');
    const atList = cron.indexOf("source = 'knowledge_list'");
    expect(atSchedule).toBeGreaterThan(-1);
    expect(atSchedule).toBeLessThan(atFiles);
    expect(atFiles).toBeLessThan(atList);
  });

  test('it gets more than one chance a day', () => {
    // One run a day means one bad morning is a lost day. Four runs mean a
    // transient failure heals itself before anyone notices.
    const c = vercel.crons.find((x) => x.path === '/api/cron/daily-devotional-notify');
    const hours = c.schedule.trim().split(/\s+/)[1];
    expect(hours.split(',').length).toBeGreaterThanOrEqual(3);
  });

  test('every run is recorded, so a silent miss becomes visible', () => {
    expect(cron).toContain('ao_devotional_send_log');
    expect(cron).toContain('recordRun');
  });
});
