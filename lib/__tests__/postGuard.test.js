/**
 * @jest-environment node
 *
 * Bart, 2026-11-02: "Can we bring in Bit to help with a self healing situation
 * when posts do not go live."
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { postGuardCheck } from '../ao/team/bit.js';
import { subscriberEmailStep, isPassingPostError, planSocialRepairs, planJournalRepairs, notLiveProblem, guardChanges } from '../ao/team/postGuard.js';

const now = Date.parse('2026-11-02T12:40:00Z');
const ago = (min) => new Date(now - min * 60000).toISOString();

test('only failures that can pass by themselves get retried', () => {
  expect(isPassingPostError('fetch failed')).toBe(true);
  expect(isPassingPostError('Request timed out')).toBe(true);
  expect(isPassingPostError('LinkedIn answered 503')).toBe(true);
  expect(isPassingPostError('Error validating access token: Session has expired')).toBe(false);
  expect(isPassingPostError('Something nobody has seen before')).toBe(false);
});

test('a late post restarts the run, and a post on time does not', () => {
  expect(planSocialRepairs([{ id: 'a', status: 'scheduled', platform: 'x', scheduled_at: ago(25) }], { now }).rerun).toBe(true);
  expect(planSocialRepairs([{ id: 'a', status: 'scheduled', platform: 'x', text: 'Hi', scheduled_at: ago(5) }], { now }).rerun).toBe(false);
});

test('a failed post is retried three times, then goes to Bart', () => {
  const row = { id: 'a', status: 'failed', platform: 'linkedin', scheduled_at: ago(30), error_message: 'fetch failed' };
  expect(planSocialRepairs([row], { now }).retry).toHaveLength(1);
  const spent = planSocialRepairs([{ ...row, intent: { bit_retries: 3 } }], { now });
  expect(spent.retry).toHaveLength(0);
  expect(spent.problems[0].key).toBe('guard_post_a');
});

test('a post that may already have gone out is never resent', () => {
  const plan = planSocialRepairs([{ id: 'a', status: 'publishing', platform: 'x', scheduled_at: ago(40), updated_at: ago(30) }], { now });
  expect(plan.rerun).toBe(false);
  expect(plan.retry).toHaveLength(0);
  expect(plan.problems[0].detail).toMatch(/did not resend/);
  const sent = planSocialRepairs([{ id: 'b', status: 'failed', platform: 'x', scheduled_at: ago(40), error_message: 'fetch failed', external_id: '123' }], { now });
  expect(sent.retry).toHaveLength(0);
});

test('posts waiting on Bart and posts missing pieces are caught ahead of time', () => {
  const soon = new Date(now + 3600000).toISOString();
  expect(planSocialRepairs([{ id: 'a', status: 'pending_review', platform: 'x', scheduled_at: soon }], { now }).problems[0].status).toBe('warn');
  expect(planSocialRepairs([{ id: 'b', status: 'scheduled', platform: 'instagram', text: 'Hi', scheduled_at: soon }], { now }).problems[0].detail).toMatch(/no image/);
  expect(planSocialRepairs([{ id: 'c', status: 'scheduled', platform: 'x', scheduled_at: soon }], { now }).problems[0].detail).toMatch(/no caption/);
});

const ready = {
  id: 'd',
  slug: 'the-josiah-archetype',
  title: 'The Josiah Archetype',
  status: 'approved',
  content: 'Josiah heard a lost book read aloud and kept obeying it. That is the whole point of this post, and it ends here.',
  summary: 'Josiah heard a lost book read aloud and kept obeying it.',
  image_url: 'https://example.com/a.png',
  metadata: { approved_captions: { twitter: 'Caption' } },
  scheduled_publish_at: '2026-11-02T12:00:00Z',
};

test('The Josiah Archetype case: approved captions get booked, then it publishes', () => {
  const plan = planJournalRepairs(ready, { booked: false, now });
  expect(plan.bookCaptions).toBe(true);
  expect(plan.rerun).toBe(true);
  expect(plan.problems).toEqual([]);
});

test('Bit never approves for Bart: what only he can settle goes to him', () => {
  const unapproved = planJournalRepairs({ ...ready, status: 'draft', metadata: {} }, { booked: false, now });
  expect(unapproved.bookCaptions).toBe(false);
  expect(unapproved.rerun).toBe(false);
  expect(unapproved.problems[0].detail).toMatch(/not been approved/);
  expect(unapproved.problems[0].detail).toMatch(/captions have not been approved/);
  const noImage = planJournalRepairs({ ...ready, image_url: null }, { booked: true, now });
  expect(noImage.problems[0].detail).toMatch(/no header image/);
});

test('a post still ahead of its time warns without publishing early', () => {
  const later = { ...ready, image_url: null, scheduled_publish_at: new Date(now + 6 * 3600000).toISOString() };
  const plan = planJournalRepairs(later, { booked: true, now });
  expect(plan.rerun).toBe(false);
  expect(plan.problems[0].detail).toMatch(/will not go live/);
  expect(planJournalRepairs({ ...ready, scheduled_publish_at: later.scheduled_publish_at }, { booked: true, now }).rerun).toBe(false);
});

test('a published post gets time for the site to update before it counts as missing', () => {
  const draft = { id: 'd', slug: 's', title: 'T', published_at: ago(10) };
  expect(notLiveProblem(draft, { live: false, now })).toBeNull();
  expect(notLiveProblem({ ...draft, published_at: ago(30) }, { live: true, now })).toBeNull();
  expect(notLiveProblem({ ...draft, published_at: ago(30) }, { live: false, now }).key).toBe('guard_live_d');
});

test('Bart hears about a problem once, and once when it settles', () => {
  const p = { key: 'guard_a', status: 'broken' };
  expect(guardChanges([], [p]).newlyWrong).toEqual([p]);
  expect(guardChanges([p], [p]).newlyWrong).toEqual([]);
  expect(guardChanges([p], []).fixed).toEqual([p]);
  expect(guardChanges([{ key: 'guard_a', status: 'ok' }], []).fixed).toEqual([]);
  expect(guardChanges([{ key: 'guard_a', status: 'ok' }], [p]).newlyWrong).toEqual([p]);
});

test('Bit notices if the guard itself goes quiet', () => {
  expect(postGuardCheck(ago(20), { now }).status).toBe('ok');
  expect(postGuardCheck(ago(90), { now }).status).toBe('broken');
  expect(postGuardCheck(null, { now }).status).toBe('broken');
});

test('subscribers get each post once, and only after it is live', () => {
  const draft = { id: 'd', slug: 's', title: 'T', metadata: {} };
  expect(subscriberEmailStep(draft, { live: false, now }).action).toBe('none');
  expect(subscriberEmailStep(draft, { live: true, now }).action).toBe('send');
  expect(subscriberEmailStep({ ...draft, metadata: { subscriber_email: { sent_at: ago(5) } } }, { live: true, now }).action).toBe('none');
  expect(subscriberEmailStep({ ...draft, metadata: { subscriber_email: { started_at: ago(5) } } }, { live: true, now }).action).toBe('none');
  const stuck = subscriberEmailStep({ ...draft, metadata: { subscriber_email: { started_at: ago(30) } } }, { live: true, now });
  expect(stuck.action).toBe('report');
  expect(stuck.problem.detail).toMatch(/did not send it again/);
});
