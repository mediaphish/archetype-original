/**
 * @jest-environment node
 *
 * Bart, 2026-10-06, leaving for eleven days: "I will have connectivity, I just
 * want to not have to be."
 *
 * Every failure in this story was silent. The sender answered 200 OK with
 * "no devotionals published today" on days one was published, twice, and the
 * only detector was an empty inbox: his. He should not be the monitoring.
 *
 * So one check runs after every send window has passed and emails him only when
 * a devotional was scheduled and nobody received it. Nothing from it means the
 * devotional went out, which is the only arrangement that lets him stop looking.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const health = readFileSync(join(root, 'api/cron/devotional-health.js'), 'utf8');
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));

function hoursOf(path) {
  const c = vercel.crons.find((x) => x.path === path);
  return c ? c.schedule.trim().split(/\s+/)[1].split(',').map(Number) : null;
}

describe('the check exists and can run', () => {
  test('it is routed, without which it is a 404 on this project', () => {
    expect((vercel.routes || []).some((r) => r.src === '/api/cron/devotional-health')).toBe(true);
  });

  test('it is scheduled', () => {
    expect(vercel.crons.some((c) => c.path === '/api/cron/devotional-health')).toBe(true);
  });

  test('it carries the schedule file, like the sender does', () => {
    // Without this it cannot tell what was meant to go out, and would report
    // every day as fine.
    const build = vercel.builds.find((b) => b.src === 'api/cron/devotional-health.js');
    expect(build.config.includeFiles).toContain('public/devotional-schedule.json');
  });

  test('it runs after the last send window, not before', () => {
    // Checking at 6am would alert on days that go out fine at 8.
    const sends = hoursOf('/api/cron/daily-devotional-notify');
    const check = hoursOf('/api/cron/devotional-health');
    expect(check).toHaveLength(1);
    expect(check[0]).toBeGreaterThan(Math.max(...sends));
  });
});

describe('what it actually checks', () => {
  test('it counts who received it, not whether the job claimed success', () => {
    // The send marks the day handled before the emails go, so "claimed" and
    // "delivered" are not the same question. Only the second one matters.
    expect(health).toContain('journal_devotional_recipient_sent');
    expect(health).toMatch(/recipients === 0/);
  });

  test('a send that reached almost nobody counts as a failure', () => {
    expect(health).toContain('MIN_HEALTHY_RECIPIENTS');
    expect(health).toMatch(/recipients < MIN_HEALTHY_RECIPIENTS/);
  });

  test('it reads what was meant to go out the same way the sender does', () => {
    const atSchedule = health.indexOf('devotionalsFromSchedule(today)');
    const atFiles = health.indexOf('devotionalsPublishedOn(today)');
    expect(atSchedule).toBeGreaterThan(-1);
    expect(atSchedule).toBeLessThan(atFiles);
  });

  test('being unable to read either source is itself reported', () => {
    // Silence from a check that could not look is the original bug again.
    expect(health).toContain("'unreadable'");
  });
});

describe('it only speaks when something is wrong', () => {
  test('a healthy day sends no email', () => {
    const from = health.indexOf('if (problems.length === 0)');
    const block = health.slice(from, health.indexOf('}', health.indexOf('return', from)));
    expect(block).toContain('healthy: true');
    expect(block).not.toContain('sendAlert');
  });

  test('nothing scheduled is not an alert', () => {
    expect(health).toMatch(/note: 'nothing scheduled'/);
  });

  test('the alert is recorded before it is emailed', () => {
    // Same lesson as the send: the record has to survive a failure to deliver.
    const alert = health.slice(health.indexOf('async function sendAlert'));
    expect(alert.indexOf('ao_devotional_send_log')).toBeLessThan(alert.indexOf('resend.emails.send'));
  });
});
