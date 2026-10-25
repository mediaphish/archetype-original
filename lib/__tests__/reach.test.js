/**
 * @jest-environment node
 *
 * Reach, the publicist inside Auto (Bart, 2026-10-25). Bart sets the vision,
 * Auto decides what is said, Reach decides where, when and how often.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));

const TZ = 'America/Chicago';

describe("Reach's week", () => {
  test('groups one piece across its channels, in Central time, against the rhythm', async () => {
    const { shapeWeek } = await import('../ao/reach/reachWeek.js');
    const { mergePlan } = await import('../ao/reach/reachPlan.js');
    const posts = [
      { id: 'a', platform: 'twitter', account_id: 'personal', scheduled_at: '2026-10-26T14:30:00Z', status: 'scheduled', source_kind: 'journal_launch', intent: { journal_slug: 'the-rehoboam-archetype', title: 'The Rehoboam Archetype' } },
      { id: 'b', platform: 'linkedin', account_id: 'personal', scheduled_at: '2026-10-26T15:30:00Z', status: 'scheduled', source_kind: 'journal_launch', intent: { journal_slug: 'the-rehoboam-archetype', title: 'The Rehoboam Archetype' } },
      { id: 'c', platform: 'linkedin', account_id: 'personal', scheduled_at: '2026-10-28T15:30:00Z', status: 'scheduled', source_kind: 'ao_journal_reshare', intent: { slug: 'accountability-comes-first' } },
    ];
    const w = shapeWeek({ start: '2026-10-26', posts, entries: [], unscheduled: [{ slug: 'leading-generations-part-1', title: 'Leading Generations', status: 'approved' }], plan: mergePlan(), timeZone: TZ });
    const mon = w.days.find((d) => d.weekday === 'monday');
    expect(mon.pieces).toHaveLength(1);
    expect(mon.pieces[0].channels.map((c) => `${c.channel} ${c.time}`)).toEqual(['X 09:30', 'LinkedIn 10:30']);
    // A launch from a hand-written entry counts as Monday's Archetype entry.
    expect(w.gaps.map((g) => g.missing)).toEqual(['Business and leadership entry', 'Resurface']);
    const wed = w.days.find((d) => d.weekday === 'wednesday');
    expect(wed.notes.join(' ')).toMatch(/resurface goes out on wednesday/i);
    expect(w.ready_not_scheduled[0].lane).toBe('leadership_entry');
  });

  test('local times convert both ways across the end of daylight saving', async () => {
    const { localToUtc, localInfo } = await import('../ao/reach/reachWeek.js');
    expect(new Date(localToUtc('2026-10-30', '09:30', TZ)).toISOString()).toBe('2026-10-30T14:30:00.000Z');
    expect(new Date(localToUtc('2026-11-02', '09:30', TZ)).toISOString()).toBe('2026-11-02T15:30:00.000Z');
    expect(localInfo(Date.parse('2026-11-02T15:30:00Z'), TZ)).toMatchObject({ date: '2026-11-02', weekday: 'monday', time: '09:30' });
  });

  test('entries sort into the Archetype series or business and leadership', async () => {
    const { entryLane } = await import('../ao/reach/reachWeek.js');
    expect(entryLane({ slug: 'the-rehoboam-archetype' })).toBe('archetype_entry');
    expect(entryLane({ slug: 'the-decision-you-cannot-hand-off', series_slug: 'leading-with-ai' })).toBe('leadership_entry');
  });
});

describe("Reach's plan", () => {
  test('defaults are the rhythm Bart described, and channel jobs start as a proposal', async () => {
    const { DEFAULT_PLAN } = await import('../ao/reach/reachPlan.js');
    expect(DEFAULT_PLAN.days.monday.expects).toBe('archetype_entry');
    expect(DEFAULT_PLAN.days.wednesday.expects).toBe('leadership_entry');
    expect(DEFAULT_PLAN.days.friday.expects).toBe('resurface');
    expect(DEFAULT_PLAN.channel_jobs_status).toBe('proposed');
  });
});

describe('Reach is wired into Auto', () => {
  const autoV2 = readFileSync(join(process.cwd(), 'lib/ao/autoV2.js'), 'utf8');
  const handlers = readFileSync(join(process.cwd(), 'lib/ao/autoToolHandlers.js'), 'utf8');
  test('Auto has the three Reach tools and runs them', () => {
    for (const name of ['reach_week', 'reach_move_post', 'reach_update_plan']) {
      expect(autoV2).toContain(`name: '${name}'`);
      expect(handlers).toContain(`case '${name}':`);
    }
  });
  test("Auto knows the order: Bart, then Auto, then Reach, and Reach never overrides Bart", () => {
    expect(autoV2).toContain('REACH, YOUR PUBLICIST');
    expect(autoV2).toMatch(/Reach never overrides Bart/);
  });
  test('Auto stops reminding Bart about LinkedIn numbers', () => {
    expect(autoV2).toMatch(/LinkedIn is the exception/);
  });
});
