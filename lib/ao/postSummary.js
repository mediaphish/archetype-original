/**
 * Summaries that cannot end mid-word.
 *
 * The Jezebel Archetype published on 2026-08-24 with this as its summary:
 *
 *   "Naboth had a vineyard next to the palace in Jezreel. Ahab wanted it. He
 *    offered a fair trade, a better vineyard or a fair price, and Naboth said
 *    no. Not out of spite. The land was his inheritance, passed down from his
 *    fathers, and the law forbade him from selling it away. Ahab we"
 *
 * The draft row had no summary, so the scheduled publisher fell back to
 * `plain.slice(0, 280)` and cut in the middle of "went". It went live in that
 * state, above the fold, on a post carrying Bart's name.
 *
 * Two failures, and both are fixed here rather than one:
 *   1. The slice had no sentence awareness. It cuts on whole sentences now, and
 *      on a word boundary only as a last resort.
 *   2. Nothing inspected the result before publishing. isTruncatedSummary is the
 *      check the publish path was missing, and it blocks rather than warns.
 *
 * Pure functions, no IO, so the rules are testable without a database.
 */

export const SUMMARY_MAX = 280;
/**
 * Below this a summary is a fragment, not a summary.
 *
 * Kept low deliberately. Devotional summaries are a single line by design, and
 * a 60-character floor condemned dozens of perfectly good ones.
 */
export const SUMMARY_MIN = 20;

/** Strip markdown down to prose for summarising. */
function toPlain(markdown) {
  return String(markdown || '')
    .replace(/^---[\s\S]*?^---\s*/m, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/[*_`>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build a summary from post content, ending on a sentence.
 *
 * Takes whole sentences up to the limit. If even the first sentence is longer
 * than the limit, it cuts at the last word boundary and adds an ellipsis, which
 * at least reads as deliberate rather than as a bug.
 */
export function summaryFromContent(markdown, { max = SUMMARY_MAX } = {}) {
  const plain = toPlain(markdown);
  if (!plain) return '';

  if (plain.length <= max) return plain;

  // Split on sentence ends, keeping the terminator with its sentence.
  const sentences = plain.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [];

  let out = '';
  for (const sentence of sentences) {
    const next = (out + sentence).trimEnd();
    if (next.length > max) break;
    out = next + ' ';
  }
  out = out.trim();

  if (out.length >= SUMMARY_MIN) return out;

  // No whole sentence fits. Cut on a word, never inside one.
  const hard = plain.slice(0, max - 1);
  const lastSpace = hard.lastIndexOf(' ');
  return `${(lastSpace > SUMMARY_MIN ? hard.slice(0, lastSpace) : hard).trimEnd()}…`;
}

/**
 * Does this summary look cut off?
 *
 * Returns a reason string, or null when the summary is fine. A reason rather
 * than a boolean so the publish log says what was wrong.
 */
export function isTruncatedSummary(summary) {
  const s = String(summary || '').trim();
  if (!s) return 'summary is empty';
  if (s.length < SUMMARY_MIN) return `summary is only ${s.length} characters`;

  // Ends without terminal punctuation: the signature of a hard slice.
  if (!/[.!?…"'’”)]$/.test(s)) {
    return `summary does not end in punctuation, so it looks cut off: "...${s.slice(-40)}"`;
  }

  // A short-word check used to live here, flagging summaries whose last word was
  // one or two letters. It was both redundant and wrong: the punctuation rule
  // above already catches real truncation, and a sentence ending "...what
  // leaders actually do." is perfectly good English. It condemned a dozen real
  // summaries on its first run.
  //
  // A hyphen at the very end is the one extra signal worth keeping, since it
  // means a word was split, as in "That mix-".
  if (/[-–]$/.test(s.replace(/[.!?…"'’”)]+$/, ''))) {
    return 'summary ends on a split word';
  }

  return null;
}
