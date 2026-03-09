/**
 * Instagram channel adapter: post to Business/Creator accounts (multiple accounts via env).
 * Two-step flow: create media container, then publish.
 */

import { getSocialCredentials } from './config.js';

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Post to Instagram (image required for feed post).
 * @param {{ text: string, imageUrl?: string }} options
 * @param {string} accountId - 'ig_<n>' or numeric id
 * @returns {{ success: true, postId: string } | { success: false, error: string }}
 */
export async function postToInstagram(options, accountId) {
  const { text, imageUrl } = options || {};
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'text is required' };
  }

  const creds = getSocialCredentials('instagram', accountId);
  if (!creds) {
    return { success: false, error: 'Instagram credentials not configured for this account' };
  }

  const igUserId = creds.igUserId;
  const token = creds.accessToken;
  const image = (imageUrl && imageUrl.trim()) || null;
  if (!image) {
    return { success: false, error: 'Instagram feed posts require an image (image_url)' };
  }

  const createRes = await fetch(
    `${GRAPH_BASE}/${igUserId}/media?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: image,
        caption: text
      })
    }
  );
  const createData = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    return { success: false, error: createData.error?.message || `Instagram media create ${createRes.status}` };
  }
  const containerId = createData.id;
  if (!containerId) {
    return { success: false, error: 'Instagram did not return a media container id' };
  }

  const publishRes = await fetch(
    `${GRAPH_BASE}/${igUserId}/media_publish?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId })
    }
  );
  const publishData = await publishRes.json().catch(() => ({}));
  if (!publishRes.ok) {
    return { success: false, error: publishData.error?.message || `Instagram publish ${publishRes.status}` };
  }
  const postId = publishData.id;
  return postId ? { success: true, postId } : { success: false, error: 'Instagram did not return post id' };
}
