/**
 * @jest-environment node
 *
 * Auto > Clients CRM (Bart, 2026-10-23): the Before we talk form, consent kept
 * word for word, transcripts to a thank-you and check-in plan, and check-ins
 * that only ever send after Bart approves them.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
jest.mock('../ao/textModel.js', () => ({ completeText: jest.fn(async () => ''), completeJson: jest.fn(async () => null) }));

import { signPrep, verifyPrep, prepUrl, CONSENT_TEXT, consentOf } from '../calendly/clientRecords.js';
import { prepEmail, dueCheckins } from '../calendly/followups.js';
import { cleanTranscript, normalizeAnalysis, planFrom, analysisPrompt } from '../calendly/transcripts.js';
import { readFileSync } from 'node:fs';

const row = (answers = {}) => ({ id: 'abc-123', name: 'Pat Doe', email: 'pat@example.com', answers: { source: 'calendly', scheduled_for: '2026-10-29T19:00:00Z', ...answers } });

describe('Before we talk', () => {
  test('the link is signed per booking', () => {
    const sig = signPrep('abc-123', 'k');
    expect(verifyPrep('abc-123', sig, 'k')).toBe(true);
    expect(verifyPrep('other', sig, 'k')).toBe(false);
    expect(verifyPrep('abc-123', sig, '')).toBe(false);
  });
  test('the email is the approved wording, with the link and the time', () => {
    process.env.CALENDLY_WEBHOOK_SIGNING_KEY = 'k';
    const e = prepEmail(row());
    expect(e.subject).toBe('Before we talk');
    expect(e.text.startsWith('Hi Pat,')).toBe(true);
    expect(e.text).toContain(prepUrl('abc-123'));
    expect(e.text).toContain("including whether it's OK to record");
    expect(e.text.trim().endsWith('Bart')).toBe(true);
    expect(e.text).not.toMatch(/—/);
  });
  test('the permission wording is the approved text', () => {
    expect(CONSENT_TEXT.record).toMatch(/^Recording our conversations\. I record so I can listen to you instead of taking notes\./);
    expect(CONSENT_TEXT.archy).toMatch(/Only you can see it, and I can review what it tells you\.$/);
    expect(CONSENT_TEXT.checkins).toBe('Check-ins by email after we talk, based on what we discussed.');
  });
  test('the page carries the approved podcast line', () => {
    const page = readFileSync('src/pages/BeforeWeTalk.jsx', 'utf8');
    expect(page).toMatch(/I also host The Archetype Original Podcast, conversations with people who have carried real weight and have\s+something true to say about it\. Would you be open to being a guest\?/);
    expect(page).toContain('noindex');
  });
  test('consent reads as yes, no, or not said', () => {
    expect(consentOf({ consent: { record: { answer: 'yes' } } }, 'record')).toBe('yes');
    expect(consentOf({ consent: { record: { answer: 'no' } } }, 'record')).toBe('no');
    expect(consentOf(null, 'record')).toBe(null);
  });
});

describe('transcripts', () => {
  test('timestamps and cue numbers are removed from WebVTT and SRT', () => {
    const vtt = 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nBart: Hello there.\n\n2\n00:00:04,500 --> 00:00:06,000\nPat: Hi.';
    expect(cleanTranscript(vtt)).toBe('Bart: Hello there.\n\nPat: Hi.');
  });
  test('the prompt forbids invention, selling and em dashes', () => {
    const p = analysisPrompt(row(), 'TEXT');
    expect(p).toMatch(/Do not invent anything that was not said/);
    expect(p).toMatch(/No selling, no prices, no offers/);
    expect(p).toMatch(/No em dashes/);
  });
  test('check-ins are kept tidy: dated, at most four, no em dashes', () => {
    const a = normalizeAnalysis({
      summary: 'S',
      thank_you: 'Hi Pat,\n\nThanks — truly.\n\nBart',
      checkins: [
        { days_after: 14, reason: 'r2', text: 'Hi Pat,\n\nTwo.\n\nBart' },
        { days_after: 3, reason: 'r1', text: 'Hi Pat,\n\nOne.\n\nBart' },
        { days_after: 20, reason: 'r3', text: '' },
        { days_after: 30, reason: 'r4', text: 'Hi Pat,\n\nFour.\n\nBart' },
        { days_after: 40, reason: 'r5', text: 'Hi Pat,\n\nFive.\n\nBart' },
        { days_after: 50, reason: 'r6', text: 'Hi Pat,\n\nSix.\n\nBart' },
      ],
    });
    expect(a.thank_you).not.toMatch(/—/);
    expect(a.checkins.map((c) => c.days_after)).toEqual([3, 14, 30, 40]);
    const plan = planFrom(a, '2026-10-29T19:00:00Z');
    expect(plan[0]).toMatchObject({ id: 'c1', status: 'draft', send_at: '2026-11-01T19:00:00.000Z' });
  });
});

describe('check-ins only send after Bart approves them', () => {
  const now = Date.parse('2026-11-10T00:00:00Z');
  const plan = [
    { id: 'c1', status: 'approved', send_at: '2026-11-01T19:00:00Z', text: 'Hi' },
    { id: 'c2', status: 'draft', send_at: '2026-11-01T19:00:00Z', text: 'Hi' },
    { id: 'c3', status: 'approved', send_at: '2026-12-01T19:00:00Z', text: 'Hi' },
    { id: 'c4', status: 'sent', send_at: '2026-11-01T19:00:00Z', text: 'Hi' },
  ];
  test('approved and due only', () => {
    expect(dueCheckins(row({ checkin_plan: plan }), now).map((x) => x.id)).toEqual(['c1']);
  });
  test('nothing once stopped or cancelled', () => {
    expect(dueCheckins(row({ checkin_plan: plan, checkins_stopped_at: 'x' }), now)).toEqual([]);
    expect(dueCheckins(row({ checkin_plan: plan, cancelled_at: 'x' }), now)).toEqual([]);
  });
});

describe('every email is formatted (Bart, 2026-10-24)', () => {
  test('a letter turns the link into a button and keeps the sentence whole', async () => {
    const { letterHtml } = await import('../calendly/emailLayout.js');
    const e = prepEmail(row());
    const html = letterHtml(e.text, { cta: e.cta });
    expect(html).toContain('Fill out Before we talk');
    expect(html).toContain("there's a short form below.");
    expect(html).not.toContain('here: https');
    expect(html).toContain('name="viewport"');
  });
  test('the permissions link sits in the footer', async () => {
    const { letterHtml } = await import('../calendly/emailLayout.js');
    expect(letterHtml('Hi Pat,\n\nHello.\n\nBart', { permissionsUrl: 'https://x/p' })).toContain('Change what you are comfortable with');
  });
  test('notices to Bart have a title, facts and one button', async () => {
    const { noticeHtml } = await import('../calendly/emailLayout.js');
    const html = noticeHtml({ title: 'Brief ready for Pat', lines: ['Thursday'], cta: { label: 'Open', url: 'https://x' } });
    expect(html).toContain('Brief ready for Pat');
    expect(html).toContain('href="https://x"');
  });
});

test('no thank-you is drafted without a transcript, and the transcript one asks for depth', () => {
  const src = readFileSync('lib/calendly/followups.js', 'utf8');
  expect(src).toMatch(/awaiting_transcript: true/);
  const p = analysisPrompt(row(), 'TEXT');
  expect(p).toMatch(/As long as it needs to be to carry the substance/);
  expect(p).not.toMatch(/\d+ to \d+ words/);
  expect(p).toMatch(/No praise for being honest/);
});
