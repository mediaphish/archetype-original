/**
 * @jest-environment node
 *
 * Bart, 2026-10-27: "I want as much in chat as we can get there. Even if it's a
 * queue channel." #queue counts what is waiting on him, and a journal post
 * counts only when the piece for its next step exists.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { readFileSync } from 'node:fs';
import { journalWaiting, queueCount } from '../ao/queueFeed.js';

const base = { kind: 'journal', status: 'draft', content: 'word '.repeat(700), metadata: {} };

test('a written post waits on his read; an empty one does not', () => {
  expect(journalWaiting(base)).toMatchObject({ step: 'post', label: 'The post is ready for your read' });
  expect(journalWaiting({ ...base, content: '' })).toBeNull();
  // A saved idea for later is not a draft to read.
  expect(journalWaiting({ ...base, content: 'Fast follow for a future positive Archetype entry. Mechanism: ...' })).toBeNull();
});

test('an approved post waits on him only once its image exists', () => {
  const approved = { ...base, status: 'approved', approved_at: '2026-10-27T00:00:00Z' };
  expect(journalWaiting(approved)).toBeNull();
  expect(journalWaiting({ ...approved, image_url: 'x.jpg' })).toMatchObject({ step: 'image' });
});

test('schedule, captions, and a post with its day already set', () => {
  const imaged = { ...base, status: 'approved', approved_at: 'x', image_url: 'x.jpg', metadata: { stage_approvals: { image: { approved_at: 'x' } } } };
  expect(journalWaiting(imaged)).toBeNull();
  expect(journalWaiting({ ...imaged, scheduled_publish_at: '2026-11-02T12:00:00Z' })).toMatchObject({ step: 'schedule' });
  const planned = { ...imaged, scheduled_publish_at: '2026-11-02T12:00:00Z', metadata: { stage_approvals: { image: { approved_at: 'x' }, schedule: { approved_at: 'x' } } } };
  expect(journalWaiting(planned)).toBeNull();
  expect(journalWaiting(planned, { captionCount: 5 })).toMatchObject({ step: 'captions' });
  const done = { ...planned, metadata: { stage_approvals: { ...planned.metadata.stage_approvals, captions: { approved_at: 'x' } } } };
  expect(journalWaiting(done)).toBeNull();
  expect(journalWaiting({ ...done, scheduled_publish_at: null })).toMatchObject({ step: 'ready', label: 'Ready to publish' });
});

test('published and other kinds never show', () => {
  expect(journalWaiting({ ...base, status: 'published' })).toBeNull();
  expect(journalWaiting({ ...base, kind: 'devotional' })).toBeNull();
});

test('one number, with the week of quote cards counted once', () => {
  expect(queueCount({ emails: 1, reshares: 2, infographics: 3, quote_cards: 5, questions: 1, posts: 2 })).toBe(10);
  expect(queueCount({})).toBe(0);
});

test('wired: the endpoint is routed and the chat shows #queue', () => {
  expect(readFileSync('vercel.json', 'utf8')).toMatch(/"src": "\/api\/ao\/queue",\s*"dest": "\/api\/ao\/queue\.js"/);
  const panel = readFileSync('src/components/ao/AutoV2Panel.jsx', 'utf8');
  expect(panel).toMatch(/<QueueChannelRow count=\{queueCount\}/);
  expect(panel).toMatch(/<QueueFeed onOpenThread=\{openThreadFromQueue\}/);
});

// 2026-10-27: the Eli outline sat where the post goes and showed as "ready for
// your read" before Bart had approved the research and brief.
test('an outline in the post body waits on the brief, not the post', () => {
  const outline = 'THE ELI ARCHETYPE outline '.concat('point '.repeat(800));
  const eli = { ...base, content: outline, metadata: { brief: { outline_text: outline, outline_presented_at: '2026-10-27T18:46:00Z' } } };
  expect(journalWaiting(eli)).toMatchObject({ step: 'brief', label: 'The research and brief are ready for your OK' });
  // A short fast-follow note is a saved idea, not a brief to approve.
  const note = 'Fast follow for a future positive entry. '.concat('idea '.repeat(200));
  expect(journalWaiting({ ...base, content: note, metadata: { brief: { outline_text: note, outline_presented_at: '2026-10-27T02:00:00Z' } } })).toBeNull();
  // Once the brief is approved and the real post is written, the post waits.
  expect(journalWaiting({ ...eli, content: 'Prose '.repeat(900), metadata: { ...eli.metadata, stage_approvals: { brief: { approved_at: 'x' } } } })).toMatchObject({ step: 'post' });
});

// 2026-10-28: Bart answered Bit's question in the chat and it still sat in #queue.
test('a reply Bart typed closes a teammate question; team notes do not', () => {
  const { isBartReply } = require('../ao/queueFeed.js');
  expect(isBartReply({ role: 'user', content: 'https://www.archetypeoriginal.com/faith?slug=before-the-sun-sets', meta: { auto_v2: true } })).toBe(true);
  expect(isBartReply({ role: 'user', content: '[TEAM TASK from Cam] Drop links', meta: { team_task: true } })).toBe(false);
  expect(isBartReply({ role: 'user', content: '[TEAM] Huddle.', meta: { team_note: true } })).toBe(false);
  expect(isBartReply({ role: 'assistant', content: 'Cam: done' })).toBe(false);
});

// 2026-10-28: "There is no context ... What is A to D?"
test('a question for Bart has to stand on its own', () => {
  const { questionProblem } = require('../ao/team/questionForBart.js');
  expect(questionProblem('The saved A to D caption set still won\'t open. Should Jot rewrite those 16?')).toMatch(/card letters/);
  expect(questionProblem('Should rebuilt-quote-cards-fundamentals-unaccountable wait?')).toMatch(/slug/);
  expect(questionProblem('The quote card "People don\'t give their best to authority; they give it to trust." is ready. Should it go out Monday at 10:30, or wait for next week?')).toBeNull();
});
