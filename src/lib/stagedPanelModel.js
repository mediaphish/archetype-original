/**
 * What the staged journal panel shows. Pure, so it can be tested without React.
 *
 * Build step 2 of notes/AUTO_STAGED_WORKSPACE_SPEC.md: the tab shell and the
 * Image tab. The rules implemented here come straight from that spec, which
 * came from the Cain header image going missing below the fold of a panel that
 * stacked everything Auto had ever produced in one column.
 */

import { orderDesignImagesNewestFirst } from './designImageOrder.js';

/** The five tabs, in workflow order. Keys match STAGE_TABS in lib/ao/draftStage.js. */
export const TABS = Object.freeze([
  { key: 'research_brief', label: 'Research & Brief', approval: 'brief' },
  { key: 'post', label: 'Post', approval: 'post' },
  { key: 'image', label: 'Image', approval: 'image' },
  { key: 'captions', label: 'Captions', approval: 'captions' },
  { key: 'schedule_publish', label: 'Schedule & Publish', approval: 'schedule' },
]);

const TAB_KEYS = TABS.map((t) => t.key);

/**
 * Tabs with their state for the workflow strip.
 *
 * Each tab is exactly one of: current (the stage Bart is working on), done
 * (approved), or ahead. Labels only; nothing is loaded behind a tab until it is
 * opened.
 *
 * @param {{ tab?: string, approvals?: object, stage?: string }|null} stageInfo
 */
export function buildTabs(stageInfo) {
  const currentTab = stageInfo?.tab || null;
  const approvals = stageInfo?.approvals || {};
  const published = stageInfo?.stage === 'published';
  return TABS.map((t) => {
    let state = 'ahead';
    if (published) state = 'done';
    else if (t.key === currentTab) state = 'current';
    else if (approvals[t.approval]) state = 'done';
    return { ...t, state };
  });
}

/**
 * Which tab should be open.
 *
 * Approvals move the tab; looking does not. So the open tab follows the stage
 * only when the stage moves FORWARD. If Bart clicked back to Post to reread it,
 * a refetch that returns the same Image stage must not yank him back.
 *
 * @param {object} args
 * @param {string|null} args.userTab      Tab Bart chose, if any.
 * @param {string|null} args.previousTab  Stage tab on the previous render.
 * @param {string|null} args.stageTab     Stage tab now.
 */
export function resolveOpenTab({ userTab = null, previousTab = null, stageTab = null } = {}) {
  const stageMovedForward =
    stageTab && previousTab && TAB_KEYS.indexOf(stageTab) > TAB_KEYS.indexOf(previousTab);
  if (stageMovedForward) return stageTab;
  if (userTab && TAB_KEYS.includes(userTab)) return userTab;
  return stageTab && TAB_KEYS.includes(stageTab) ? stageTab : 'post';
}

/**
 * Auto's image candidates, newest first, with Bart's uploads kept apart.
 *
 * Uploads are references, not candidates. Mixing them into one list is exactly
 * what put a rejected reference photo on top of the image Bart asked for.
 *
 * The draft's saved image_url is also a candidate. After a reload, chat may not
 * hold the generation that produced it, and the image on the draft is the one
 * that is actually true.
 *
 * @returns {{ current: object|null, previous: object[], uploads: object[], total: number }}
 */
export function pickImageCandidates(designImages = [], draftImageUrl = null) {
  const all = Array.isArray(designImages) ? designImages : [];
  const uploads = orderDesignImagesNewestFirst(all.filter((i) => i?.manualUpload));
  let candidates = orderDesignImagesNewestFirst(all.filter((i) => i && !i.manualUpload && i.url));

  const saved = String(draftImageUrl || '').trim();
  if (saved && !candidates.some((c) => c.url === saved) && !uploads.some((u) => u.url === saved)) {
    candidates = [{ url: saved, label: 'Saved on the draft', savedOnDraft: true }, ...candidates];
  }

  const [current = null, ...previous] = candidates;
  return { current, previous, uploads, total: candidates.length };
}
