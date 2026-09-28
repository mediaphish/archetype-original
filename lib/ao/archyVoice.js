/**
 * Archy speaks in public, so Archy follows the voice rules.
 *
 * 2026-09-28. Asked a Culture Science question on the live site, Archy answered
 * well and used em dashes four times. The rule Bart has enforced on every other
 * surface is absolute ("No em dashes. Ever."), and it was enforced everywhere
 * except the one surface a stranger actually reads. Archy's system prompt never
 * mentioned it and nothing checked the output.
 *
 * A prompt rule is a request. This is the part that holds, and it runs on every
 * answer before it leaves the server.
 *
 * Why a comma rather than the hyphen used for podcast copy: Archy writes in
 * Bart's conversational register, where the second clause usually runs on from
 * the first. "It isn't that, it's this" is how he writes. A hyphen in the same
 * position reads like a typo.
 */

/**
 * Numeric ranges keep their en dash: "Q1-Q3" and "2020-2024" are not prose.
 * The optional letter covers a labelled range like the quarters in the
 * Four-Survey Framework, where the digit sits behind a Q.
 */
const EN_DASH_IN_RANGE = /(?<=\d)\s*–\s*(?=[A-Za-z]?\d)/;

/**
 * Replace dashes used as clause separators with punctuation Bart actually uses.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripProseDashes(text) {
  let out = String(text || '');
  if (!out) return out;

  // Protect numeric ranges before touching en dashes at all.
  const ranges = [];
  out = out.replace(new RegExp(EN_DASH_IN_RANGE, 'g'), (match) => {
    ranges.push(match);
    return `\u0000${ranges.length - 1}\u0000`;
  });

  out = out
    // A dash straight after punctuation adds nothing: drop it and keep the mark.
    .replace(/([,;:])\s*[—–]\s*/g, '$1 ')
    // A dash opening or closing a line is a bullet or a rule, not a clause break.
    .replace(/^\s*[—–]\s+/gm, '')
    .replace(/\s*[—–]\s*$/gm, '')
    // Everything left is a clause separator.
    .replace(/\s*[—–]\s*/g, ', ')
    // The replacement can leave a comma next to punctuation that already ends
    // the clause, or doubled where the model wrote ", — ".
    .replace(/,\s*,/g, ',')
    .replace(/([.!?])\s*,\s*/g, '$1 ')
    .replace(/\s+,/g, ',');

  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => ranges[Number(i)]);
}

/** The line added to Archy's system prompt, kept next to the enforcement. */
export const ARCHY_DASH_RULE =
  'Never use em dashes or en dashes in your answers. Not in prose, not in lists, ' +
  'not in headings. Use a comma when two clauses run together, or a period when ' +
  'they do not. The only exception is a numeric range such as Q1-Q3.';
