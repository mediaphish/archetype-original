/**
 * @jest-environment node
 *
 * Bart, 2026-10-27: "I want our plan that's developed inside Auto to be the
 * schedule. Let's swap captions and schedule, and separate schedule from
 * publish." The plan gives every channel a time, including the two he posts
 * by hand, and publishing uses exactly the approved times.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { readFileSync } from 'node:fs';
import { PLAN_CHANNELS, buildPlan, cleanTimes, planForDraft, planRecord, plannedTimeFor, savedPlan, planTimeForLaunch } from '../ao/schedulePlan.js';

const clock = async (day, platform) => {
  const hour = { linkedin: 15, facebook: 18, instagram: 16, twitter: 14 }[platform];
  return `${day.toISOString().slice(0, 10)}T${hour}:30:00.000Z`;
};

test('every channel is in the plan, including the two Bart posts by hand', () => {
  expect(PLAN_CHANNELS.map((c) => c.key)).toEqual([
    'linkedin_personal', 'linkedin_business', 'facebook_business', 'facebook_personal', 'instagram_business', 'instagram_personal', 'twitter',
  ]);
  expect(PLAN_CHANNELS.filter((c) => c.manual).map((c) => c.key)).toEqual(['linkedin_business', 'facebook_personal']);
});

test('no publish day means nothing to propose yet', async () => {
  const r = await planForDraft({ scheduled_publish_at: null, metadata: {} }, { clockFor: clock });
  expect(r).toMatchObject({ ok: false, needs: 'publish_date' });
});

test('a proposal gives every channel a time on the publish day, sorted by time', async () => {
  const r = await planForDraft({ scheduled_publish_at: '2026-11-04T11:00:00Z', metadata: {} }, { clockFor: clock });
  expect(r.ok).toBe(true);
  expect(r.approved).toBe(false);
  expect(r.plan.rows).toHaveLength(7);
  expect(r.plan.rows.every((row) => row.at.startsWith('2026-11-04'))).toBe(true);
  expect(r.plan.rows[0].key).toBe('twitter');
  expect(r.plan.rows.find((row) => row.key === 'facebook_personal')).toMatchObject({ manual: true, at: '2026-11-04T18:30:00.000Z' });
});

test('changes from Bart or Vox win, and junk is dropped', async () => {
  expect(cleanTimes({ facebook_personal: '2026-11-04T20:00:00Z', tiktok: '2026-11-04T20:00:00Z', twitter: 'soon' })).toEqual({ facebook_personal: '2026-11-04T20:00:00.000Z' });
  const r = await planForDraft({ scheduled_publish_at: '2026-11-04T11:00:00Z', metadata: {} }, { clockFor: clock, overrides: { facebook_personal: '2026-11-04T20:00:00Z' } });
  expect(r.plan.rows.find((row) => row.key === 'facebook_personal').at).toBe('2026-11-04T20:00:00.000Z');
});

test('an approved plan is frozen on the draft and read back as is', async () => {
  const proposed = await planForDraft({ scheduled_publish_at: '2026-11-04T11:00:00Z', metadata: {} }, { clockFor: clock });
  const record = planRecord(proposed.plan, '2026-10-27T15:00:00Z');
  const draft = { scheduled_publish_at: '2026-11-04T11:00:00Z', metadata: { schedule_plan: record } };
  const again = await planForDraft(draft, { clockFor: async () => '2030-01-01T00:00:00Z' });
  expect(again.approved).toBe(true);
  expect(again.plan).toEqual(savedPlan(draft));
  expect(plannedTimeFor(draft, 'linkedin_business')).toBe('2026-11-04T15:30:00.000Z');
});

test('publishing uses the approved time, unless the day has moved since', () => {
  const draft = { metadata: { schedule_plan: { publish_at: '2026-11-04T11:00:00.000Z', times: { linkedin_personal: '2026-11-04T15:30:00.000Z' } } } };
  expect(planTimeForLaunch(draft, 'linkedin_personal', '2026-11-04')).toBe('2026-11-04T15:30:00.000Z');
  expect(planTimeForLaunch(draft, 'linkedin_personal', '2026-11-05')).toBeNull();
  expect(planTimeForLaunch(draft, 'twitter', '2026-11-04')).toBeNull();
  expect(planTimeForLaunch({ metadata: {} }, 'twitter', '2026-11-04')).toBeNull();
});

test('buildPlan puts rows without a time last', () => {
  const p = buildPlan({ publishAt: '2026-11-04T11:00:00Z', times: { twitter: '2026-11-04T14:30:00Z' } });
  expect(p.rows[0].key).toBe('twitter');
  expect(p.rows.slice(1).every((r) => r.at === null)).toBe(true);
});

test('approving the schedule saves the plan, and scheduling captions needs it first', () => {
  const approval = readFileSync('lib/ao/stageApproval.js', 'utf8');
  expect(approval).toMatch(/metadata\.schedule_plan = planRecord\(planned\.plan, now\)/);
  const handlers = readFileSync('lib/ao/autoToolHandlers.js', 'utf8');
  expect(handlers).toMatch(/gate: 'schedule_not_approved'/);
  expect(readFileSync('lib/ao/scheduleJournalLaunchCaptions.js', 'utf8')).toMatch(/source: 'approved_schedule'/);
});
