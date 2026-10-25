/**
 * @jest-environment node
 *
 * Bart, 2026-10-25: the schedule felt like a shotgun. Monday 10:30 put a journal
 * launch and a pull quote on LinkedIn in the same minute. Several posts a day on
 * a channel are fine; piling up is not.
 */
import { spreadRows, firstOpenTime, MIN_GAP_MS } from '../ao/channelSpacing.js';

const TZ = 'America/Chicago';
const at = (iso) => new Date(iso).toISOString();

describe('automatic posts on one account sit at least two hours apart', () => {
  test('a pull quote at the same minute as a journal launch moves later the same day', () => {
    const existing = [
      { id: 'launch', platform: 'linkedin', account_id: 'personal', scheduled_at: '2026-10-26T15:30:00Z', source_kind: 'journal_launch' },
    ];
    const rows = [{ platform: 'linkedin', account_id: 'personal', scheduled_at: '2026-10-26T15:30:00Z', source_kind: 'weekly_pull_bundle' }];
    const { rows: out, moves } = spreadRows(rows, existing, { timeZone: TZ });
    expect(moves).toEqual([]);
    expect(Date.parse(out[0].scheduled_at) - Date.parse('2026-10-26T15:30:00Z')).toBe(MIN_GAP_MS);
  });

  test('a journal launch never moves; the automatic post in its way does', () => {
    const existing = [
      { id: 'bundle', platform: 'linkedin', account_id: 'personal', scheduled_at: '2026-10-26T15:30:00Z', source_kind: 'weekly_pull_bundle' },
    ];
    const rows = [{ platform: 'linkedin', account_id: 'personal', scheduled_at: '2026-10-26T15:30:00Z', source_kind: 'journal_launch' }];
    const { rows: out, moves } = spreadRows(rows, existing, { timeZone: TZ });
    expect(at(out[0].scheduled_at)).toBe(at('2026-10-26T15:30:00Z'));
    expect(moves).toHaveLength(1);
    expect(moves[0].id).toBe('bundle');
    expect(Date.parse(moves[0].scheduled_at)).toBeGreaterThanOrEqual(Date.parse('2026-10-26T15:30:00Z') + MIN_GAP_MS);
  });

  test('the two Instagram accounts are separate and do not push each other', () => {
    const rows = [
      { platform: 'instagram', account_id: 'meta', scheduled_at: '2026-10-28T16:30:00Z', source_kind: 'ao_journal_reshare' },
      { platform: 'instagram', account_id: 'ig_mediaphish', scheduled_at: '2026-10-28T16:30:00Z', source_kind: 'ao_journal_reshare' },
    ];
    const { rows: out } = spreadRows(rows, [], { timeZone: TZ });
    expect(out.map((r) => r.scheduled_at)).toEqual([at('2026-10-28T16:30:00Z'), at('2026-10-28T16:30:00Z')]);
  });

  test('different channels at the same time are fine', () => {
    const existing = [{ id: 'x', platform: 'twitter', account_id: 'personal', scheduled_at: '2026-10-27T17:30:00Z', source_kind: 'infographic' }];
    const rows = [{ platform: 'linkedin', account_id: 'personal', scheduled_at: '2026-10-27T17:30:00Z', source_kind: 'infographic' }];
    expect(spreadRows(rows, existing, { timeZone: TZ }).rows[0].scheduled_at).toBe(at('2026-10-27T17:30:00Z'));
  });

  test('a full afternoon rolls to the next weekday morning, never a weekend or the evening', () => {
    // Friday 4:00pm Central with a post at 4:00pm: nothing fits by 5:30pm, so Monday 9:30am.
    const t = firstOpenTime(Date.parse('2026-10-30T21:00:00Z'), [Date.parse('2026-10-30T21:00:00Z')], { timeZone: TZ });
    expect(new Date(t).toISOString()).toBe('2026-11-02T15:30:00.000Z');
  });
});
