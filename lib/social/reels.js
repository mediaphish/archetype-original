/**
 * Short videos as Reels on Instagram and Facebook (2026-10-28).
 *
 * Bart: "2 to 5 small scripts ... 15 to 30 seconds ... Reels, TikToks, and
 * YouTube shorts." He records, Riverside's Magic Clips cuts the clips, he
 * uploads them to Auto, and these post them. See notes/PLAN-video-moments.md.
 *
 * Instagram makes a video wait while it processes, often longer than a
 * publish run should hold. So an Instagram Reel can come back "pending" with
 * its container id; the publisher keeps the post scheduled and finishes it on
 * the next run instead of waiting.
 */
import { getMetaConnection } from './metaConnection.js';
import { getInstagramLoginConnection } from './instagramLoginConnection.js';

const FB_GRAPH = 'https://graph.facebook.com/v25.0';
const IG_LOGIN_GRAPH = 'https://graph.instagram.com/v25.0';
const FB_UPLOAD = 'https://rupload.facebook.com/video-upload/v25.0';
const WAIT_MS = 50000;
const POLL_MS = 5000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errOf = (data, fallback) => data?.error?.message || fallback;

/** Which Graph host and credentials post Reels for this Instagram account. */
async function instagramTarget(accountId) {
  const login = await getInstagramLoginConnection(accountId);
  if (login?.token && login?.igUserId) return { base: IG_LOGIN_GRAPH, token: login.token, igUserId: login.igUserId };
  if (['meta', 'default', 'ig_meta'].includes(accountId)) {
    const meta = await getMetaConnection();
    if (meta?.token && meta?.igBusinessId) return { base: FB_GRAPH, token: meta.token, igUserId: meta.igBusinessId };
  }
  return null;
}

/** Pure: what a container status means for the next step. */
export function reelStatusStep(statusCode) {
  const s = String(statusCode || '').toUpperCase();
  if (s === 'FINISHED') return 'publish';
  if (s === 'ERROR' || s === 'EXPIRED') return 'failed';
  return 'wait';
}

/**
 * Post (or finish posting) an Instagram Reel.
 * @returns {{ success: true, postId } | { success: false, pending: true, containerId } | { success: false, error }}
 */
export async function postInstagramReel({ text, videoUrl, containerId = null }, accountId, { waitMs = WAIT_MS } = {}) {
  const t = await instagramTarget(accountId);
  if (!t) return { success: false, error: 'Instagram is not connected for this account' };
  const q = `access_token=${encodeURIComponent(t.token)}`;

  let id = containerId;
  if (!id) {
    const res = await fetch(`${t.base}/${t.igUserId}/media?${q}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: 'REELS', video_url: videoUrl, caption: text, share_to_feed: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) return { success: false, error: errOf(data, `Instagram Reel create ${res.status}`) };
    id = data.id;
  }

  const until = Date.now() + waitMs;
  for (;;) {
    const res = await fetch(`${t.base}/${id}?fields=status_code,status&${q}`);
    const data = await res.json().catch(() => ({}));
    const step = reelStatusStep(data.status_code);
    if (step === 'failed') return { success: false, error: `Instagram could not process the video: ${data.status || data.status_code}` };
    if (step === 'publish') break;
    if (Date.now() + POLL_MS > until) return { success: false, pending: true, containerId: id };
    await sleep(POLL_MS);
  }

  const res = await fetch(`${t.base}/${t.igUserId}/media_publish?${q}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: id }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) return { success: false, error: errOf(data, `Instagram Reel publish ${res.status}`) };
  return { success: true, postId: data.id };
}

/**
 * Post a Facebook Page Reel: start an upload, hand Facebook the video's URL,
 * then finish with the description. Facebook processes it on its side.
 */
export async function postFacebookReel({ text, videoUrl }, accountId) {
  if (!['meta', 'default', 'page_meta'].includes(accountId)) {
    return { success: false, error: 'Facebook Reels post to the company Page only' };
  }
  const meta = await getMetaConnection();
  if (!meta?.token || !meta?.pageId) return { success: false, error: 'The Facebook Page is not connected' };
  const q = `access_token=${encodeURIComponent(meta.token)}`;

  const start = await fetch(`${FB_GRAPH}/${meta.pageId}/video_reels?${q}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upload_phase: 'start' }),
  });
  const started = await start.json().catch(() => ({}));
  if (!start.ok || !started.video_id) return { success: false, error: errOf(started, `Facebook Reel start ${start.status}`) };

  const up = await fetch(`${FB_UPLOAD}/${started.video_id}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${meta.token}`, file_url: videoUrl },
  });
  const uploaded = await up.json().catch(() => ({}));
  if (!up.ok || uploaded.success === false) return { success: false, error: errOf(uploaded, `Facebook Reel upload ${up.status}`) };

  const finish = await fetch(`${FB_GRAPH}/${meta.pageId}/video_reels?${q}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upload_phase: 'finish', video_id: started.video_id, video_state: 'PUBLISHED', description: text }),
  });
  const done = await finish.json().catch(() => ({}));
  if (!finish.ok || done.success === false) return { success: false, error: errOf(done, `Facebook Reel finish ${finish.status}`) };
  return { success: true, postId: String(started.video_id) };
}

/** Platforms a Reel can post to today. LinkedIn, X, YouTube and TikTok come later. */
export const REEL_PLATFORMS = new Set(['instagram', 'facebook']);
