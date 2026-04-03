/**
 * Twitter/X channel adapter: post tweet via API v2.
 * Uses OAuth 2.0 user token (Connect X) when available; otherwise OAuth 1.0a
 * (API Key, API Secret, Access Token, Access Token Secret).
 * Images: OAuth 1.0a uploads media (v1.1), then posts v2 tweet with media_ids.
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
  return { ok: true, base64: buf.toString('base64') };
}

/**
 * Simple image upload (v1.1). media_data is not part of the OAuth signature.
 */
async function uploadTwitterMediaOAuth1(creds, base64) {
  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
  const authHeader = oauth1Sign('POST', uploadUrl, creds);
  const body = new URLSearchParams({ media_data: base64 });
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data.errors?.[0]?.message || data.error || `Media upload ${res.status}`;
    return { ok: false, error: errMsg };
  }
  const id = data.media_id_string != null ? String(data.media_id_string) : data.media_id != null ? String(data.media_id) : null;
  if (!id) return { ok: false, error: 'No media id from X' };
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

  // Image posts need OAuth 1.0a (media upload + v2 tweet with media_ids).
  if (trimmedUrl && creds) {
    const fetched = await fetchImageAsBase64(trimmedUrl);
    if (fetched.ok) {
      const up = await uploadTwitterMediaOAuth1(creds, fetched.base64);
      if (up.ok) {
        const posted = await postTweetV2OAuth1(creds, text, [up.mediaId]);
        if (posted.success) return posted;
        return { success: false, error: posted.error || 'Tweet with image failed' };
      }
    }
    // Fall through: OAuth2 text + link, or OAuth1 text-only
  }

  // OAuth 2.0 user token (Connect X)
  if (accountId === 'personal' || accountId === 'default' || accountId === 'x') {
    const token = await getXAccessToken();
    if (token.ok && token.accessToken) {
      const url = `${TWITTER_API_BASE}/tweets`;
      let tweetText = text.slice(0, 280);
      if (trimmedUrl && tweetText.length < 280) {
        const withLink = `${tweetText}\n${trimmedUrl}`.trim();
        tweetText = withLink.slice(0, 280);
      }
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
