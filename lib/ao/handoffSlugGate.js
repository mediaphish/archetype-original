/**
 * A handoff is not a post, and must never claim a post's slug.
 *
 * When Bart opens a new Auto session he pastes a handoff brief: where the series
 * stands, what the next entry owes the reader, the style rules. Auto's only tool
 * for persisting text is save_draft, so it has been saving those briefs as
 * journal drafts and deriving a slug from the brief's own heading. As of
 * 2026-08-25 the drafts table held six of them:
 *
 *   handoff-archetype-series-next-entry              (approved)
 *   handoff-archetype-series-next-entry-negative-archetype (approved, captions)
 *   handoff-archetype-series-next-entry-negative-archetype
 *   handoff-archetype-series-ruth-entry
 *   handoff-prompt-for-auto-part-2-scoreboard-leadership
 *   handoff-post-4-the-account-under-fire
 *
 * The slug is the public URL. Left alone, Part 4 would have published to
 * archetypeoriginal.com/journal/handoff-post-4-the-account-under-fire.
 *
 * Bart's rule: when a handoff opens a new session, the slug should not be set at
 * all until later in the process, once the post actually has a title. This gate
 * enforces that at the only point where it can be enforced, the write itself.
 *
 * Pure, and in its own module, so it can be tested without a database
 * connection. autoToolHandlers.js reaches supabase at import.
 */

/**
 * A slug that is really a brief rather than a post.
 *
 * "handoff" was the first form. On 2026-08-30 two more appeared, one of them
 * already approved:
 *
 *   prompt-for-auto-replace-mccain-with-charlie-company-2-7-cav-april-6-1970
 *   prompt-for-auto-replace-mccain-with-a-vietnam-era-combat-refusal
 *
 * Same disease, different word, and the gate that was written for the first
 * form did not catch it. The category is instruction-to-Auto saved as though it
 * were a post, so the pattern covers the words that category actually uses.
 */
const BRIEF_SLUG = /(^|-)(handoff|prompt-for-auto|prompt-for-claude|instructions-for-auto|brief-for-auto)(-|$)/i;

/**
 * A title that announces itself as a brief, including markdown-bolded forms.
 * "Prompt for Auto — ..." is the form that got through.
 */
const BRIEF_TITLE = /^[\s*_#]*(handoff|prompt for (auto|claude)|instructions? for auto|brief for auto)\b/i;

/**
 * @param {object} opts
 * @param {string} [opts.slug]  Slug the caller wants to write.
 * @param {string} [opts.title] Draft title.
 * @returns {{ ok: true } | { ok: false, gate: string, error: string }}
 */
export function assertNotHandoffSlug({ slug, title } = {}) {
  const slugStr = String(slug || '').trim();
  const titleStr = String(title || '').trim();

  const slugIsBrief = BRIEF_SLUG.test(slugStr);
  const titleIsBrief = BRIEF_TITLE.test(titleStr);

  if (!slugIsBrief && !titleIsBrief) return { ok: true };

  return {
    ok: false,
    gate: 'handoff_is_not_a_post',
    error:
      (slugIsBrief
        ? `Refusing to save a draft at slug "${slugStr}". `
        : `Refusing to save a draft titled "${titleStr}" as a post. `) +
      'A handoff or prompt is a brief, not a post, and the slug becomes the public URL. ' +
      'Do not save the brief as a journal draft and do not derive a slug from it. ' +
      'Set the slug later in the process, once the post has its real title, and use that ' +
      'title alone. For this series that means a slug like "the-account-under-fire", never ' +
      '"handoff-post-4-the-account-under-fire".',
  };
}
