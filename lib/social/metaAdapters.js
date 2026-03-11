/**
 * Meta Graph API v25.0 adapters for Instagram and Facebook.
 *
 * These helpers can accept explicit credentials (preferred) so the AO console
 * can use the stored Meta connection instead of relying on environment values.
 */

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';
const INSTAGRAM_DELAY_MS = 5000;
const INSTAGRAM_MAX_RETRIES = 3;

function getMetaToken(creds) {
  return (creds?.token || '').trim() || process.env.META_ACCESS_TOKEN;
}
function getInstagramBusinessId(creds) {
  return (creds?.igUserId || '').trim() || process.env.INSTAGRAM_BUSINESS_ID;
}
function getFacebookPageId(creds) {
  return (creds?.pageId || '').trim() || process.env.FACEBOOK_PAGE_ID;
}

/**
 * Create Instagram media container.
 * POST /{ig-user-id}/media with image_url, caption.
 * @param {{ image_url: string, caption: string }} params
 * @returns {Promise<{ success: boolean, creation_id?: string, error?: string }>}
 */
export async function createInstagramContainer(params, creds) {
  const token = getMetaToken(creds);
  const igUserId = getInstagramBusinessId(creds);
  if (!token || !igUserId) {
    return { success: false, error: 'META_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ID required' };
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
    return { success: false, error: data.error?.message || `Instagram media ${res.status}` };
  }
  const creationId = data.id;
  if (!creationId) return { success: false, error: 'No creation_id returned' };
  return { success: true, creation_id: creationId };
}

/**
 * Publish Instagram container.
 * POST /{ig-user-id}/media_publish with creation_id.
 * @param {string} creationId - from createInstagramContainer
 * @returns {Promise<{ success: boolean, postId?: string, error?: string }>}
 */
export async function publishInstagramContainer(creationId, creds) {
  const token = getMetaToken(creds);
  const igUserId = getInstagramBusinessId(creds);
  if (!token || !igUserId) {
    return { success: false, error: 'META_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ID required' };
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
    return { success: false, error: data.error?.message || `Instagram publish ${res.status}` };
  }
  const postId = data.id;
  return postId ? { success: true, postId } : { success: false, error: 'No post id returned' };
}

/**
 * Post to Instagram: create container, wait 5s, publish. Retry up to 3 times if container not ready.
 * @param {{ text: string, imageUrl: string }} options
 * @returns {Promise<{ success: true, postId: string } | { success: false, error: string }>}
 */
export async function postToInstagramMeta(options, creds) {
  const { text, imageUrl } = options || {};
  if (!text || !imageUrl) {
    return { success: false, error: 'text and imageUrl required for Instagram' };
  }

  let creationId;
  const createResult = await createInstagramContainer(
    {
    image_url: imageUrl,
    caption: text
    },
    creds
  );
  if (!createResult.success) return { success: false, error: createResult.error };
  creationId = createResult.creation_id;

  await new Promise((r) => setTimeout(r, INSTAGRAM_DELAY_MS));

  for (let attempt = 0; attempt < INSTAGRAM_MAX_RETRIES; attempt++) {
    const publishResult = await publishInstagramContainer(creationId, creds);
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

/**
 * Post photo to Facebook Page.
 * POST /{page-id}/photos with url, caption.
 * @param {{ url: string, caption: string }} params
 * @returns {Promise<{ success: boolean, postId?: string, error?: string }>}
 */
export async function postToFacebookPage(params) {
  const token = getMetaToken();
  const pageId = getFacebookPageId();
  if (!token || !pageId) {
    return { success: false, error: 'META_ACCESS_TOKEN and FACEBOOK_PAGE_ID required' };
  }
  const { url, caption } = params || {};

  // If url is provided, publish a photo post. Otherwise publish a text-only feed post.
  if (!url || !String(url).trim()) {
    const feedUrl = `${GRAPH_BASE}/${pageId}/feed?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(feedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: (caption || '').trim() || 'AO Automation test post' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error?.message || `Facebook feed ${res.status}` };
    }
    const postId = data.id;
    return postId ? { success: true, postId } : { success: false, error: 'No post id returned' };
  }

  const body = { url: String(url).trim() };
  if (caption) body.caption = String(caption).trim();

  const apiUrl = `${GRAPH_BASE}/${pageId}/photos?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, error: data.error?.message || `Facebook photos ${res.status}` };
  }
  const postId = data.id;
  return postId ? { success: true, postId } : { success: false, error: 'No post id returned' };
}
