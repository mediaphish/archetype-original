/**
 * Long messages are shortened only in the copy the team reads, never on
 * Bart's screen, and the shortened copy says so.
 *
 * 2026-10-27. Bart: "Why cut off? I didn't ask for this." Nothing on his
 * screen cuts a message off. What happened: the huddle read only the first
 * 1,500 characters of each message, so Ada saw the caption set end mid-sentence
 * and started a huddle to fix a "cut off" caption that was whole. Earlier the
 * same night Jot's 20,385 character reply was clipped at 20,000 in the history
 * the team reads, and the team told Bart "the chat cuts it off." It does not.
 */

export const SHORTENED_MARK =
  '[Shortened only in your copy, to save room. Bart sees the whole message, and the full text is saved. ' +
  'This is not a cut-off: never tell Bart or the team that it was cut off. Read the saved record if you need the rest.]';

/** Pure: the text as the team reads it, at most `max` characters, marked when shortened. */
export function shortenedCopy(text, max) {
  const s = String(text || '');
  if (!Number.isFinite(max) || s.length <= max) return s;
  return `${s.slice(0, max)}\n\n${SHORTENED_MARK}`;
}
