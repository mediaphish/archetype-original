/**
 * Which stage of the journal workflow a draft is in.
 *
 * Build step 1 of notes/AUTO_STAGED_WORKSPACE_SPEC.md. Everything else in the
 * staged workspace reads this: which tab opens, what Auto is told Bart is
 * working on, and which approval comes next.
 *
 * WHY THIS IS DERIVED FROM THE DRAFT, NOT FROM THE CHAT.
 *
 * The artifact panel decided what to show by parsing chat history, and on
 * 2026-09-11 that put a rejected reference upload on top of the image Bart had
 * just asked for, with the real one below the fold. Chat text is a record of
 * what was said. The draft row is a record of what is true, it survives a
 * reload, and it reads the same whether Bart clicked Approve or Auto called
 * approve_draft.
 *
 * Deliberately pure: it takes the shape getScheduleStatus already returns, so
 * there is one reading of state in the system rather than a second opinion.
 */

/** In workflow order. Index order is meaningful; do not reorder casually. */
export const STAGES = Object.freeze([
  'brief',
  'post',
  'image',
  'captions',
  'schedule',
  'published',
]);

/** Tab each stage belongs to, matching the spec's five tabs. */
export const STAGE_TABS = Object.freeze({
  brief: 'research_brief',
  post: 'post',
  image: 'image',
  captions: 'captions',
  schedule: 'schedule_publish',
  published: 'schedule_publish',
});

/** Caption rows that exist but are not yet committed to the queue. */
const UNCOMMITTED_CAPTION_STATUSES = new Set(['pending_review', 'draft']);

function isApproved(draft) {
  return Boolean(draft?.approved_at) || String(draft?.status || '') === 'approved';
}

function isPublished(draft) {
  return Boolean(draft?.published_at) || String(draft?.status || '') === 'published';
}

function hasImage(draft) {
  return Boolean(draft?.has_image || draft?.image_url);
}

function hasBody(draft) {
  // A draft row can exist with empty content: the title was saved before the
  // writing happened. That is the Brief stage, not the Post stage.
  return String(draft?.content || '').trim().length > 0 || Boolean(draft?.has_content);
}

/**
 * @param {object} input
 * @param {object|null} input.draft     Draft row, or the summary getScheduleStatus returns.
 * @param {Array} input.captions        Caption rows for this slug.
 * @returns {{stage: string, tab: string, approvals: object, next: string|null, reason: string}}
 */
export function deriveDraftStage({ draft = null, captions = [] } = {}) {
  const rows = Array.isArray(captions) ? captions : [];
  const captionCount = rows.length;
  const committed = rows.filter(
    (r) => !UNCOMMITTED_CAPTION_STATUSES.has(String(r?.status || '').toLowerCase())
  ).length;

  const approvals = {
    brief: Boolean(draft) && hasBody(draft),
    post: isApproved(draft) || isPublished(draft),
    image: hasImage(draft),
    captions: captionCount > 0,
    schedule: committed > 0 || Boolean(draft?.scheduled_publish_at),
  };

  const at = (stage, reason) => ({
    stage,
    tab: STAGE_TABS[stage],
    approvals,
    next: STAGES[STAGES.indexOf(stage) + 1] || null,
    reason,
  });

  if (!draft) return at('brief', 'no draft exists yet');
  if (String(draft.status || '') === 'abandoned') {
    return { ...at('brief', 'draft was abandoned'), stage: 'abandoned', tab: STAGE_TABS.brief, next: null };
  }
  if (isPublished(draft)) return at('published', 'draft is published');

  // Committed caption rows mean the queue has been written, which only happens
  // once captions are settled. That is the schedule stage even if the publish
  // time is not set yet.
  if (approvals.schedule) return at('schedule', 'captions are committed to the queue');
  if (captionCount > 0) return at('captions', 'caption rows exist but are not committed');

  if (!isApproved(draft)) {
    return hasBody(draft)
      ? at('post', 'draft has a body and is not approved')
      : at('brief', 'draft exists but has no body yet');
  }

  // Approved and no image: this is the step that failed on the Cain post, where
  // nothing in the system knew the work had moved to the image.
  if (!hasImage(draft)) return at('image', 'post is approved and has no image');

  return at('captions', 'post is approved and has an image, captions not written');
}

/**
 * True when the stage moved forward, which is what switches the open tab.
 * Moving backwards (a reopen) must not yank the panel around on its own.
 */
export function stageAdvanced(previousStage, nextStage) {
  const a = STAGES.indexOf(previousStage);
  const b = STAGES.indexOf(nextStage);
  if (a < 0 || b < 0) return false;
  return b > a;
}
