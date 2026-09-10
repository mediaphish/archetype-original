/**
 * Decide whether Archy actually failed to answer.
 *
 * THE BUG THIS REPLACES, found 2026-09-10.
 *
 * The old rule scanned Archy's finished answer for six refusal patterns and,
 * on any match anywhere in the text, discarded the whole answer and replaced it
 * with "I'm having trouble answering it. Can I get your contact information".
 *
 * Observed directly. The same question asked twice, thirty seconds apart:
 *
 *   run 1  ->  discarded, visitor got the canned handoff
 *   run 2  ->  "I can answer the second part fully, but I need to be upfront
 *              about the first." followed by a real answer
 *
 * Nothing was wrong with run 1's answer either. It hedged using different
 * words, and the words tripped a regex. So the failure was not random, it was
 * a coin flip on phrasing, and it was biased in the worst possible direction:
 * the more carefully Archy qualified a partial answer, the likelier his answer
 * was to be thrown away. It punished exactly the behaviour worth having.
 *
 * THE RULE NOW.
 *
 * A genuine refusal looks different from a good answer containing a caveat. It
 * is short, and it leads with the refusal. A useful answer is long and hedges
 * somewhere in the middle, after it has already said something worth reading.
 * Length and position separate them without another model call.
 *
 * The asymmetry matters when choosing where to be strict. A false positive
 * destroys a good answer, shows a visitor a canned message, and files their
 * question as unanswered. A false negative just means a genuine gap is not
 * captured for the corpus. The first is far worse, so this leans toward
 * keeping the answer.
 */

/**
 * Phrases that can indicate a refusal. Necessary, never sufficient.
 *
 * Every "I'm" here also accepts "I am". The inherited list matched only
 * contractions, so "I am uncertain" and "I am not able to" slipped through
 * entirely and never escalated. Archy writes both ways, because the house
 * voice avoids contractions in places.
 */
const I_AM = "(?:i'm|i am)";

export const REFUSAL_PATTERNS = [
  /i (don't|do not) (know|have|understand)/i,
  new RegExp(`${I_AM} (not sure|uncertain|unable)`, 'i'),
  /i (can't|cannot) (answer|help|provide)/i,
  /(don't|do not) have (that|this) (information|answer|knowledge)/i,
  /(not|outside) (in|of) (my|the) (knowledge|corpus|experience)/i,
  /i (don't|do not) have (access|information) (to|about)/i,
  new RegExp(`${I_AM} having trouble`, 'i'),
  new RegExp(`${I_AM} not able to`, 'i'),
];

/**
 * How much of the opening counts as "leading with it".
 *
 * Roughly the first sentence or two. A real refusal gets to the point; it does
 * not bury the refusal after a paragraph of substance.
 */
const OPENING_CHARS = 240;

/**
 * Above this length, a response has said something, whatever else it also says.
 *
 * Archy's real answers on this corpus run about 1,200 to 2,100 characters. The
 * canned handoff is 155. Four hundred is comfortably clear of both.
 */
const SUBSTANTIVE_CHARS = 400;

/**
 * @param {object} args
 * @param {string} args.response       Archy's finished answer.
 * @param {boolean} args.hasLowKnowledge  True when retrieval found nothing useful.
 * @returns {{cannotAnswer: boolean, reason: string}}
 */
export function detectCannotAnswer({ response, hasLowKnowledge = false } = {}) {
  const text = String(response ?? '').trim();
  if (!text) return { cannotAnswer: true, reason: 'empty response' };

  const opening = text.slice(0, OPENING_CHARS);
  const refusesUpFront = REFUSAL_PATTERNS.some((p) => p.test(opening));
  const refusesAnywhere = REFUSAL_PATTERNS.some((p) => p.test(text));
  const isSubstantive = text.length >= SUBSTANTIVE_CHARS;

  // The case the old rule got wrong, stated first because it is the common one.
  if (isSubstantive) {
    return { cannotAnswer: false, reason: 'substantive answer, caveats allowed' };
  }

  if (refusesUpFront) {
    return { cannotAnswer: true, reason: 'short response leading with a refusal' };
  }

  // Retrieval found nothing AND the reply is short and hedges. Both signals
  // agreeing on a short reply is a real gap worth capturing for the corpus.
  if (hasLowKnowledge && refusesAnywhere) {
    return { cannotAnswer: true, reason: 'no supporting passages and a short hedged reply' };
  }

  return { cannotAnswer: false, reason: 'short but not a refusal' };
}
