/**
 * Schedule a promotional post that is not a journal entry: a podcast episode
 * launch, its follow-ups, an event, an announcement. Bart supplies the image
 * (usually attached in the chat) and approves the captions and times in chat.
 *
 * 2026-11-19: Bart attached two Episode 4 thumbnails and asked Vox for a launch
 * post and follow-ups. Vox wrote everything but had no tool that books a
 * non-journal post with its own image, so nothing could be queued. This is
 * that tool. Approval is enforced here, where the scheduling happens, with the
 * same rule approve_stage uses: Bart's own message this turn has to give it.
 */
import { insertScheduledPostsSafely, scheduledPosts } from '../db/scheduledPosts.js';
import { JOURNAL_LAUNCH_REQUIRED_CHANNELS } from './parseJournalSocialCaptions.js';
import { bartApprovedInMessage } from './stageApprovalRules.js';

export const PROMO_CHANNELS = JOURNAL_LAUNCH_REQUIRED_CHANNELS;

const X_LIMIT = 280;
const X_LINK = 23;

/** Images Auto may post: Auto's own storage (chat uploads, generated images) or the live site. */
const ALLOWED_IMAGE = [
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//i,
  /^https:\/\/(www\.)?archetypeoriginal\.com\//i,
];

export function isAllowedPromoImage(url) {
  const u = String(url || '').trim();
  return ALLOWED_IMAGE.some((re) => re.test(u));
}

function xLength(text) {
  return String(text || '').replace(/https?:\/\/\S+/g, 'x'.repeat(X_LINK)).length;
}

/**
 * Pure: the rows to insert, or the reason nothing can be.
 * captions: channel key -> text (all six automated channels required).
 * scheduled_at: default time; times: optional channel key -> ISO time.
 */
export function promoPostRows({
  title = null,
  image_url,
  image_url_square = null,
  captions,
  scheduled_at = null,
  times = null,
  thread_id = null,
  now = Date.now(),
}) {
  const wide = String(image_url || '').trim();
  const square = String(image_url_square || '').trim() || wide;
  if (!isAllowedPromoImage(wide)) {
    return { ok: false, error: 'image_url must be an image Bart attached in the chat (its durable URL) or one on archetypeoriginal.com.' };
  }
  if (!isAllowedPromoImage(square)) {
    return { ok: false, error: 'image_url_square must be an image Bart attached in the chat or one on archetypeoriginal.com.' };
  }
  const caps = captions && typeof captions === 'object' ? captions : {};
  const rows = [];
  const problems = [];
  for (const ch of PROMO_CHANNELS) {
    const text = String(caps[ch.key] || '').trim();
    if (!text) {
      problems.push(`${ch.key}: caption missing`);
      continue;
    }
    if (ch.platform === 'twitter' && xLength(text) > X_LIMIT) {
      problems.push(`twitter: ${xLength(text)} characters, over ${X_LIMIT}`);
    }
    if (ch.platform === 'instagram' && /https?:\/\//i.test(text)) {
      problems.push(`${ch.key}: links do not work on Instagram; use "link in bio"`);
    }
    const whenRaw = (times && times[ch.key]) || scheduled_at;
    const when = Date.parse(whenRaw || '');
    if (!Number.isFinite(when)) {
      problems.push(`${ch.key}: no valid time`);
      continue;
    }
    if (when < now + 5 * 60000) {
      problems.push(`${ch.key}: time must be at least five minutes from now`);
      continue;
    }
    rows.push({
      platform: ch.platform,
      account_id: ch.account_id,
      scheduled_at: new Date(when).toISOString(),
      text,
      image_url: ch.platform === 'instagram' ? square : wide,
      status: 'scheduled',
      source_kind: 'promo',
      ao_lane: 'Promotion',
      intent: { promo: true, title, channel: ch.key, thread_id },
    });
  }
  if (problems.length) return { ok: false, error: `Nothing scheduled. Fix: ${problems.join('; ')}.` };
  return { ok: true, rows };
}

/** Promo posts on one account must be at least this far apart: one a day per channel. */
export const PROMO_MIN_GAP_HOURS = 20;

/**
 * Pure: rows that land too close to another promo post on the same account,
 * either already booked (`existing`) or earlier in this same batch.
 *
 * 2026-11-19: the launch and three follow-ups meant for Mon, Tue and Wed were
 * all booked on launch afternoon, four posts per channel in two and a half
 * hours. Bart: "Shouldn't it just be 1 post per channel?"
 */
export function promoConflicts(rows, existing = []) {
  const gap = PROMO_MIN_GAP_HOURS * 3600000;
  const seen = (existing || []).map((e) => ({ key: `${e.platform}|${e.account_id}`, at: Date.parse(e.scheduled_at) }));
  const out = [];
  for (const r of rows || []) {
    const key = `${r.platform}|${r.account_id}`;
    const at = Date.parse(r.scheduled_at);
    const clash = seen.find((s) => s.key === key && Math.abs(s.at - at) < gap);
    if (clash) out.push({ key, at: r.scheduled_at, other: new Date(clash.at).toISOString() });
    seen.push({ key, at });
  }
  return out;
}

export async function schedulePromoPost(input, ctx = {}) {
  if (!bartApprovedInMessage(ctx?.userMessage, { stage: 'captions' })) {
    return {
      ok: false,
      gate: 'promo_not_approved',
      error:
        'NOT SCHEDULED. Bart has not approved this post in his message this turn. Show him every caption in full ' +
        '(including Facebook Personal, which he pastes by hand), the image for each channel and every time, then ask once. ' +
        'Schedule in the turn he says yes.',
    };
  }
  const built = promoPostRows({ ...(input || {}), thread_id: ctx?.threadId || null });
  if (!built.ok) return built;
  const times = built.rows.map((r) => Date.parse(r.scheduled_at));
  const gapMs = PROMO_MIN_GAP_HOURS * 3600000;
  const { data: existing } = await scheduledPosts()
    .select('platform, account_id, scheduled_at')
    .eq('source_kind', 'promo')
    .in('status', ['scheduled', 'posted', 'publishing'])
    .gte('scheduled_at', new Date(Math.min(...times) - gapMs).toISOString())
    .lte('scheduled_at', new Date(Math.max(...times) + gapMs).toISOString());
  const clashes = promoConflicts(built.rows, existing || []);
  if (clashes.length) {
    return {
      ok: false,
      gate: 'promo_too_close',
      error:
        `NOT SCHEDULED. One promo post per channel per day: ${clashes.map((c) => `${c.key} at ${c.at} is within ${PROMO_MIN_GAP_HOURS} hours of another promo post (${c.other})`).join('; ')}. ` +
        'Follow-ups go on their own days. Pass each follow-up its own scheduled_at on the day Bart approved.',
    };
  }
  const out = await insertScheduledPostsSafely(built.rows, {
    select: 'id, platform, account_id, scheduled_at, status',
    allowMinimalFallback: true,
    stripForFallback: ({ source_kind, intent, ao_lane, ...rest }) => rest,
  });
  if (!out.ok) return { ok: false, error: out.error || 'Nothing was scheduled.' };
  const fbPersonal = String(input?.captions?.facebook_personal || '').trim();
  return {
    ok: true,
    scheduled: out.inserted,
    facebook_personal_to_paste: fbPersonal || null,
    note: 'Queued. Tell Bart in one line what goes out where and when, and hand him the Facebook Personal caption to paste.',
  };
}
