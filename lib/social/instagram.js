/**
 * Instagram channel adapter: post to Business/Creator accounts.
 * Uses Meta Graph API v25.0. When META_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ID are set,
 * uses createInstagramContainer → 5s delay → publishInstagramContainer with up to 3 retries.
 */

import { getSocialCredentials } from './config.js';
import { postToInstagramMeta } from './metaAdapters.js';
import { validateImageForPublish } from './imageValidation.js';
import { getMetaConnection } from './metaConnection.js';

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';

/**
 * Post to Instagram (image required for feed post).
 * @param {{ text: string, imageUrl?: string }} options
 * @param {string} accountId - 'meta' | 'ig_<n>' or numeric id
 * @returns {{ success: true, postId: string } | { success: false, error: string }}
 */
export async function postToInstagram(options, accountId) {
  const { text, imageUrl } = options || {};
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'text is required' };
  }

  const image = (imageUrl && imageUrl.trim()) || null;
  if (!image) {
    return { success: false, error: 'Instagram feed posts require an image (image_url)' };
  }

  const validation = await validateImageForPublish(image);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  if (accountId === 'meta' || accountId === 'default' || accountId === 'ig_meta') {
    const meta = await getMetaConnection();
    if (meta?.token && meta?.igBusinessId) {
      return postToInstagramMeta(
        { text, imageUrl: image },
        { token: meta.token, igUserId: meta.igBusinessId }
      );
    }
  }

  const creds = getSocialCredentials('instagram', accountId);
  if (!creds) {
    return { success: false, error: 'Instagram credentials not configured for this account' };
  }

  const igUserId = creds.igUserId;
  const token = creds.accessToken;

  const createRes = await fetch(
    `${GRAPH_BASE}/${igUserId}/media?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: image, caption: text })
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

  await new Promise((r) => setTimeout(r, 5000));

  for (let attempt = 0; attempt < 3; attempt++) {
    const publishRes = await fetch(
      `${GRAPH_BASE}/${igUserId}/media_publish?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerId })
      }
    );
    const publishData = await publishRes.json().catch(() => ({}));
    if (publishRes.ok && publishData.id) {
      return { success: true, postId: publishData.id };
    }
    const notReady = /not ready|still processing|invalid creation_id/i.test(publishData.error?.message || '');
    if (!notReady) {
      return { success: false, error: publishData.error?.message || `Instagram publish ${publishRes.status}` };
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
  }
  return { success: false, error: 'Container not ready after retries' };
}
