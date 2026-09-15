/**
 * Which stage of the journal workflow a draft is in.
 *
 * Build step 1 of notes/AUTO_STAGED_WORKSPACE_SPEC.md. Everything in the staged
 * workspace reads this: which tab opens, and which approval comes next.
 *
 * DERIVED FROM THE DRAFT, NOT FROM THE CHAT. Chat text is a record of what was
 * said; the draft row is a record of what is true, and it survives a reload.
 *
 * APPROVAL MEANS APPROVAL, NOT EXISTENCE. Corrected 2026-09-15.
 *
 * The first version treated a thing existing as that thing being approved: a
 * saved image counted as an approved image, caption rows counted as approved
 * captions, any post body counted as an approved brief. Only the post checked a
 * real approval. So the panel moved on without Bart. On "Your Tuesday" it went
 * past Image to Captions the moment an image was saved, before the image had
 * been discussed. Bart: "I need to approve each step before it moves on."
 *
 * Now each gate reads an explicit approval record:
 *
 *   brief      metadata.stage_approvals.brief
 *   post       approved_at, or status approved/published (set by approve_draft)
 *   image      metadata.stage_approvals.image
 *   captions   metadata.stage_approvals.captions
 *   schedule   metadata.stage_approvals.schedule
 *
 * A later approval implies the earlier ones. You cannot approve a post without
 * having had a brief, so an approved post counts the brief as done, and a draft
 * approved before these records existed does not get stuck on Brief.
 *
 * Deliberately pure.
 */

/** In workflow order. Index order is meaningful; do not reorder casually. */
export const STAGES = Object.freeze(['brief', 'post', 'image', 'captions', 'schedule', 'published']);

/** Tab each stage belongs to, matching the spec's five tabs. */
export const STAGE_TABS = Object.freeze({
  brief: 'research_brief',
  post: 'post',
  image: 'image',
  captions: 'captions',
  schedule: 'schedule_publish',
  published: 'schedule_publish',
});

/** Gates in order. Each later gate implies every earlier one. */
const GATES = ['brief', 'post', 'image', 'captions', 'schedule'];

function isPublished(draft) {
  return Boolean(draft?.published_at) || String(draft?.status || '') === 'published';
}

function recorded(draft, gate) {
  const approvals = draft?.metadata?.stage_approvals;
  return Boolean(approvals && approvals[gate] && (approvals[gate].approved_at || approvals[gate] === true));
}

function postApproved(draft) {
  return Boolean(draft?.approved_at) || ['approved', 'published'].includes(String(draft?.status || ''));
}

function hasBody(draft) {
  return String(draft?.content || '').trim().length > 0 || Boolean(draft?.has_content);
}

/**
 * Explicit approvals, with later gates implying earlier ones.
 */
export function stageApprovals(draft) {
  if (!draft) return { brief: false, post: false, image: false, captions: false, schedule: false };

  const direct = {
    brief: recorded(draft, 'brief'),
    post: postApproved(draft),
    image: recorded(draft, 'image'),
    captions: recorded(draft, 'captions'),
    schedule: recorded(draft, 'schedule'),
  };

  if (isPublished(draft)) {
    return { brief: true, post: true, image: true, captions: true, schedule: true };
  }

  const out = { ...direct };
  let laterApproved = false;
  for (let i = GATES.length - 1; i >= 0; i--) {
    const gate = GATES[i];
    if (direct[gate]) laterApproved = true;
    if (laterApproved) out[gate] = true;
  }
  return out;
}

/**
 * @param {object} input
 * @param {object|null} input.draft   Draft row, including metadata.
 * @returns {{stage: string, tab: string, approvals: object, next: string|null, reason: string}}
 */
export function deriveDraftStage({ draft = null } = {}) {
  const approvals = stageApprovals(draft);

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

  // The first gate not yet approved is where the work is. Nothing advances
  // past a gate Bart has not approved, whatever else exists on the draft.
  if (!approvals.post) {
    return hasBody(draft)
      ? at('post', 'post is not approved')
      : at('brief', 'no post body yet');
  }
  if (!approvals.image) return at('image', 'post is approved, image is not');
  if (!approvals.captions) return at('captions', 'image is approved, captions are not');
  if (!approvals.schedule) return at('schedule', 'captions are approved, schedule is not');
  return at('schedule', 'schedule is approved, waiting to publish');
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

/**
 * Whether a gate may be approved now. A gate can only be approved once every
 * earlier gate is. Used by the approval endpoint so the order is enforced where
 * the write happens, not only in the panel.
 */
export function canApproveGate(draft, gate) {
  const index = GATES.indexOf(gate);
  if (index < 0) return { ok: false, error: `Unknown step "${gate}".` };
  if (!draft) return { ok: false, error: 'Draft not found.' };
  if (isPublished(draft)) return { ok: false, error: 'This post is already published.' };
  const approvals = stageApprovals(draft);
  for (const earlier of GATES.slice(0, index)) {
    if (!approvals[earlier]) {
      return { ok: false, error: `Approve the ${earlier} before the ${gate}.` };
    }
  }
  return { ok: true };
}
