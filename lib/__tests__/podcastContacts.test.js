/**
 * @jest-environment node
 *
 * Bart, 2026-10-25: "Please make sure all guests are added to the CRM. Even
 * without a tier locked in, they are still contacts that I will want my team
 * to follow up on."
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));

const DAY = 24 * 60 * 60 * 1000;

describe('podcast guests are contacts', () => {
  test('Contact is a stage, and silence counts for contacts too', async () => {
    const { STAGES } = await import('../calendly/clients.js');
    expect(STAGES[0]).toEqual({ key: 'contact', label: 'Contact' });
    const { quietness } = await import('../calendly/intelligence.js');
    const now = Date.parse('2026-10-25T12:00:00Z');
    const person = { stage: 'contact', record: {}, sessions: [], events: [{ kind: 'podcast_intake', at: new Date(now - 26 * DAY).toISOString() }] };
    expect(quietness(person, now)?.days).toBe(26);
  });

  test('a guest who has not recorded gets a next move to get it recorded', async () => {
    const { nextMoves } = await import('../calendly/intelligence.js');
    const now = Date.parse('2026-10-25T12:00:00Z');
    const p = { name: 'Matthew R Burgess', stage: 'contact', record: { flags: { podcast_guest: { track: 'mentor session', submitted_at: new Date(now - 26 * DAY).toISOString() } } }, sessions: [] };
    expect(nextMoves(p, now)[0]).toMatchObject({ kind: 'schedule_podcast', label: "Get Matthew's mentor session recorded" });
    const recorded = { ...p, record: { flags: { podcast_guest: { track: 'interview', recorded_at: '2026-08-13T12:00:00Z' } } } };
    expect(nextMoves(recorded, now).some((m) => m.kind === 'schedule_podcast')).toBe(false);
  });

  test('every new sign-up is added, and the half-hourly check fills any gap', () => {
    expect(readFileSync(join(process.cwd(), 'api/podcast/guest-intake.js'), 'utf8')).toMatch(/addGuestAsContact\(stored\.guest\)/);
    expect(readFileSync(join(process.cwd(), 'api/cron/ao/producer-intake.js'), 'utf8')).toMatch(/syncPodcastGuestsToCrm\(\)/);
    expect(readFileSync(join(process.cwd(), 'lib/calendly/people.js'), 'utf8')).toMatch(/Contacts with no booking yet/);
  });
});
