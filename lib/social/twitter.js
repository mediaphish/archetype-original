/**
 * Twitter/X channel adapter: post tweet via API v2.
 *
 * Text: OAuth 2.0 user token (Connect X), falling back to OAuth 1.0a.
 * Images: OAuth 2.0 only — upload to /2/media/upload, then post with media_ids.
 *
 * The OAuth 1.0a image path was removed on 2026-08-21 because X retired the
 * v1.1 media endpoints on 2025-06-09. Image posting requires the media.write
 * scope on the connected token.
 */

import crypto from 'crypto';
import { getSocialCredentials } from './config.js';
import { getXAccessToken } from './xConnection.js';

const TWITTER_API_BASE = 'https://api.twitter.com/2';

/**
 * Create OAuth 1.0a signature and Authorization header for POST /2/tweets.
 */
function oauth1Sign(method, url, credentials) {
  const oauth = {
    oauth_consumer_key: credentials.apiKey,
    oauth_token: credentials.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: Math.random().toString(36).slice(2) + Date.now().toString(36),
    oauth_version: '1.0',
  };
  const params = { ...oauth };
  const sortedKeys = Object.keys(params).sort();
  const paramStr = sortedKeys.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`;
  const signingKey = `${encodeURIComponent(credentials.apiSecret)}&${encodeURIComponent(credentials.accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(base).digest('base64');
  oauth.oauth_signature = signature;
  const header =
    'OAuth ' +
    Object.keys(oauth)
      .sort()
      .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauth[k])}"`)
      .join(', ');
  return header;
}

async function fetchImageAsBase64(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    return { ok: false, error: `Image fetch failed (${res.status})` };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) return { ok: false, error: 'Empty image' };
  return {
    ok: true,
    base64: buf.toString('base64'),
    contentType: res.headers?.get?.('content-type') || 'image/png',
  };
}

/**
 * Upload an image to X and return its media id.
 *
 * X sunset the v1.1 media upload endpoints on 2025-06-09. This code targeted
 * upload.twitter.com/1.1/media/upload.json until 2026-08-21, so X image posts
 * could never have worked here regardless of credentials — a request to the
 * retired endpoint answers "Could not authenticate you", which reads like a key
 * problem and sent us looking in the wrong place.
 *
 * The replacement is POST https://api.x.com/2/media/upload, which takes the
 * same OAuth 2.0 user token that already posts text. It requires the
 * media.write scope, which a token issued before that scope was requested will
 * not carry — hence the explicit 403 message below, since "forbidden" alone
 * would not tell anyone to reconnect.
 *
 * Simple (non-chunked) upload is fine for still images; chunked INIT/APPEND/
 * FINALIZE is only needed for video and large GIFs.
 */
export async function uploadXMediaV2(accessToken, base64, contentType = 'image/png') {
  const res = await fetch('https://api.x.com/2/media/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      media: base64,
      media_category: 'tweet_image',
      media_type: contentType,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 403) {
    return {
      ok: false,
      error:
        'X rejected the upload (403). The connected X token is missing the media.write scope — ' +
        'reconnect X from the Auto settings to re-authorize with it.',
    };
  }

  if (!res.ok) {
    const errMsg =
      data.errors?.[0]?.message || data.detail || data.title || `Media upload ${res.status}`;
    return { ok: false, error: errMsg };
  }

  const id = data.data?.id != null ? String(data.data.id) : null;
  if (!id) return { ok: false, error: 'No media id in X response' };
  return { ok: true, mediaId: id };
}

async function postTweetV2OAuth1(creds, text, mediaIds) {
  const url = `${TWITTER_API_BASE}/tweets`;
  const body =
    mediaIds && mediaIds.length
      ? { text: text.slice(0, 280), media: { media_ids: mediaIds } }
      : { text: text.slice(0, 280) };
  const authHeader = oauth1Sign('POST', url, creds);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.data?.id) {
    return { success: true, postId: data.data.id };
  }
  const errMsg = data.errors?.[0]?.message || data.detail || `Twitter API ${res.status}`;
  return { success: false, error: errMsg };
}

/**
 * Post a tweet.
 * @param {{ text: string, imageUrl?: string }} options
 * @param {string} accountId - e.g. 'personal'
 * @returns {{ success: true, postId: string } | { success: false, error: string }}
 */
export async function postToTwitter(options, accountId = 'personal') {
  const { text, imageUrl } = options || {};
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'text is required' };
  }

  const creds = getSocialCredentials('twitter', accountId);
  const trimmedUrl = imageUrl && String(imageUrl).trim() ? String(imageUrl).trim() : null;

  // Image posts go entirely through OAuth 2.0 now: upload to /2/media/upload
  // with the Connect X token, then post the tweet with the returned media id
  // using that same token. The OAuth 1.0a path is gone because the endpoint it
  // depended on is gone — X retired v1.1 media upload on 2025-06-09.
  //
  // If an image was intended, never fall through to a text-only tweet. A quote
  // card without its card is not the post, and silently posting the text is
  // what hid this failure for eight days.
  if (trimmedUrl) {
    const token = await getXAccessToken();
    if (!token.ok || !token.accessToken) {
      return { success: false, error: 'X image attach failed: no connected X account' };
    }

    const fetched = await fetchImageAsBase64(trimmedUrl);
    if (!fetched.ok) {
      return { success: false, error: `X image attach failed: ${fetched.error}` };
    }

    const up = await uploadXMediaV2(token.accessToken, fetched.base64, fetched.contentType);
    if (!up.ok) {
      return { success: false, error: `X image attach failed: ${up.error}` };
    }

    const res = await fetch(`${TWITTER_API_BASE}/tweets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.accessToken}`,
      },
      body: JSON.stringify({
        text: text.slice(0, 280),
        media: { media_ids: [up.mediaId] },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.data?.id) {
      return { success: true, postId: data.data.id };
    }
    const errMsg = data.errors?.[0]?.message || data.detail || `X API ${res.status}`;
    return { success: false, error: `Tweet with image failed: ${errMsg}` };
  }

  // OAuth 2.0 user token (Connect X)
  if (accountId === 'personal' || accountId === 'default' || accountId === 'x') {
    const token = await getXAccessToken();
    if (token.ok && token.accessToken) {
      const url = `${TWITTER_API_BASE}/tweets`;
      // Never append the image URL to the tweet body.
      //
      // trimmedUrl is a raw Supabase storage object, not an article link, so
      // appending it posted a meaningless CDN path as visible text. That is
      // what shipped on 2026-08-13 — "Management is doing things right.
      // Leadership is doing the right things. Drucker." followed by
      // cejecqtftkzyulzrtksx.supabase.co/storage/v1/obj… — and it was recorded
      // as a successful post.
      //
      // It never helped journal posts either: those read correctly because the
      // article URL is already inside the caption text. This only ever added
      // the header image's storage path on top of it.
      //
      // Unreachable today, since the `if (trimmedUrl)` block above always
      // returns. Removed rather than left in place, because a dead branch like
      // this comes back to life the next time that early return moves.
      const tweetText = text.slice(0, 280);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.accessToken}`,
        },
        body: JSON.stringify({ text: tweetText }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.data?.id) {
        return { success: true, postId: data.data.id };
      }
      const errMsg = data.errors?.[0]?.message || data.detail || `X API ${res.status}`;
      return { success: false, error: errMsg };
    }
  }

  if (!creds) {
    return { success: false, error: 'Twitter credentials not configured' };
  }

  return postTweetV2OAuth1(creds, text, []);
}
