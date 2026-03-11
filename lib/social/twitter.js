/**
 * Twitter/X channel adapter: post tweet via API v2.
 * Uses OAuth 1.0a credentials (API Key, API Secret, Access Token, Access Token Secret).
 */

import crypto from 'crypto';
import { getSocialCredentials } from './config.js';
import { getXAccessToken } from './xConnection.js';

const TWITTER_API_BASE = 'https://api.twitter.com/2';

/**
 * Create OAuth 1.0a signature and Authorization header for POST /2/tweets.
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
  const header = 'OAuth ' + Object.keys(oauth).sort().map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauth[k])}"`).join(', ');
  return header;
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

  // Preferred: OAuth 2.0 user token stored server-side via "Connect X" in /ao/settings.
  if (accountId === 'personal' || accountId === 'default' || accountId === 'x') {
    const token = await getXAccessToken();
    if (token.ok && token.accessToken) {
      const url = `${TWITTER_API_BASE}/tweets`;
      const body = { text: text.slice(0, 280) };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.accessToken}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.data?.id) {
        return { success: true, postId: data.data.id };
      }
      const errMsg = data.errors?.[0]?.message || data.detail || `X API ${res.status}`;
      return { success: false, error: errMsg };
    }
  }

  const creds = getSocialCredentials('twitter', accountId);
  if (!creds) {
    return { success: false, error: 'Twitter credentials not configured' };
  }

  const url = `${TWITTER_API_BASE}/tweets`;
  const body = { text: text.slice(0, 280) };
  if (imageUrl && imageUrl.trim()) {
    // Media upload is a separate API; for simplicity we only support text here.
    // To add image: upload media first, get media_id_string, then add to body.media.media_ids
  }

  const authHeader = await oauth1Sign('POST', url, body, creds);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (res.ok && data.data?.id) {
    return { success: true, postId: data.data.id };
  }
  const errMsg = data.errors?.[0]?.message || data.detail || `Twitter API ${res.status}`;
  return { success: false, error: errMsg };
}
