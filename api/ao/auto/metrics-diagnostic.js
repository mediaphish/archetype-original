/**
 * GET /api/ao/auto/metrics-diagnostic
 *
 * Tests one post from each platform and returns the raw API response.
 * Used to diagnose why the analytics sync is returning 0 synced posts.
 * Never exposes tokens — all calls are server-side.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

const GRAPH_VERSION = 'v25.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const LINKEDIN_API_BASE = 'https://api.linkedin.com/rest';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Get one posted row per platform
  const { data: posts } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .select('id, platform, external_id, posted_at')
    .eq('status', 'posted')
    .not('external_id', 'is', null)
    .in('platform', ['facebook', 'instagram', 'linkedin'])
    .order('posted_at', { ascending: false })
    .limit(10);

  // Pick one per platform
  const byPlatform = {};
  for (const post of posts || []) {
    if (!byPlatform[post.platform]) byPlatform[post.platform] = post;
  }

  // Get Meta credentials
  const { data: metaRow } = await supabaseAdmin
    .from('ao_meta_tokens')
    .select('user_access_token, page_access_token, instagram_business_id, facebook_page_id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const results = {};

  // Test Facebook
  if (byPlatform.facebook && metaRow?.page_access_token) {
    const postId = byPlatform.facebook.external_id;
    const metrics = 'post_impressions,post_clicks,post_reactions_like_total,post_comments,post_shares';
    const url = `${GRAPH_BASE}/${postId}/insights?metric=${metrics}&access_token=${metaRow.page_access_token}`;
    try {
      const fbRes = await fetch(url);
      const fbJson = await fbRes.json().catch(() => ({}));
      results.facebook = {
        post_id: postId,
        status: fbRes.status,
        ok: fbRes.ok,
        response: fbJson,
      };
    } catch (err) {
      results.facebook = { post_id: postId, error: err.message };
    }
  } else {
    results.facebook = { skipped: !byPlatform.facebook ? 'no posted facebook post found' : 'no page token' };
  }

  // Test Instagram
  if (byPlatform.instagram && metaRow?.user_access_token) {
    const mediaId = byPlatform.instagram.external_id;
    const metrics = 'impressions,reach,likes,comments,shares,saved';
    const url = `${GRAPH_BASE}/${mediaId}/insights?metric=${metrics}&access_token=${metaRow.user_access_token}`;
    try {
      const igRes = await fetch(url);
      const igJson = await igRes.json().catch(() => ({}));
      results.instagram = {
        media_id: mediaId,
        status: igRes.status,
        ok: igRes.ok,
        response: igJson,
      };
    } catch (err) {
      results.instagram = { media_id: mediaId, error: err.message };
    }
  } else {
    results.instagram = { skipped: !byPlatform.instagram ? 'no posted instagram post found' : 'no user token' };
  }

  // Test LinkedIn
  if (byPlatform.linkedin) {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    if (token) {
      const postUrn = byPlatform.linkedin.external_id;
      const encodedUrn = encodeURIComponent(postUrn);
      const url = `${LINKEDIN_API_BASE}/socialActions/${encodedUrn}`;
      try {
        const liRes = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202401',
          },
        });
        const liJson = await liRes.json().catch(() => ({}));
        results.linkedin = {
          post_urn: postUrn,
          status: liRes.status,
          ok: liRes.ok,
          response: liJson,
        };
      } catch (err) {
        results.linkedin = { post_urn: postUrn, error: err.message };
      }
    } else {
      results.linkedin = { skipped: 'no LINKEDIN_ACCESS_TOKEN' };
    }
  } else {
    results.linkedin = { skipped: 'no posted linkedin post found' };
  }

  return res.status(200).json({
    ok: true,
    has_meta_tokens: !!metaRow,
    has_page_token: !!metaRow?.page_access_token,
    has_user_token: !!metaRow?.user_access_token,
    has_linkedin_token: !!process.env.LINKEDIN_ACCESS_TOKEN,
    results,
  });
}
