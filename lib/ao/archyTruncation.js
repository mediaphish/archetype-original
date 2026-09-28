/**
 * Archy never hands a visitor half a sentence.
 *
 * 2026-09-28. archyModel.js handled one stop reason, 'refusal', and nothing
 * else. When an answer filled the output ceiling it was returned exactly as it
 * arrived, cut wherever the model happened to stop, and the visitor saw a
 * fragment with no sign anything had gone wrong. This is the same gap that made
 * Auto return nothing on 2026-09-24, except it faces strangers and Bart would
 * never see it happen.
 *
 * A stranger's first impression is worth more than the last half sentence, so a
 * truncated answer is trimmed back to where it last made sense and offered a
 * continuation. Shorter and whole beats longer and broken.
 */

/** Did this answer stop because it ran out of room? */
export function ranOutOfRoom(stopReason) {
  return String(stopReason || '') === 'max_tokens';
}

/** Sentence ends, including ones closed by a quote or bracket. */
const SENTENCE_END = /[.!?]["')\]]?(?=\s|$)/g;

/**
 * The answer up to the last point it finished a thought.
 *
 * Returns the original text when there is no sentence end to fall back to,
 * because a fragment is still better than nothing at all.
 */
export function trimToLastCompleteSentence(text) {
  const source = String(text || '');
  if (!source.trim()) return '';

  let lastEnd = -1;
  for (const match of source.matchAll(SENTENCE_END)) {
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd <= 0) return source.trim();

  const trimmed = source.slice(0, lastEnd).trim();

  // A markdown heading or a bold lead-in left dangling at the end introduces
  // something that is no longer there, so it goes too.
  return trimmed
    .replace(/\n\s*#{1,6}[^\n]*$/, '')
    .replace(/\n\s*\*\*[^*\n]+\*\*:?\s*$/, '')
    .trim();
}

/** The line that tells the visitor there is more, in Archy's register. */
export const CONTINUE_NOTICE = 'There is more to this one. Ask me to keep going and I will pick up where I left off.';

/**
 * Clean up an answer that hit the ceiling.
 *
 * @param {string} text
 * @returns {{ text: string, truncated: boolean }}
 */
export function repairTruncatedAnswer(text) {
  const trimmed = trimToLastCompleteSentence(text);
  if (!trimmed) return { text: '', truncated: true };
  return { text: `${trimmed}\n\n${CONTINUE_NOTICE}`, truncated: true };
}
