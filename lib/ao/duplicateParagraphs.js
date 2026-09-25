/**
 * The same paragraph, twice, in one reply.
 *
 * 2026-09-25. Bart asked Auto for a handoff from The Jonathan Archetype to the
 * next entry. The reply carried its "Series note" paragraph word for word in
 * two places, once in the opening and again inside the handoff block. Same
 * failure shape as the loop in the Jonathan draft, in a surface nothing was
 * watching: the repetition check in draftRepetition.js only runs on saved
 * drafts over 800 words, so a chat reply is never looked at.
 *
 * This is the narrow half of that problem and it needs no model and no
 * embeddings. A paragraph repeated character for character inside one reply is
 * never a writing choice, so the second copy is dropped and the first stays
 * where it was. Anything short of identical is left alone: near-repetition is a
 * judgment about meaning, which belongs to draftRepetition.js, not here.
 *
 * Deliberately conservative. Only substantial prose blocks are eligible, code
 * fences are never touched, and structural lines that are supposed to repeat
 * (headings, list items, table rows, quotes) are skipped.
 */

/** A block has to be at least this long before a repeat counts as a mistake. */
export const MIN_WORDS = 20;

/** Lines that legitimately recur in a well formed reply. */
const STRUCTURAL = /^(?:#{1,6}\s|>|\||[-*+]\s|\d+[.)]\s|---+$|===+$)/;

/** Whitespace and case are not what makes two paragraphs different. */
export function normalizeParagraph(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Long enough to matter, and prose rather than structure. */
export function isEligibleBlock(block) {
  const text = String(block || '').trim();
  if (!text) return false;
  if (STRUCTURAL.test(text)) return false;
  return text.split(/\s+/).length >= MIN_WORDS;
}

/**
 * Drop every exact repeat of a paragraph, keeping the first copy in place.
 *
 * @param {string} reply
 * @returns {{ reply: string, removed: string[] }}
 */
export function stripDuplicateParagraphs(reply) {
  const source = String(reply || '');
  if (!source.trim()) return { reply: source, removed: [] };

  // Fenced code is copied verbatim and never deduplicated: two identical
  // snippets in one reply are usually the point (before and after).
  const segments = source.split(/(```[\s\S]*?```)/);
  const seen = new Set();
  const removed = [];

  const cleaned = segments.map((segment, index) => {
    if (index % 2 === 1) return segment;

    // Odd indexes hold the separators, so a removed block takes its own
    // preceding separator with it and the surrounding spacing survives.
    const parts = segment.split(/(\n{2,})/);
    const kept = [];
    for (let i = 0; i < parts.length; i += 1) {
      if (i % 2 === 1) continue;
      const block = parts[i];
      const separator = i > 0 ? parts[i - 1] : '';
      if (!isEligibleBlock(block)) {
        kept.push(separator, block);
        continue;
      }
      const key = normalizeParagraph(block);
      if (seen.has(key)) {
        removed.push(block.trim());
        continue;
      }
      seen.add(key);
      kept.push(separator, block);
    }
    return kept.join('');
  });

  return { reply: cleaned.join(''), removed };
}
