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
import { insertScheduledPostsSafely } from '../db/scheduledPosts.js';
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
