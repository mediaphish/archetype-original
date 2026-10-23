/**
 * @jest-environment node
 *
 * Follow-ups around a booked conversation (Bart, 2026-10-22: "Make sure you
 * are building all the automations for follow up as well"). Nothing reaches a
 * client without Bart pressing send.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
jest.mock('../ao/textModel.js', () => ({ completeText: jest.fn(async () => '') }));

import {
  dueFor,
  signAction,
  verifyAction,
  reinviteEmail,
  fallbackThankYou,
  briefEmail,
  afterCallEmail,
  draftThankYou,
  BRIEF_LEAD_MS,
  AFTER_CALL_MS,
} from '../calendly/followups.js';
import { completeText } from '../ao/textModel.js';

const H = 60 * 60 * 1000;
const start = Date.parse('2026-10-29T19:00:00Z');
const row = (answers = {}) => ({
  id: 'abc',
  name: 'Pat Doe',
  email: 'pat@example.com',
  role: 'Owner',
  answers: { source: 'calendly', scheduled_for: '2026-10-29T19:00:00Z', ...answers },
});

describe('when each follow-up is due', () => {
  test('brief: within 18 hours of the call, once, never after it starts', () => {
    expect(dueFor(row(), start - BRIEF_LEAD_MS - H)).toBe(null);
    expect(dueFor(row(), start - BRIEF_LEAD_MS + H)).toBe('brief');
    expect(dueFor(row({ brief_sent_at: 'x' }), start - H)).toBe(null);
    expect(dueFor(row(), start + 10 * 60 * 1000)).toBe(null);
  });
  test('after-call note: two hours after the start, once, and not days later', () => {
    expect(dueFor(row({ brief_sent_at: 'x' }), start + AFTER_CALL_MS - 60000)).toBe(null);
    expect(dueFor(row({ brief_sent_at: 'x' }), start + AFTER_CALL_MS + 60000)).toBe('after_call');
    expect(dueFor(row({ followup_drafted_at: 'x' }), start + 3 * H)).toBe(null);
    expect(dueFor(row(), start + 5 * 24 * H)).toBe(null);
  });
  test('cancelled bookings and form inquiries get nothing', () => {
    expect(dueFor(row({ cancelled_at: 'x' }), start - H)).toBe(null);
    expect(dueFor({ answers: { q1: 'form' } }, start - H)).toBe(null);
  });
});

describe('the buttons in Bart’s email', () => {
  test('are signed per booking and per action', () => {
    const sig = signAction('abc', 'thank_you', 'k');
    expect(verifyAction('abc', 'thank_you', sig, 'k')).toBe(true);
    expect(verifyAction('abc', 'reinvite', sig, 'k')).toBe(false);
    expect(verifyAction('other', 'thank_you', sig, 'k')).toBe(false);
    expect(verifyAction('abc', 'thank_you', sig, '')).toBe(false);
  });
  test('the after-call email offers both, and the brief carries their answers', () => {
    process.env.CALENDLY_WEBHOOK_SIGNING_KEY = 'k';
    const html = afterCallEmail(row(), 'Hi Pat,\n\nThanks.\n\nBart').html;
    expect(html).toContain('action=thank_you');
    expect(html).toContain('action=reinvite');
    const brief = briefEmail(row({ questions_and_answers: [{ question: 'What led you to reach out now?', answer: 'A hard hire.' }] }));
    expect(brief.html).toContain('A hard hire.');
    expect(brief.subject).toMatch(/^Brief: Pat Doe, /);
  });
});

describe('wording', () => {
  test('re-invite and fallback thank-you: first name, signed Bart, no em dashes, no prices', () => {
    for (const text of [reinviteEmail(row()).text, fallbackThankYou(row())]) {
      expect(text.startsWith('Hi Pat,')).toBe(true);
      expect(text.trim().endsWith('Bart')).toBe(true);
      expect(text).not.toMatch(/—|\$\d/);
    }
    expect(reinviteEmail(row()).text).toContain('calendly.com/bartpaden/a-conversation-with-bart');
  });
  test('a draft with an em dash is replaced by the fallback', async () => {
    completeText.mockResolvedValueOnce('Hi Pat,\n\nThanks — truly.\n\nBart');
    expect(await draftThankYou(row())).toBe(fallbackThankYou(row()));
    completeText.mockResolvedValueOnce('Hi Pat,\n\nThank you for the time today.\n\nBart');
    expect(await draftThankYou(row())).toBe('Hi Pat,\n\nThank you for the time today.\n\nBart');
  });
});
