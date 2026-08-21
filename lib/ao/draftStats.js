/**
 * Authoritative word and structure counts for a draft.
 *
 * Bart: "I need an actual word count for journal entries in Auto. Right now,
 * when I ask, I get an interpretation from character count."
 *
 * That is exactly what was happening — nothing measured the draft Auto was
 * holding, so the model inferred a number from length. Inference is fine for
 * prose and useless for a word target: it is confidently wrong in both
 * directions, and the whole point of the number is deciding whether a piece is
 * finished.
 *
 * Pure functions, no IO, so the counting rules are testable on their own.
 */

/** Fenced code blocks, which are not prose and should not inflate a word target. */
const FENCE = /```[\s\S]*?```/g;
const INLINE_CODE = /`[^`\n]*`/g;
const IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
// Keep the visible text of a link, drop the URL: "the [Ruth post](/x)" is three words.
const LINK = /\[([^\]]*)\]\([^)]*\)/g;
const BARE_URL = /https?:\/\/\S+/gi;
const HTML_TAG = /<[^>]+>/g;
// Leading markdown furniture: heading hashes, blockquotes, list bullets.
const LINE_PREFIX = /^[ \t]*(?:#{1,6}|>+|[-*+]|\d+\.)[ \t]+/gm;
const EMPHASIS = /[*_~]{1,3}/g;

/**
 * Strip markdown syntax down to readable prose.
 *
 * Frontmatter is removed because it is metadata, not writing — counting it
 * would credit a piece for its own title and tags.
 */
export function toProse(markdown) {
  let t = String(markdown || '');

  if (t.startsWith('---')) {
    const end = t.indexOf('\n---', 3);
    if (end !== -1) t = t.slice(t.indexOf('\n', end + 1) + 1);
  }

  return t
    .replace(FENCE, ' ')
    .replace(IMAGE, ' ')
    .replace(LINK, '$1')
    .replace(INLINE_CODE, ' ')
    .replace(HTML_TAG, ' ')
    .replace(BARE_URL, ' ')
    .replace(LINE_PREFIX, '')
    .replace(EMPHASIS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Words in a draft.
 *
 * A "word" is a whitespace-separated token containing at least one letter or
 * digit, so a stray em dash or a lone bullet does not count as one. Hyphenated
 * and apostrophised forms stay single words, which is how a writer counts them.
 */
export function countDraftWords(markdown) {
  const prose = toProse(markdown);
  if (!prose) return 0;
  return prose.split(' ').filter((tok) => /[\p{L}\p{N}]/u.test(tok)).length;
}

/** Markdown headings, ignoring any inside fenced code. */
export function countSections(markdown) {
  const withoutFences = String(markdown || '').replace(FENCE, '\n');
  const matches = withoutFences.match(/^[ \t]*#{1,6}[ \t]+\S/gm);
  return matches ? matches.length : 0;
}

/**
 * Full stats for a draft.
 *
 * characters is reported alongside words deliberately: it is what the model was
 * previously guessing from, and showing both makes a bad estimate obvious
 * instead of plausible.
 */
export function draftStats(markdown) {
  const raw = String(markdown || '');
  const prose = toProse(raw);
  const words = countDraftWords(raw);
  return {
    words,
    characters: raw.length,
    characters_prose: prose.length,
    sections: countSections(raw),
    paragraphs: raw.split(/\n{2,}/).filter((p) => p.trim()).length,
    // 238 wpm, the usual silent-reading figure for adult non-fiction.
    reading_minutes: words ? Math.max(1, Math.round(words / 238)) : 0,
  };
}
