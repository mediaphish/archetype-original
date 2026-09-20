/**
 * Which post does an uploaded image belong to?
 *
 * 2026-09-20, Bart: "It's really annoying to have to add the slug for the post
 * when I upload an image. Auto should be intelligent enough to know what post
 * we are adding an image to."
 *
 * It already knows. The draft is open in the panel, and the thread is full of
 * artifact tags carrying its slug. The upload still stopped to ask, because the
 * only guess it made read publish and fetch signals and ignored the artifact tag
 * entirely, so the box usually came up blank.
 *
 * Order: the post open in the panel, then the newest slug named in the thread.
 * Only when both come up empty is there anything worth asking about.
 */

/** Slug attributes on the signals that name a post, newest first. */
const SLUG_SIGNALS = [
  /\[ARTIFACT[^\]]*\bslug="([^"]+)"/i,
  /\[PUBLISH_JOURNAL[^\]]*\bslug="([^"]+)"/i,
  /\[PUBLISH_DEVOTIONAL[^\]]*\bslug="([^"]+)"/i,
  /\[DRAFT_FETCH_FULL_TEXT[^\]]*\bslug="([^"]+)"/i,
  /\[CORPUS_FETCH_FULL_TEXT[^\]]*\bslug="([^"]+)"/i,
];

/** The newest slug named anywhere in the thread. */
export function latestSlugInMessages(messages) {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const text = String(messages[i]?.content || '');
    for (const pattern of SLUG_SIGNALS) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
  }
  return '';
}

/**
 * @param {{ artifactSlug?: string|null, messages?: Array }} context
 * @returns {{ slug: string, source: 'panel'|'thread'|'none' }}
 */
export function resolveUploadTargetSlug({ artifactSlug = null, messages = [] } = {}) {
  const open = String(artifactSlug || '').trim();
  if (open) return { slug: open, source: 'panel' };

  const recent = latestSlugInMessages(messages);
  if (recent) return { slug: recent, source: 'thread' };

  return { slug: '', source: 'none' };
}
