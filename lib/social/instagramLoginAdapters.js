/**
 * Instagram API with Instagram Login — publish adapters.
 * Same container-create -> wait -> publish shape as lib/social/metaAdapters.js, but against
 * graph.instagram.com (no linked Facebook Page required).
 *
 * GRAPH_BASE uses v25.0 — confirmed against Meta docs (July 2026): content-publishing
 * examples on developers.facebook.com use graph.instagram.com/v25.0/.../media.
 * Host remains graph.instagram.com (not graph.facebook.com).
 */

const GRAPH_BASE = 'https://graph.instagram.com/v25.0';
const INSTAGRAM_DELAY_MS = 5000;
const INSTAGRAM_MAX_RETRIES = 3;

export async function createInstagramLoginContainer(params, creds) {
  const { token, igUserId } = creds || {};
  if (!token || !igUserId) {
    return { success: false, error: 'Instagram Login token and igUserId required' };
  }
  const { image_url, caption } = params || {};
  if (!image_url || !caption) {
    return { success: false, error: 'image_url and caption required' };
  }
  const url = `${GRAPH_BASE}/${igUserId}/media?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: image_url.trim(), caption: caption.trim() })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, error: data.error?.message || `Instagram Login media ${res.status}` };
  }
  const creationId = data.id;
  if (!creationId) return { success: false, error: 'No creation_id returned' };
  return { success: true, creation_id: creationId };
}

export async function publishInstagramLoginContainer(creationId, creds) {
  const { token, igUserId } = creds || {};
  if (!token || !igUserId) {
    return { success: false, error: 'Instagram Login token and igUserId required' };
  }
  if (!creationId) return { success: false, error: 'creation_id required' };
  const url = `${GRAPH_BASE}/${igUserId}/media_publish?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, error: data.error?.message || `Instagram Login publish ${res.status}` };
  }
  const postId = data.id;
  return postId ? { success: true, postId } : { success: false, error: 'No post id returned' };
}

export async function postToInstagramLogin(options, creds) {
  const { text, imageUrl } = options || {};
  if (!text || !imageUrl) {
    return { success: false, error: 'text and imageUrl required for Instagram' };
  }
  const createResult = await createInstagramLoginContainer({ image_url: imageUrl, caption: text }, creds);
  if (!createResult.success) return { success: false, error: createResult.error };
  const creationId = createResult.creation_id;

  await new Promise((r) => setTimeout(r, INSTAGRAM_DELAY_MS));

  for (let attempt = 0; attempt < INSTAGRAM_MAX_RETRIES; attempt++) {
    const publishResult = await publishInstagramLoginContainer(creationId, creds);
    if (publishResult.success) return { success: true, postId: publishResult.postId };
    const notReady = /not ready|still processing|invalid creation_id/i.test(publishResult.error || '');
    if (!notReady) return { success: false, error: publishResult.error };
    if (attempt < INSTAGRAM_MAX_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    } else {
      return { success: false, error: publishResult.error || 'Container not ready after retries' };
    }
  }
  return { success: false, error: 'Publish failed' };
}

/** Shared base for first-comment and other graph.instagram.com calls. */
export { GRAPH_BASE as INSTAGRAM_LOGIN_GRAPH_BASE };
