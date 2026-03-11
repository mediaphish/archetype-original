/**
 * Publish first comment (or reply) on an existing post per platform.
 * Called by the publisher after the main post succeeds. Uses same credentials as the post.
 * @returns {{ success: boolean, error?: string }}
 */

import { getSocialCredentials } from './config.js';
import crypto from 'crypto';

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';
const LINKEDIN_API_BASE = 'https://api.linkedin.com/rest';
const TWITTER_API_BASE = 'https://api.twitter.com/2';

/**
 * Facebook Page: POST /{page_post_id}/comments with message.
 * externalId is the post id from /photos or /feed.
 */
async function firstCommentFacebook(accountId, externalId, text) {
  const creds = getSocialCredentials('facebook', accountId);
  if (!creds || !creds.accessToken) {
    return { success: false, error: 'Facebook credentials not configured' };
  }
  const url = `${GRAPH_BASE}/${externalId}/comments?access_token=${encodeURIComponent(creds.accessToken)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text })
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.id) return { success: true };
  return { success: false, error: data.error?.message || `Facebook comments API ${res.status}` };
}

/**
 * Instagram: POST /{ig_media_id}/comments with message.
 * Requires instagram_manage_comments permission; if missing, API will error.
 */
async function firstCommentInstagram(accountId, externalId, text) {
  const creds = getSocialCredentials('instagram', accountId);
  if (!creds || !creds.accessToken) {
    return { success: false, error: 'Instagram credentials not configured' };
  }
  const url = `${GRAPH_BASE}/${externalId}/comments?access_token=${encodeURIComponent(creds.accessToken)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text })
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.id) return { success: true };
  return { success: false, error: data.error?.message || `Instagram comments API ${res.status}` };
}

/**
 * LinkedIn: POST /socialActions/{shareUrn}/comments.
 * externalId from x-restli-id may be numeric; share URN is urn:li:share:{id}.
 */
async function firstCommentLinkedIn(accountId, externalId, text) {
  const creds = getSocialCredentials('linkedin', accountId);
  if (!creds || !creds.accessToken) {
    return { success: false, error: 'LinkedIn credentials not configured' };
  }
  const shareUrn = externalId.startsWith('urn:') ? externalId : `urn:li:share:${externalId}`;
  const actor = creds.pageUrn || creds.personUrn;
  if (!actor) {
    return { success: false, error: 'LinkedIn author URN required for comment' };
  }
  const url = `${LINKEDIN_API_BASE}/socialActions/${encodeURIComponent(shareUrn)}/comments`;
  const body = {
    actor,
    object: shareUrn,
    message: { text }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${creds.accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401'
    },
    body: JSON.stringify(body)
  });
  if (res.ok) return { success: true };
  let errMsg = `LinkedIn API ${res.status}`;
  try {
    const data = await res.json();
    if (data.message) errMsg = data.message;
    else if (data.error?.message) errMsg = data.error.message;
  } catch (_) {
    const t = await res.text();
    if (t) errMsg = t.slice(0, 200);
  }
  return { success: false, error: errMsg };
}

/**
 * X (Twitter): POST /2/tweets with reply.in_reply_to_tweet_id.
 */
function oauth1Sign(method, url, body, credentials) {
  const oauth = {
    oauth_consumer_key: credentials.apiKey,
    oauth_token: credentials.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: Math.random().toString(36).slice(2) + Date.now().toString(36),
    oauth_version: '1.0'
  };
  const params = { ...oauth };
  const sortedKeys = Object.keys(params).sort();
  const paramStr = sortedKeys.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`;
  const signingKey = `${encodeURIComponent(credentials.apiSecret)}&${encodeURIComponent(credentials.accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(base).digest('base64');
  oauth.oauth_signature = signature;
  return 'OAuth ' + Object.keys(oauth).sort().map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauth[k])}"`).join(', ');
}

async function firstCommentTwitter(accountId, externalId, text) {
  const creds = getSocialCredentials('twitter', accountId);
  if (!creds) {
    return { success: false, error: 'Twitter credentials not configured' };
  }
  const url = `${TWITTER_API_BASE}/tweets`;
  const body = {
    text: text.slice(0, 280),
    reply: { in_reply_to_tweet_id: externalId }
  };
  const authHeader = oauth1Sign('POST', url, body, creds);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.data?.id) return { success: true };
  const errMsg = data.errors?.[0]?.message || data.detail || `Twitter API ${res.status}`;
  return { success: false, error: errMsg };
}

const FIRST_COMMENT_HANDLERS = {
  facebook: firstCommentFacebook,
  instagram: firstCommentInstagram,
  linkedin: firstCommentLinkedIn,
  twitter: firstCommentTwitter
};

/**
 * Publish first comment on the given post. Call only when supportsFirstComment(platform) and text is non-empty.
 * @param {string} platform - linkedin | facebook | instagram | twitter
 * @param {string} accountId - same as used for the main post
 * @param {string} externalId - post id from the platform (page post id, ig media id, share id, tweet id)
 * @param {string} text - first comment body
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function publishFirstComment(platform, accountId, externalId, text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { success: false, error: 'First comment text is required' };
  }
  const p = (platform || '').toLowerCase();
  const fn = FIRST_COMMENT_HANDLERS[p];
  if (!fn) {
    return { success: false, error: `First comment not supported for platform: ${platform}` };
  }
  try {
    return await fn(accountId, externalId, text.trim());
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}
