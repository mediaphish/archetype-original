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

  // Fallback to ao_linkedin_tokens for personal posts
  if ((!creds || !creds.accessToken) && accountId === 'personal') {
    try {
      const { data } = await supabaseAdmin
        .from('ao_linkedin_tokens')
        .select('access_token, person_urn, page_urn')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.access_token) {
        creds = {
          accessToken: data.access_token,
          personUrn: data.person_urn || null,
          pageUrn: data.page_urn || null,
        };
      }
    } catch (_) {}
  }

  // Fallback to ao_linkedin_tokens for business page posts
  // page_1 = Archetype Original LinkedIn company page
  if ((!creds || !creds.accessToken) && (accountId === 'page_1' || accountId === 'linkedin_business')) {
    try {
      const { data } = await supabaseAdmin
        .from('ao_linkedin_tokens')
        .select('access_token, page_urn')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.access_token && data?.page_urn) {
        creds = {
          accessToken: data.access_token,
          pageUrn: data.page_urn,
        };
      }
    } catch (_) {}
  }

  if (!creds || !creds.accessToken) {
    return { success: false, error: 'LinkedIn credentials not configured for this account' };
  }

  // Select the author URN based on which account was actually requested.
  // Do not prefer pageUrn blanket — that caused personal posts to be authored
  // as the organization page whenever both URNs existed on the same token row,
  // triggering "Organization Or Events permissions" errors on personal posts.
  const isPageAccount = accountId === 'page_1' || accountId === 'linkedin_business';
  const author = isPageAccount
    ? (creds.pageUrn || creds.personUrn)
    : (creds.personUrn || creds.pageUrn);

  if (!author) {
    return { success: false, error: 'LinkedIn author URN (person or page) is required' };
  }

  if (isPageAccount && !creds.pageUrn) {
    console.warn('[LinkedIn] Page account requested but no pageUrn found — falling back to personUrn. This will likely fail if the page requires organization authorship.');
  }
  if (!isPageAccount && !creds.personUrn) {
    console.warn('[LinkedIn] Personal account requested but no personUrn found — falling back to pageUrn. This will cause an organization-permissions error if LinkedIn expects a person as author.');
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
    try {
      // Step 1: Download the image from Supabase storage
      const imgRes = await fetch(imageUrl.trim());
      if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
      const imgBuffer = await imgRes.arrayBuffer();
      const imgBytes = Buffer.from(imgBuffer);
      const contentType = imgRes.headers.get('content-type') || 'image/png';

      // Step 2: Initialize the image upload with LinkedIn
      const initRes = await fetch(`${LINKEDIN_API_BASE}/images?action=initializeUpload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
          ...getLinkedinVersionHeaders(),
        },
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: author,
          },
        }),
      });

      if (!initRes.ok) {
        const errText = await initRes.text();
        throw new Error(`LinkedIn image init failed: ${errText.slice(0, 200)}`);
      }

      const initData = await initRes.json();
      const uploadUrl = initData?.value?.uploadUrl;
      const imageUrn = initData?.value?.image;

      if (!uploadUrl || !imageUrn) {
        throw new Error('LinkedIn did not return uploadUrl or image URN');
      }

      // Step 3: Upload the image bytes
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Content-Type': contentType,
        },
        body: imgBytes,
      });

      if (!uploadRes.ok) {
        throw new Error(`LinkedIn image upload failed: ${uploadRes.status}`);
      }

      // Step 4: Attach the image URN to the post body
      body.content = {
        media: {
          id: imageUrn,
        },
      };
    } catch (imgErr) {
      console.warn('[LinkedIn] Image upload failed, posting text only:', imgErr.message);
      // Fall through and post without image rather than failing the whole post
    }
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
