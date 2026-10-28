/**
 * Schedule a short video clip Bart uploaded as Reels (2026-10-28).
 *
 * Bart records, Riverside's Magic Clips cuts the clips, and he uploads the
 * ones he likes into a chat. That upload is his say-so for the clip, so, like
 * quote cards, it runs without a further approval: the team writes a caption
 * per channel and this queues it. See notes/PLAN-video-moments.md.
 *
 * Instagram (both accounts) and the Facebook Page only, for now. LinkedIn, X,
 * YouTube Shorts and TikTok come later.
 */
import { insertScheduledPostsSafely } from '../db/scheduledPosts.js';

export const VIDEO_CHANNELS = Object.freeze({
  instagram_business: { platform: 'instagram', account_id: 'meta' },
  instagram_personal: { platform: 'instagram', account_id: 'ig_mediaphish' },
  facebook_business: { platform: 'facebook', account_id: 'meta' },
});

/** Only clips in Auto's own video storage are posted. */
const OWN_VIDEO = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/ao-episode-video\/clips\//i;

/** Pure: the rows to insert, or the reason nothing can be. */
export function videoClipRows({ video_url, captions, scheduled_at, title = null, cover_url = null, thread_id = null }) {
  const url = String(video_url || '').trim();
  if (!OWN_VIDEO.test(url)) return { ok: false, error: 'video_url must be a clip Bart uploaded in the chat (Auto video storage).' };
  const when = Date.parse(scheduled_at || '');
  if (!Number.isFinite(when)) return { ok: false, error: 'scheduled_at must be a date and time.' };
  if (when < Date.now() + 5 * 60000) return { ok: false, error: 'scheduled_at must be at least five minutes from now.' };
  const rows = [];
  const missing = [];
  for (const [key, ch] of Object.entries(VIDEO_CHANNELS)) {
    const text = String(captions?.[key] || '').trim();
    if (!text) {
      missing.push(key);
      continue;
    }
    rows.push({
      platform: ch.platform,
      account_id: ch.account_id,
      scheduled_at: new Date(when).toISOString(),
      text,
      video_url: url,
      image_url: cover_url || null,
      status: 'scheduled',
      source_kind: 'video_moment',
      ao_lane: 'Video moments',
      intent: { video_moment: true, title, thread_id },
    });
  }
  if (missing.length) return { ok: false, error: `A caption is needed for every channel. Missing: ${missing.join(', ')}.` };
  return { ok: true, rows };
}

export async function scheduleVideoClip(input) {
  const built = videoClipRows(input || {});
  if (!built.ok) return built;
  const out = await insertScheduledPostsSafely(built.rows, { select: 'id, platform, account_id, scheduled_at, status' });
  if (!out.ok) return { ok: false, error: out.error || 'Nothing was scheduled.' };
  return { ok: true, scheduled: out.inserted };
}
