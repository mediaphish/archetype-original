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
  AFTER_CALL_MS,
  headsUpEmail,
} from '../calendly/followups.js';
import { stageOf, needsFollowUp, toClient } from '../calendly/clients.js';
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
  test('research: as soon as it is booked, once, never after the call starts', () => {
    expect(dueFor(row(), start - 10 * 24 * H)).toBe('research');
    expect(dueFor(row({ research_at: 'x' }), start - H)).toBe(null);
    expect(dueFor(row(), start + 10 * 60 * 1000)).toBe(null);
  });
  test('after-call note: two hours after the start, once, and not days later', () => {
    expect(dueFor(row({ research_at: 'x' }), start + AFTER_CALL_MS - 60000)).toBe(null);
    expect(dueFor(row({ research_at: 'x' }), start + AFTER_CALL_MS + 60000)).toBe('after_call');
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

describe('the researched brief', () => {
  test('uses the company email domain, never a personal one', async () => {
    const { emailDomain } = await import('../calendly/researchBrief.js');
    expect(emailDomain('pat@acme-builders.com')).toBe('acme-builders.com');
    expect(emailDomain('pat@gmail.com')).toBe(null);
    expect(emailDomain('pat@icloud.com')).toBe(null);
  });
  test('the research stays professional and public, and admits uncertainty', async () => {
    const { researchPrompt } = await import('../calendly/researchBrief.js');
    const p = researchPrompt(row({ questions_and_answers: [{ question: 'What led you to reach out now?', answer: 'A hard hire.' }] }));
    expect(p).toContain('A hard hire.');
    expect(p).toMatch(/Nothing about family, health, politics, religion, home address/);
    expect(p).toMatch(/how confident you are this is the right person/);
    expect(p).toMatch(/SOURCES/);
  });
  test('the brief shows the research, or says plainly it did not come through', () => {
    const withIt = briefEmail(row(), { ok: true, brief: 'WHO THEY ARE\nOwner of Acme.\n\nSOURCES\nAcme https://acme.example' });
    expect(withIt.html).toContain('Owner of Acme.');
    expect(withIt.html).toContain('<a href="https://acme.example">');
    const without = briefEmail(row(), { ok: false, error: 'timeout' });
    expect(without.html).toContain('The research did not come through this time');
  });
});

describe('research formatting', () => {
  test('markdown marks and em dashes do not reach the email', async () => {
    const { plainBrief } = await import('../calendly/researchBrief.js');
    expect(plainBrief('# BRIEF\n---\n### WHO THEY ARE\n**high** confidence — founder')).toBe('BRIEF\n\nWHO THEY ARE\nhigh confidence , founder');
  });
});

describe('Auto > Clients', () => {
  test('email is only a one-line heads-up pointing into Auto', () => {
    const e = headsUpEmail('research', row());
    expect(e.subject).toMatch(/^Brief ready for Pat Doe, /);
    expect(e.html).toContain('/ao/clients');
    expect(headsUpEmail('after_call', row()).subject).toBe('Thank-you ready to review for Pat Doe.');
  });
  test('stage follows the booking until Bart sets it', () => {
    expect(stageOf(row(), start - H)).toBe('booked');
    expect(stageOf(row(), start + H)).toBe('met');
    expect(stageOf(row({ cancelled_at: 'x' }), start - H)).toBe('not_now');
    expect(stageOf(row({ stage: 'season' }), start - H)).toBe('season');
  });
  test('waiting on Bart once the call starts, until something is sent or set aside', () => {
    expect(needsFollowUp(row(), start - H)).toBe(false);
    expect(needsFollowUp(row(), start + H)).toBe(true);
    expect(needsFollowUp(row({ thank_you_sent_at: 'x' }), start + H)).toBe(false);
    expect(needsFollowUp(row({ reinvite_sent_at: 'x' }), start + H)).toBe(false);
    expect(needsFollowUp(row({ followup_dismissed_at: 'x' }), start + H)).toBe(false);
  });
  test('the screen gets the brief and what they wrote, not internal fields', () => {
    const c = toClient(row({ research_brief: 'WHO THEY ARE', questions_and_answers: [{ question: 'Q', answer: 'A' }], calendly_invitee_uri: 'secret' }), start - H);
    expect(c.research_brief).toBe('WHO THEY ARE');
    expect(c.what_they_wrote).toEqual([{ question: 'Q', answer: 'A' }]);
    expect(JSON.stringify(c)).not.toContain('secret');
  });
});

test('the brief starts at its first section, without the search narration', async () => {
  const { plainBrief } = await import('../calendly/researchBrief.js');
  expect(plainBrief("I'll start by searching.Here is the brief.\n\nWHO THEY ARE\nOwner.")).toBe('WHO THEY ARE\nOwner.');
});
