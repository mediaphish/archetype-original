/**
 * Is this turn about the header image?
 *
 * Decides whether to load the real prior header images of a series as vision
 * input before Auto writes an image prompt.
 *
 * THE BUG THIS FIXES, 2026-09-11 (Cain thread).
 *
 * The old check was named messageOrHistorySignalsImageDiscussion and read only
 * the current user message. The conversation went:
 *
 *   Auto  "Next step is the header image... let me check the series' visual
 *          style so this stays consistent with the other Archetype Series
 *          entries."
 *   Bart  "Approve"
 *
 * Nothing in "Approve" mentions an image or a series, so no references loaded,
 * and Auto told Bart it had no visual series context and could not pull a
 * reference image. Bart had to go and find the prior images himself, which is
 * exactly the work this system exists to remove.
 *
 * The fix is deliberately one message wide: this turn's message, plus the reply
 * Auto just gave. Auto announces the image step before Bart answers, and that
 * announcement is the clearest signal there is.
 *
 * It does not look further back, and that is not an oversight. An earlier
 * version checked the last five messages, and a single mention of a later step
 * ("...then the header image prompt gets proposed...") kept re-triggering image
 * loading for turn after turn, including turns where Bart had said to drop it.
 * That failure was confirmed live. One turn of lookback answers "Approve" and
 * cannot run away.
 *
 * The deferral check still reads the CURRENT message only. "We are not
 * touching images yet" must win on the turn Bart says it, even though the
 * message right before it was all about images.
 */

/** Bart saying not yet. Current message only, and it overrides everything. */
const DEFERRAL =
  /\b(not|isn'?t|don'?t|doesn'?t|no)\b[\s\S]{0,30}\b(touch(ing)?|ready|now|yet|there|discussing?|talking? about)\b[\s\S]{0,20}\bimages?\b|\blong\s+way\s+from\b|\bhyperfixat(e|ion|ing)\b.{0,30}\bimage\b|\bnot\s+(yet|now)\b/i;

const IMAGE_TALK =
  /\b(header|cover)\s*(image|photo|pic)?\b|\bimage\s*(prompt|generation|style|reference)\b|\bdall-?e\b|\bvisual\s*(style|continuity|bar|reference)\b|\bwhat\s+(does|should)\s+the\s+(header|cover|image)\b|\bpropose\s+(the\s+)?(header|cover)?\s*image\b/i;

/**
 * @param {string} userMessage      This turn's message from Bart.
 * @param {string} previousReply    The single message immediately before it, normally Auto's.
 * @returns {boolean}
 */
export function signalsImageDiscussion(userMessage, previousReply = '') {
  const msg = String(userMessage || '');
  if (DEFERRAL.test(msg)) return false;
  if (IMAGE_TALK.test(msg)) return true;
  return IMAGE_TALK.test(String(previousReply || ''));
}
