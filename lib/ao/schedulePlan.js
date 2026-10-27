/**
 * The schedule for a journal post: when the post goes live and when each
 * channel's caption goes out, including the two Bart posts by hand.
 *
 * Bart, 2026-10-27: "I almost think we have to know the schedule first,
 * because what I do is I take these captions and I copy and paste them into
 * my social media. I make arbitrary decisions as to when they go live on the
 * two channels that I have to post manually to. What I don't want to do is
 * make those decisions on my own. I want our plan that's developed inside Auto
 * to be the schedule. Let's swap captions and schedule, and separate schedule
 * from publish."
 *
 * So the order is Schedule, then Captions (each one showing its time), then
 * Publish. The plan is proposed from the post's publish date and the same
 * per-platform clock the scheduler uses; once Bart approves it, it is frozen on
 * the draft (metadata.schedule_plan) and publishing uses exactly those times.
 */

/** Every channel, in the order Bart reads them. */
export const PLAN_CHANNELS = Object.freeze([
  { key: 'linkedin_personal', label: 'LinkedIn Personal', platform: 'linkedin', manual: false },
  { key: 'linkedin_business', label: 'LinkedIn Business', platform: 'linkedin', manual: true },
  { key: 'facebook_business', label: 'Facebook Business', platform: 'facebook', manual: false },
  { key: 'facebook_personal', label: 'Facebook Personal', platform: 'facebook', manual: true },
  { key: 'instagram_business', label: 'Instagram Business', platform: 'instagram', manual: false },
  { key: 'instagram_personal', label: 'Instagram Personal', platform: 'instagram', manual: false },
  { key: 'twitter', label: 'X', platform: 'twitter', manual: false },
]);

const KEYS = new Set(PLAN_CHANNELS.map((c) => c.key));

const validIso = (v) => {
  const t = Date.parse(String(v || ''));
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

/** Pure: Bart's or Vox's changes to the times, kept to real channels and real times. */
export function cleanTimes(times) {
  const out = {};
  if (!times || typeof times !== 'object') return out;
  for (const [key, value] of Object.entries(times)) {
    const iso = validIso(value);
    if (KEYS.has(key) && iso) out[key] = iso;
  }
  return out;
}

/**
 * Pure: the plan as the panel shows it, from the publish time and a time per
 * channel. Rows are sorted by time, then by the channel order above.
 */
export function buildPlan({ publishAt = null, times = {}, approvedAt = null } = {}) {
  const rows = PLAN_CHANNELS.map((c, i) => ({ ...c, at: validIso(times?.[c.key]), order: i }))
    .sort((a, b) => (a.at && b.at ? (a.at < b.at ? -1 : a.at > b.at ? 1 : 0) : a.at ? -1 : b.at ? 1 : 0) || a.order - b.order)
    .map(({ order, ...r }) => r);
  return { publishAt: validIso(publishAt), approvedAt: approvedAt || null, rows };
}

/** Pure: the approved plan saved on a draft, or null. */
export function savedPlan(draft) {
  const p = draft?.metadata?.schedule_plan;
  if (!p || typeof p !== 'object' || !p.times) return null;
  return buildPlan({ publishAt: p.publish_at || draft?.scheduled_publish_at, times: p.times, approvedAt: p.approved_at || null });
}

/**
 * The plan for a draft: the approved one if there is one, otherwise a
 * proposal from its publish date. No publish date means Vox has not picked
 * the day yet, and there is nothing to propose.
 *
 * @param {object} draft
 * @param {{ clockFor?: (date: Date, platform: string) => Promise<string>, overrides?: object }} [opts]
 */
export async function planForDraft(draft, { clockFor = null, overrides = {} } = {}) {
  const saved = savedPlan(draft);
  if (saved && !Object.keys(overrides || {}).length) return { ok: true, plan: saved, approved: true };
  const publishAt = validIso(draft?.scheduled_publish_at);
  if (!publishAt) {
    return { ok: false, needs: 'publish_date', error: 'This post has no publish date yet. Vox picks the day first, then the times follow from it.' };
  }
  const clock =
    clockFor ||
    (async (date, platform) => {
      const { toScheduledAt } = await import('./unifiedScheduler.js');
      return toScheduledAt(date, platform);
    });
  // The launch posts go out on the publish day itself.
  const ymd = publishAt.slice(0, 10);
  const day = new Date(`${ymd}T12:00:00.000Z`);
  const times = {};
  for (const c of PLAN_CHANNELS) {
    try {
      times[c.key] = validIso(await clock(day, c.platform));
    } catch (_) {
      times[c.key] = null;
    }
  }
  const base = saved ? Object.fromEntries(saved.rows.map((r) => [r.key, r.at])) : times;
  return { ok: true, plan: buildPlan({ publishAt, times: { ...base, ...cleanTimes(overrides) } }), approved: false };
}

/** Pure: what is stored on the draft when Bart approves the plan. */
export function planRecord(plan, approvedAt) {
  return {
    publish_at: plan.publishAt,
    times: Object.fromEntries(plan.rows.filter((r) => r.at).map((r) => [r.key, r.at])),
    approved_at: approvedAt,
  };
}

/** Pure: the approved time for one channel, or null (then the scheduler picks as before). */
export function plannedTimeFor(draft, key) {
  const t = draft?.metadata?.schedule_plan?.times?.[key];
  return validIso(t);
}

/**
 * The approved time for a channel, only while the plan is for this launch day.
 * A plan made for a day that has since moved is not used.
 */
export function planTimeForLaunch(draft, key, launchYmd) {
  const plan = draft?.metadata?.schedule_plan;
  if (!plan?.times) return null;
  const planDay = String(plan.publish_at || '').slice(0, 10);
  if (planDay && launchYmd && planDay !== launchYmd) return null;
  return plannedTimeFor(draft, key);
}
