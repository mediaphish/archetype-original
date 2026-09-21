/**
 * A post is never published with a summary that stops mid-sentence.
 *
 * 2026-09-21. The Org Chart post carried a summary cut at "About one in four
 * professionals stall when". Publishing wrote it into the file unchanged, the
 * build's own check refused it, and the site stopped rebuilding: the post was
 * committed but never live, while the captions Bart had posted by hand pointed
 * at the dead URL. Bart: "This cannot be how this thing operates."
 *
 * The check already existed at build time. It runs before the commit now, and
 * repairs rather than refuses, because a truncated summary is never intentional
 * and refusing at this point would only strand the post again.
 */
import { isTruncatedSummary, summaryFromContent } from './postSummary.js';

/**
 * @param {{ summary?: string, content?: string }} post
 * @returns {{ summary: string, repaired: boolean, reason: string|null }}
 */
export function repairSummaryForPublish({ summary, content } = {}) {
  const current = String(summary || '').trim();
  const problem = current ? isTruncatedSummary(current) : 'summary is empty';
  if (!problem) return { summary: current, repaired: false, reason: null };

  // Prefer the last whole sentence already in the summary: it is Bart's wording.
  const sentences = current.match(/[^.!?…]+[.!?…]/g) || [];
  const fromSentences = sentences.join('').trim();
  if (fromSentences && !isTruncatedSummary(fromSentences)) {
    return { summary: fromSentences, repaired: true, reason: problem };
  }

  // Otherwise rebuild from the post itself, which ends cleanly by construction.
  const rebuilt = String(summaryFromContent(content) || '').trim();
  if (rebuilt && !isTruncatedSummary(rebuilt)) {
    return { summary: rebuilt, repaired: true, reason: problem };
  }

  return { summary: current, repaired: false, reason: problem };
}
