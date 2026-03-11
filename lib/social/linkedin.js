/**
 * LinkedIn channel adapter: post to personal profile or organization page.
 * Uses LinkedIn REST Posts API with X-Restli-Protocol-Version: 2.0.0.
 */

import { getSocialCredentials } from './config.js';
import { supabaseAdmin } from '../supabase-admin.js';
import { getLinkedinVersionHeaders } from './linkedinVersion.js';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/rest';

/**
 * Create a post on LinkedIn (personal or page).
 * @param {{ text: string, imageUrl?: string }} options
 * @param {string} accountId - 'personal' or 'page_<id>'
 * @returns {{ success: true, postId: string } | { success: false, error: string }}
 */
export async function postToLinkedIn(options, accountId = 'personal') {
  const { text, imageUrl } = options || {};
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'text is required' };
  }

  let creds = getSocialCredentials('linkedin', accountId);
  // For the AO owner console, allow personal posting via OAuth tokens stored server-side.
  if ((!creds || !creds.accessToken || !creds.personUrn) && accountId === 'personal') {
    try {
      const { data } = await supabaseAdmin
        .from('ao_linkedin_tokens')
        .select('access_token, person_urn')
        .limit(1)
        .maybeSingle();
      if (data?.access_token) {
        creds = {
          accessToken: data.access_token,
          personUrn: data.person_urn || null,
        };
      }
    } catch (_) {}
  }
  if (!creds || !creds.accessToken) {
    return { success: false, error: 'LinkedIn credentials not configured for this account' };
  }

  const author = creds.pageUrn || creds.personUrn;
  if (!author) {
    return { success: false, error: 'LinkedIn author URN (person or page) is required' };
  }

  const body = {
    author,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: []
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false
  };

  // If image provided, add media. Note: LinkedIn Posts API may require uploading
  // the image via Assets/Images API first and passing the returned URN here.
  if (imageUrl && imageUrl.trim()) {
    body.content = {
      media: {
        title: 'Image',
        status: 'READY',
        media: imageUrl.trim()
      }
    };
  }

  const res = await fetch(`${LINKEDIN_API_BASE}/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${creds.accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
      ...getLinkedinVersionHeaders(),
    },
    body: JSON.stringify(body)
  });

  const postId = res.headers.get('x-restli-id') || res.headers.get('X-Restli-Id');
  if (res.ok && postId) {
    return { success: true, postId };
  }

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
