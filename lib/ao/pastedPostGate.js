/**
 * A note to Auto is not a post.
 *
 * Found 2026-09-11 while checking stage derivation against real data. The
 * drafts table held around twenty journal rows whose slugs were Bart's own
 * sentences, several of them marked approved:
 *
 *   no-that-one-was-approved-and-published                  (draft)
 *   approved-with-two-changes                               (draft)
 *   the-mccain-section-still-doesn-t-land-read-your-own-... (draft)
 *   five-fixes-to-the-daniel-post-everything-else-in-it-... (approved)
 *   better-both-issues-are-fixed                            (approved)
 *   post                                                    (approved, title "post.")
 *
 * The cause is a single rule in looksLikeFullPastedPost: any message longer
 * than 1,500 characters was treated as a pasted post. Bart's editorial notes
 * run 1,500 to 4,000 characters, so detailed feedback became a journal draft,
 * titled with its own first sentence and slugged from that title. The slug is
 * the public URL.
 *
 * Length alone cannot tell a post from a note, because the notes are long.
 * What separates them is shape:
 *
 *   A note talks TO Auto and ABOUT a post. It quotes a line to object to it,
 *   opens with an answer ("No," "Approved with two changes."), or gives
 *   instructions in the second person.
 *
 *   A post talks to a reader. It has a title, and the title is a title: short,
 *   not a sentence, not a quotation.
 *
 * Kept pure and separate so it is testable without a database, the same reason
 * handoffSlugGate.js exists.
 */

/** Opening moves that answer Auto rather than start a piece of writing. */
const REPLY_OPENERS =
  /^[\s*_>#"“']*(no|nope|yes|yep|ok|okay|correct|agreed|approved|approve|better|good|great|perfect|right|wrong|almost|close|not quite|actually|hold on|wait|stop|continuing|still|same|and|also|one more|two more|another|next|first|second|third)\b[\s,.:;!?-]/i;

/** Second-person instruction about writing. A post never addresses its writer. */
const ADDRESSES_AUTO =
  /\b(you (wrote|said|need to|should|must|have to|keep|missed|changed|deleted|removed|added|used|claimed|left)|your own|read your|read it back|you're|you are (still|not)|do not|don't) \b/i;

/** Treating a post as an object under discussion. */
const TALKS_ABOUT_THE_PIECE =
  /\b(the|this) (post|piece|entry|draft|article|section|paragraph|line|opening|ending|version)\b|\bthe .{2,40} section\b|\bfix(es)? to the\b|\bchange only what\b/i;

/** Editing verbs aimed at an existing text. */
const EDIT_INSTRUCTION =
  /\b(fix|rewrite|rework|revise|replace|cut|tighten|shorten|expand|clarify|define|explain|reword|swap|drop|remove|add)\b.{0,40}\b(this|that|it|the (post|piece|line|section|paragraph|quote|word))\b/i;

/** A handoff brief, the form handoffSlugGate.js already refuses by slug. */
const HANDOFF_MARKER = /\bhandoff\b\s*:/i;

/**
 * A first line that announces itself as working material.
 *
 * "Image prompt: The Ruth Archetype" reads as a title by every other test here:
 * short, title case, no terminal punctuation. It is a prompt, and it became a
 * journal draft at slug image-prompt-the-ruth-archetype.
 */
const WORKING_MATERIAL_TITLE =
  /^[\s*_#>]*(image prompt|prompt|notes?|feedback|revisions?|edits?|changes|outline|brief|research|handoff|draft notes)\b\s*[:\-–—]/i;

/**
 * Does this first line read as a title?
 *
 * Real titles from this corpus: "The Cain Archetype", "Scoreboard Leadership",
 * "Twenty Points Apart". Short, no terminal punctuation, no quotation marks.
 * Note first lines: "No, that one was approved and published.", "\"The plainer
 * sense is just lying there.\" This doesn't fit my tone and voice."
 */
export function looksLikeATitle(line) {
  const t = String(line || '').trim().replace(/^#+\s*/, '').replace(/^\*+|\*+$/g, '').trim();
  if (!t) return false;
  if (t.length > 70) return false;
  if (/^["“']/.test(t)) return false;
  if (/[.?!,;:]$/.test(t)) return false;
  // A sentence hiding in a short line: "Approved with two changes" has a verb
  // phrase and no title case. Require no mid-line sentence break.
  if (/[.?!]\s+\S/.test(t)) return false;
  return true;
}

/**
 * Is this message a note to Auto rather than a post?
 *
 * Any one strong signal is enough. These are not subtle documents: they open
 * with an answer, quote the piece, or tell Auto what to change.
 */
export function looksLikeNoteToAuto(text) {
  const raw = String(text || '');
  if (!raw.trim()) return false;

  const firstLine = raw.split('\n').map((l) => l.trim()).find(Boolean) || '';
  const head = raw.slice(0, 600);

  if (HANDOFF_MARKER.test(head)) return true;
  if (WORKING_MATERIAL_TITLE.test(firstLine)) return true;
  if (REPLY_OPENERS.test(firstLine)) return true;
  // Opening by quoting a line is how every objection in this corpus starts.
  if (/^["“]/.test(firstLine)) return true;
  if (ADDRESSES_AUTO.test(head)) return true;
  if (TALKS_ABOUT_THE_PIECE.test(head) && !looksLikeATitle(firstLine)) return true;
  if (EDIT_INSTRUCTION.test(head)) return true;

  return false;
}

/**
 * Should a pasted message be written to a draft as a post?
 *
 * A markdown H1 is trusted: Bart pasting "# The Cain Archetype" means it. Past
 * that, length is not enough on its own; the text must not read as a note, and
 * its first line must read as a title, because that line becomes the slug and
 * the slug becomes the public URL.
 *
 * @returns {{ save: true } | { save: false, gate: string, reason: string }}
 */
export function shouldSavePastedPost(text) {
  const raw = String(text || '');
  const firstLine = raw.split('\n').map((l) => l.trim()).find(Boolean) || '';
  const hasH1 = /^#\s+.+$/m.test(raw);

  if (looksLikeNoteToAuto(raw)) {
    return {
      save: false,
      gate: 'note_is_not_a_post',
      reason:
        'This message reads as a note to Auto about a post, not a post. Saving it would create a ' +
        'journal draft titled with its own first sentence, and that title becomes the public URL.',
    };
  }

  if (hasH1 && raw.length > 400) return { save: true };

  if (raw.length > 1500) {
    if (!looksLikeATitle(firstLine)) {
      return {
        save: false,
        gate: 'no_title_line',
        reason:
          `Long, but its first line is not a title: "${firstLine.slice(0, 80)}". A pasted post needs a ` +
          'real title line, because the title becomes the slug and the slug becomes the public URL.',
      };
    }
    return { save: true };
  }

  return { save: false, gate: 'too_short', reason: 'Too short to be a pasted post.' };
}
