/**
 * Facebook channel adapter: post to Page feed or Group feed.
 * Personal feed posting is not supported (deprecated by Facebook).
 */

import { getSocialCredentials } from './config.js';

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Post to a Facebook Page or Group.
 * @param {{ text: string, imageUrl?: string }} options
 * @param {string} accountId - 'page_<id>' or 'group_<id>'
 * @returns {{ success: true, postId: string } | { success: false, error: string }}
 */
export async function postToFacebook(options, accountId) {
  const { text, imageUrl } = options || {};
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'text is required' };
  }

  const creds = getSocialCredentials('facebook', accountId);
  if (!creds) {
    return { success: false, error: 'Facebook credentials not configured for this account' };
  }

  if (creds.pageId) {
    return postToPage(creds.accessToken, creds.pageId, text, imageUrl);
  }
  if (creds.groupId) {
    return postToGroup(creds.accessToken, creds.groupId, text, imageUrl);
  }
  return { success: false, error: 'Facebook page or group ID not configured' };
}

async function postToPage(accessToken, pageId, message, imageUrl) {
  const url = `${GRAPH_BASE}/${pageId}/feed`;
  const body = { message };
  if (imageUrl && imageUrl.trim()) {
    body.link = imageUrl.trim();
  }
  const res = await fetch(`${url}?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (res.ok && data.id) {
    return { success: true, postId: data.id };
  }
  const errMsg = data.error?.message || `Facebook API ${res.status}`;
  return { success: false, error: errMsg };
}

async function postToGroup(accessToken, groupId, message, imageUrl) {
  const url = `${GRAPH_BASE}/${groupId}/feed`;
  const body = { message };
  if (imageUrl && imageUrl.trim()) {
    body.link = imageUrl.trim();
  }
  const res = await fetch(`${url}?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (res.ok && data.id) {
    return { success: true, postId: data.id };
  }
  const errMsg = data.error?.message || `Facebook API ${res.status}`;
  return { success: false, error: errMsg };
}
