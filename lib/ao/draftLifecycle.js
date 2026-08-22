/**
 * What counts as a post, and what counts as done.
 *
 * Bart: "I do need a clear 'this post is done' process so the issue with Auto
 * thinking they aren't goes away."
 *
 * Auto was not confused. It reads ao_content_drafts for everything that is
 * neither published nor abandoned, and that list had two problems at once:
 *
 *   1. Five live posts — the-barnabas-archetype, the-absalom-archetype,
 *      the-nehemiah-archetype, the-pipeline-isnt-draining-its-refusing-to-fill,
 *      they-still-call-him — were still marked draft or approved. They are on
 *      the site. The row never moved.
 *
 *   2. Most of the rest were never posts. Auto had been slugifying Bart's own
 *      chat messages into draft rows: "ok-were-going-to-try-this-again-you-
 *      wrote-the-entire-post-deleted-it-because-of-", "named-individuals-have-
 *      taken-the-dispute-to-court-rather-than-a-hearing-room-wha". Alongside
 *      caption batches, handoff prompts, image prompts and selftest rows.
 *
 * So Auto looked at a list of work that would never finish, because most of it
 * could not finish, and told Bart it was outstanding. It was reporting the table
 * accurately.
 *
 * The rule this file establishes: **the published journal corpus is the source
 * of truth for done, not the drafts table.** A draft row is a work order. The
 * post being live is the completion. When the two disagree, the corpus wins.
 */

/** Rows the system creates for its own bookkeeping. Never posts, never "outstanding work". */
const ARTIFACT_PREFIXES = [
  'captions-',
  'handoff-',
  'handoff-prompt-',
  'image-prompt-',
  'session-brief-',
  'constraint-active-draft-',
  'draft-identity-selftest-',
];

const ARTIFACT_KINDS = new Set(['session_brief', 'content_constraint', 'captions']);

export function isWorkingArtifact({ slug = '', kind = '' } = {}) {
  if (ARTIFACT_KINDS.has(String(kind))) return true;
  const s = String(slug || '').toLowerCase();
  return ARTIFACT_PREFIXES.some((p) => s.startsWith(p));
}

/**
 * Does this slug look like a sentence someone typed rather than a title?
 *
 * Real post slugs are titles: "the-jezebel-archetype", "scoreboard-leadership".
 * The junk rows are truncated conversation, and they share a shape — long, many
 * words, and usually opening with a conversational stem.
 *
 * Deliberately conservative. Excluding a real post from Auto's list is worse
 * than leaving one artifact in it, so this requires both length and either a
 * conversational opener or a mid-sentence truncation.
 */
const CONVERSATIONAL_STEMS = [
  'ok-', 'okay-', 'do-we-', 'can-we-', 'can-you-', 'could-you-', 'would-you-',
  'i-need-', 'i-want-', 'i-think-', 'lets-', 'let-s-', 'another-angle-',
  'continuing-', 'more-notes', 'this-was-the-', 'better-both-', 'what-about-',
  'why-did-', 'how-do-', 'please-',
];

export function looksConversational(slug = '') {
  const s = String(slug || '').toLowerCase();
  if (!s) return false;
  const words = s.split('-').filter(Boolean);
  if (words.length < 8) return false;

  const hasStem = CONVERSATIONAL_STEMS.some((stem) => s.startsWith(stem));
  // A slug cut mid-word at the column limit ends with a hyphen or a word
  // fragment at exactly the truncation length.
  const truncated = s.endsWith('-') || s.length >= 78;
  return hasStem || truncated;
}

/**
 * Classify one draft row against the set of slugs that are actually live.
 *
 * @returns {'published'|'artifact'|'conversational'|'scheduled'|'in_progress'}
 */
export function classifyDraft(row, publishedSlugs) {
  const slug = String(row?.slug || '');
  const status = String(row?.status || '');

  if (status === 'published') return 'published';
  // The corpus wins over the row. A post that is live is done, whatever the
  // table says — this is the check that stops a shipped post being reported as
  // outstanding work.
  if (publishedSlugs && publishedSlugs.has(slug)) return 'published';
  if (isWorkingArtifact(row)) return 'artifact';
  if (looksConversational(slug)) return 'conversational';
  if (row?.scheduled_publish_at) return 'scheduled';
  return 'in_progress';
}

/**
 * The rows Auto should be told about: real posts that are genuinely unfinished.
 *
 * Scheduled posts are included, because a scheduled post is still worth knowing
 * about — but the caller must render its status as scheduled, not outstanding.
 */
export function selectOutstandingDrafts(rows, publishedSlugs) {
  return (rows || []).filter((r) => {
    const c = classifyDraft(r, publishedSlugs);
    return c === 'in_progress' || c === 'scheduled';
  });
}
