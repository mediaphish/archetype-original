/**
 * @jest-environment node
 *
 * A private Archy per client (2026-10-24). It may use their conversations
 * with Bart, never his private notes, and it hands questions to Bart with his
 * answer windows: ongoing a day, a season two days, rising leaders five.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
jest.mock('../ao/corpusChunks.js', () => ({ searchCorpusChunks: jest.fn(async () => []) }));
jest.mock('../ao/archyModel.js', () => ({ archyComplete: jest.fn() }));

import { sharedContext, splitHandoff, signArchy, verifyArchy, answerWindowLabel, privateSystemPrompt } from '../calendly/privateArchy.js';

const rows = [
  {
    answers: {
      scheduled_for: '2026-10-20T15:00:00Z',
      thank_you_text: 'Hi Jordan,\n\nThanks for the time.\n\nBart',
      transcript_analysis: {
        summary: 'PRIVATE: he agrees too fast and does not follow through.',
        key_points: ['Hiring a second manager'],
        action_items: { theirs: ['Talk to Megan by Friday'], bart: ['Send the piece about the room'] },
        next_time: ['PRIVATE: push on the board'],
      },
    },
  },
];
const record = { prep: { worth_it: 'Knowing whether to sell' }, thread: { how_they_take_advice: 'PRIVATE: agrees too fast' } };

test('Archy gets what was shared, never the private summary, notes or thread', () => {
  const { conversations, own } = sharedContext(rows, record);
  const all = conversations + own;
  expect(all).toContain('Hiring a second manager');
  expect(all).toContain('Talk to Megan by Friday');
  expect(all).toContain('Send the piece about the room');
  expect(all).toContain('Thanks for the time.');
  expect(all).toContain('Knowing whether to sell');
  expect(all).not.toContain('PRIVATE');
});

test('the hand-off line comes off the reply and becomes the reason', () => {
  expect(splitHandoff('That is a call for Bart.\n[[HANDOFF: Wants Bart on whether to sell this year]]')).toEqual({
    reply: 'That is a call for Bart.',
    handoff: 'Wants Bart on whether to sell this year',
  });
  expect(splitHandoff('Plain answer.')).toEqual({ reply: 'Plain answer.', handoff: null });
});

test('the link only works for its person and its current version', () => {
  const sig = signArchy('Jordan@Acme.com', 1, 'k');
  expect(verifyArchy('jordan@acme.com', sig, 1, 'k')).toBe(true);
  expect(verifyArchy('riley@acme.com', sig, 1, 'k')).toBe(false);
  expect(verifyArchy('jordan@acme.com', sig, 2, 'k')).toBe(false);
});

test("Bart's answer windows by tier", () => {
  expect(answerWindowLabel('ongoing')).toBe('within a day');
  expect(answerWindowLabel('season')).toBe('within two days');
  expect(answerWindowLabel('rising')).toBe('within five days');
  expect(answerWindowLabel(null)).toBe('within two days');
  expect(privateSystemPrompt({ name: 'Jordan Lee', tier: 'rising', conversations: '', own: '', passages: '' })).toContain('Bart answers within five days');
});
