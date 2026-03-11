/**
 * Facebook channel adapter: post to Page (photos API or feed) or Group feed.
 * Uses Meta Graph API v25.0. When META_ACCESS_TOKEN + FACEBOOK_PAGE_ID are set,
 * uses POST /{page-id}/photos with url and caption.
 */

import { getSocialCredentials } from './config.js';
import { validateImageForPublish } from './imageValidation.js';
import { getMetaConnection } from './metaConnection.js';

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';

/**
 * Post to a Facebook Page or Group.
 * @param {{ text: string, imageUrl?: string }} options
 * @param {string} accountId - 'meta' | 'page_<id>' or 'group_<id>'
 * @returns {{ success: true, postId: string } | { success: false, error: string }}
 */
export async function postToFacebook(options, accountId) {
  const { text, imageUrl } = options || {};
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'text is required' };
  }

  if (accountId === 'meta' || accountId === 'default' || accountId === 'page_meta') {
    const meta = await getMetaConnection();
    if (meta?.token && meta?.pageId) {
      const url = (imageUrl && imageUrl.trim()) || null;
      if (url) {
        const validation = await validateImageForPublish(url);
        if (!validation.valid) return { success: false, error: validation.error };
      }
      return postToPage(meta.token, meta.pageId, text, url || undefined);
    }
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
  if (imageUrl && imageUrl.trim()) {
    const url = `${GRAPH_BASE}/${pageId}/photos?access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl.trim(), caption: message })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) return { success: true, postId: data.id };
    return { success: false, error: data.error?.message || `Facebook API ${res.status}` };
  }
  const feedUrl = `${GRAPH_BASE}/${pageId}/feed?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(feedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.id) return { success: true, postId: data.id };
  return { success: false, error: data.error?.message || `Facebook API ${res.status}` };
}

async function postToGroup(accessToken, groupId, message, imageUrl) {
  const url = `${GRAPH_BASE}/${groupId}/feed`;
  const body = { message };
  if (imageUrl && imageUrl.trim()) body.link = imageUrl.trim();
  const res = await fetch(`${url}?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.id) return { success: true, postId: data.id };
  return { success: false, error: data.error?.message || `Facebook API ${res.status}` };
}
