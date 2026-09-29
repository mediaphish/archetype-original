/**
 * The two kinds of conversation the intake form collects.
 *
 * 2026-09-28. Bart offered free mentor sessions, recorded and published as
 * podcast episodes, and had 8 to 10 people interested inside a day. The intake
 * form was built for a guest: bio, headshot, social links, and five questions
 * about who they are. That is the right form for someone with a book to promote
 * and the wrong one for someone bringing a problem they have not solved.
 *
 * So the form asks which conversation this is and shows the questions that fit.
 * Everything else, the release, the scheduling, the confirmation email and the
 * magic link, is identical for both.
 *
 * Defined here rather than in the page because the notification email has to
 * label the answers with the same questions the person was asked. The guest
 * questions were already duplicated between the two; the mentor ones are not.
 */

export const SESSION_TYPES = ['guest', 'mentor'];
export const DEFAULT_SESSION_TYPE = 'guest';

/**
 * Reject anything that is not one of the two tracks, rather than trusting input.
 *
 * Only a real string counts. This reads a request body, and coercing whatever
 * arrives through String() would let an object decide its own track through
 * toString. The database has the same check constraint behind this.
 */
export function normalizeSessionType(value) {
  if (typeof value !== 'string') return DEFAULT_SESSION_TYPE;
  const type = value.trim().toLowerCase();
  return SESSION_TYPES.includes(type) ? type : DEFAULT_SESSION_TYPE;
}

export const isMentorSession = (value) => normalizeSessionType(value) === 'mentor';

/**
 * What the person picks at the top of the form.
 *
 * The mentor description says "free" and says it is published, because those
 * are the two facts someone needs before they answer anything else.
 */
export const TRACK_CHOICES = [
  {
    value: 'guest',
    title: 'A guest episode',
    description:
      'A conversation about your work, your story, and what you have learned. You bring the experience and we talk.',
  },
  {
    value: 'mentor',
    title: 'A mentor session',
    description:
      'Free, 30 to 60 minutes, and recorded for the show. You bring something you are actually working through and we work on it together, out loud.',
  },
];

/**
 * The mentor track questions.
 *
 * Three, not five. A mentor session runs on one real problem, and a long form
 * in front of someone about to admit they are stuck is its own kind of
 * discouragement. "What have you already tried" earns its place by keeping the
 * session off ground they have covered, which is the most common way an hour
 * like this gets wasted.
 */
export const MENTOR_QUESTIONS = [
  {
    key: 'mentor_situation',
    column: 'mentor_situation',
    number: '01',
    text: 'What are you working through right now?',
    placeholder:
      'The real one, not the tidy version. A few sentences is plenty.',
    required: true,
  },
  {
    key: 'mentor_tried',
    column: 'mentor_tried',
    number: '02',
    text: 'What have you already tried?',
    placeholder: 'So we do not spend the hour on ground you have already covered.',
    required: false,
  },
  {
    key: 'mentor_outcome',
    column: 'mentor_outcome',
    number: '03',
    text: 'What would make this hour worth it to you?',
    placeholder: 'Even if the answer is that you just need to think out loud with someone.',
    required: false,
  },
];

/** Short context fields on the mentor track, so Bart knows the shape of the room. */
export const MENTOR_CONTEXT_FIELDS = [
  {
    key: 'mentor_role',
    column: 'mentor_role',
    label: 'Your role',
    placeholder: 'Owner, CEO, VP of Operations, first-time manager',
  },
  {
    key: 'mentor_org_size',
    column: 'mentor_org_size',
    label: 'How many people in the organization',
    placeholder: 'Just me, 12, about 200',
  },
];

/** Every mentor column, for the store and the notification email. */
export const MENTOR_FIELDS = [...MENTOR_QUESTIONS, ...MENTOR_CONTEXT_FIELDS];

/** Labels for the notification email, so answers are shown under what was asked. */
export const MENTOR_EMAIL_LABELS = [
  ...MENTOR_QUESTIONS.map((q) => [q.column, q.text]),
  ...MENTOR_CONTEXT_FIELDS.map((f) => [f.column, f.label]),
];

/**
 * Is this submission complete enough to accept?
 *
 * A guest needs nothing beyond name, email and the release, which is what the
 * form already enforced. A mentor session with no situation is an empty hour,
 * so that one field is required.
 */
export function missingRequiredFor(sessionType, values = {}) {
  if (!isMentorSession(sessionType)) return null;
  const situation = String(values.mentor_situation || '').trim();
  return situation ? null : 'mentor_situation';
}
