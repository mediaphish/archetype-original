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
 * Four, not five, and stopping there is deliberate. A long form in front of
 * someone about to admit they are stuck is its own kind of discouragement, and
 * the whole point of this offer is that it is the easy way to ask for help.
 *
 * Questions three and four are the ones that matter, and they are not generic
 * intake questions.
 *
 * Three is Bart's own thesis turned on the person filling out the form. He
 * argues that nobody inside a leader's system can tell them the truth, because
 * everyone in that room lives inside the consequences of their decisions.
 * Someone filling this out is outside their own room, writing to the one person
 * with no stake in the answer. That is the moment they can say the quiet thing,
 * and the answer is usually the episode. It replaced "what would make this hour
 * worth it to you", which asked people to define success before they had
 * defined the problem and got a tidy sentence back.
 *
 * Four is the stakes question, and it is the most reliable way to find out
 * whether the presented problem is the real problem. People describe a process
 * issue and then mention that someone is about to quit.
 *
 * Two earns its place by keeping the session off ground they have already
 * covered, which is the most common way an hour like this gets wasted.
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
    key: 'mentor_honest_answer',
    column: 'mentor_honest_answer',
    number: '03',
    text: 'What do you think the honest answer probably is?',
    hint: 'Most people already know. Say it here even if you are not ready to say it out loud.',
    // Not "nobody sees this", which would read as a confidentiality promise the
    // release does not make. It invites the guess without implying privacy.
    placeholder: 'A guess is fine. A guess is usually right.',
    required: false,
  },
  {
    key: 'mentor_stakes',
    column: 'mentor_stakes',
    number: '04',
    text: 'What happens if nothing changes?',
    placeholder: 'In six months, in a year, to you and to the people around you.',
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
