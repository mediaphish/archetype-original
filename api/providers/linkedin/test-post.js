/**
 * AO Automation — LinkedIn personal posting test.
 * POST /api/providers/linkedin/test-post
 * Uses stored OAuth token, resolves member author URN, creates a plain-text test post.
 * Owner-only; server-side only; no token exposure.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

const LINKEDIN_REST_BASE = 'https://api.linkedin.com/rest';
const LINKEDIN_V2_BASE = 'https://api.linkedin.com/v2';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const TEST_POST_BODY = 'Testing LinkedIn API connection from AO Automation.';

/**
 * Get member author URN using stored access token.
 * Tries REST /me first, then v2 /me; returns urn:li:person:{id} or null.
 */
async function getMemberUrn(accessToken) {
  // Best: OpenID userinfo -> sub
  try {
    const ui = await fetch(LINKEDIN_USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (ui.ok) {
      const data = await ui.json().catch(() => ({}));
      const sub = data.sub;
      if (sub) return sub.startsWith('urn:') ? sub : `urn:li:person:${sub}`;
    }
  } catch (_) {}

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202401',
  };

  // Try REST /me (may work with w_member_social)
  const restRes = await fetch(`${LINKEDIN_REST_BASE}/me`, { headers });
  if (restRes.ok) {
    const data = await restRes.json().catch(() => ({}));
    const id = data.id || data.sub;
    if (id) {
      const urn = id.startsWith('urn:') ? id : `urn:li:person:${id}`;
      return urn;
    }
  }

  // Fallback: v2 /me (often requires openid/profile)
  const v2Res = await fetch(`${LINKEDIN_V2_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (v2Res.ok) {
    const data = await v2Res.json().catch(() => ({}));
    const id = data.id;
    if (id) {
      const urn = id.startsWith('urn:') ? id : `urn:li:person:${id}`;
      return urn;
    }
  }

  return null;
}

/**
 * Create a plain-text post on the member's profile.
 */
async function createPost(accessToken, authorUrn) {
  const body = {
    author: authorUrn,
    commentary: TEST_POST_BODY,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  const res = await fetch(`${LINKEDIN_REST_BASE}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
    },
    body: JSON.stringify(body),
  });

  const postId = res.headers.get('x-restli-id') || res.headers.get('X-Restli-Id');
  if (res.ok && postId) return { success: true, postId };

  let errMsg = `LinkedIn API ${res.status}`;
  try {
    const data = await res.json();
    if (data.message) errMsg = data.message;
    else if (data.error?.message) errMsg = data.error.message;
  } catch (_) {
    const t = await res.text();
    if (t) errMsg = t.slice(0, 300);
  }
  return { success: false, error: errMsg };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const auth = requireAoSession(req, res);
  if (!auth) return;

  try {
    const { data: row, error: fetchError } = await supabaseAdmin
      .from('ao_linkedin_tokens')
      .select('id, access_token, person_urn')
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('[LinkedIn test-post] Token fetch error:', fetchError.message);
      return res.status(500).json({ success: false, error: 'Failed to load LinkedIn connection' });
    }

    if (!row?.access_token) {
      return res.status(400).json({ success: false, error: 'LinkedIn not connected. Connect your account in Settings first.' });
    }

    const accessToken = row.access_token;

    let authorUrn = row.person_urn || null;
    if (!authorUrn) {
      authorUrn = await getMemberUrn(accessToken);
      if (authorUrn) {
        // Best effort: persist for future use
        try {
          await supabaseAdmin
            .from('ao_linkedin_tokens')
            .update({ person_urn: authorUrn, updated_at: new Date().toISOString() })
            .eq('id', row.id);
        } catch (_) {}
      }
    }
    if (!authorUrn && process.env.LINKEDIN_PERSON_URN) {
      authorUrn = process.env.LINKEDIN_PERSON_URN.trim();
    }
    if (!authorUrn) {
      console.warn('[LinkedIn test-post] Could not resolve member URN (me endpoint may require openid scope)');
      return res.status(400).json({
        success: false,
        error: 'Could not identify connected member. In LinkedIn app settings, enable Sign In with LinkedIn (OpenID) and reconnect on /ao/settings, or set LINKEDIN_PERSON_URN and retry.',
      });
    }

    const postResult = await createPost(accessToken, authorUrn);

    if (postResult.success) {
      console.log('[LinkedIn test-post] Test post published, postId:', postResult.postId);
      return res.status(200).json({
        success: true,
        postId: postResult.postId,
      });
    }

    console.warn('[LinkedIn test-post] Post failed:', postResult.error);
    return res.status(200).json({
      success: false,
      error: postResult.error,
    });
  } catch (err) {
    console.error('[LinkedIn test-post] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'LinkedIn test post failed',
    });
  }
}
