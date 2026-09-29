/**
 * @jest-environment node
 *
 * Free recorded mentor sessions, offered 2026-09-28, 8 to 10 interested the
 * same day. The intake form had to carry two kinds of conversation.
 */
import {
  normalizeSessionType,
  isMentorSession,
  missingRequiredFor,
  missingRequiredFor as required,
  SESSION_TYPES,
  DEFAULT_SESSION_TYPE,
  TRACK_CHOICES,
  MENTOR_QUESTIONS,
  MENTOR_CONTEXT_FIELDS,
  MENTOR_EMAIL_LABELS,
} from '../ao/podcastSessionTracks.js';

describe('normalizeSessionType', () => {
  it('accepts the two real tracks', () => {
    expect(normalizeSessionType('guest')).toBe('guest');
    expect(normalizeSessionType('mentor')).toBe('mentor');
    expect(normalizeSessionType('  MENTOR ')).toBe('mentor');
  });

  it('falls back to guest for anything else, rather than trusting the request', () => {
    expect(normalizeSessionType('admin')).toBe(DEFAULT_SESSION_TYPE);
    expect(normalizeSessionType('')).toBe('guest');
    expect(normalizeSessionType(null)).toBe('guest');
    expect(normalizeSessionType({ toString: () => 'mentor' })).toBe('guest');
  });

  it('keeps the default inside the allowed set, which the check constraint enforces too', () => {
    expect(SESSION_TYPES).toContain(DEFAULT_SESSION_TYPE);
    expect(SESSION_TYPES).toHaveLength(2);
  });
});

describe('isMentorSession', () => {
  it('is true only for the mentor track', () => {
    expect(isMentorSession('mentor')).toBe(true);
    expect(isMentorSession('guest')).toBe(false);
    expect(isMentorSession(undefined)).toBe(false);
  });
});

describe('missingRequiredFor', () => {
  it('asks a mentor for the one thing the session cannot start without', () => {
    expect(required('mentor', {})).toBe('mentor_situation');
    expect(required('mentor', { mentor_situation: '   ' })).toBe('mentor_situation');
    expect(required('mentor', { mentor_situation: 'My two partners disagree on the exit.' })).toBeNull();
  });

  it('asks a guest for nothing extra', () => {
    expect(missingRequiredFor('guest', {})).toBeNull();
  });
});

describe('the two tracks as presented', () => {
  it('offers exactly the two choices, matching the stored values', () => {
    expect(TRACK_CHOICES.map((c) => c.value)).toEqual(SESSION_TYPES);
  });

  it('tells someone it is free and recorded before asking anything', () => {
    const mentor = TRACK_CHOICES.find((c) => c.value === 'mentor');
    expect(mentor.description).toMatch(/free/i);
    expect(mentor.description).toMatch(/recorded/i);
  });

  it('asks four mentor questions, with only the situation required', () => {
    expect(MENTOR_QUESTIONS).toHaveLength(4);
    expect(MENTOR_QUESTIONS.filter((q) => q.required).map((q) => q.key)).toEqual(['mentor_situation']);
  });

  it('asks the question Bart actually built his work around', () => {
    const honest = MENTOR_QUESTIONS.find((q) => q.key === 'mentor_honest_answer');
    expect(honest.text).toBe('What do you think the honest answer probably is?');
    expect(honest.hint).toMatch(/not ready to say it out loud/);
  });

  it('asks the stakes, which separates the presented problem from the real one', () => {
    expect(MENTOR_QUESTIONS.map((q) => q.key)).toContain('mentor_stakes');
  });

  it('promises no confidentiality the release does not give', () => {
    for (const q of MENTOR_QUESTIONS) {
      const copy = `${q.placeholder || ''} ${q.hint || ''}`.toLowerCase();
      expect(copy).not.toMatch(/nobody sees|stays between|confidential|off the record|private/);
    }
  });

  it('numbers the questions in order, so the form reads 01 through 04', () => {
    expect(MENTOR_QUESTIONS.map((q) => q.number)).toEqual(['01', '02', '03', '04']);
  });

  it('labels every stored mentor column for the notification email', () => {
    const columns = [...MENTOR_QUESTIONS, ...MENTOR_CONTEXT_FIELDS].map((f) => f.column);
    expect(MENTOR_EMAIL_LABELS.map(([column]) => column)).toEqual(columns);
    for (const [, label] of MENTOR_EMAIL_LABELS) expect(label.length).toBeGreaterThan(0);
  });

  it('never uses a dash, in anything a person reads', () => {
    const copy = [
      ...TRACK_CHOICES.flatMap((c) => [c.title, c.description]),
      ...MENTOR_QUESTIONS.flatMap((q) => [q.text, q.placeholder, q.hint].filter(Boolean)),
      ...MENTOR_CONTEXT_FIELDS.flatMap((f) => [f.label, f.placeholder]),
    ];
    for (const line of copy) expect(line).not.toMatch(/[—–]/);
  });
});
