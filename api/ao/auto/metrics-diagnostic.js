/**
 * GET /api/ao/auto/metrics-diagnostic
 *
 * Tests one post from each platform using the SAME endpoints/token sources as
 * api/cron/ao/sync-post-metrics.js. Never exposes tokens.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { scheduledPosts } from '../../../lib/db/scheduledPosts.js';
import {
  fetchFacebookPostMetrics,
  fetchInstagramMediaMetrics,
  fetchLinkedInPostMetrics,
  fetchTwitterPostMetrics,
} from '../../cron/ao/sync-post-metrics.js';
import { getXAccessToken } from '../../../lib/social/xConnection.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { data: posts } = await scheduledPosts()
    .select('id, platform, external_id, posted_at')
    .eq('status', 'posted')
    .not('external_id', 'is', null)
    .in('platform', ['facebook', 'instagram', 'linkedin', 'twitter'])
    .order('posted_at', { ascending: false })
    .limit(20);

  const byPlatform = {};
  for (const post of posts || []) {
    if (!byPlatform[post.platform]) byPlatform[post.platform] = post;
  }

  const { data: metaRow } = await supabaseAdmin
    .from('ao_meta_tokens')
    .select('user_access_token, page_access_token, instagram_business_id, facebook_page_id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: linkedInRow } = await supabaseAdmin
    .from('ao_linkedin_tokens')
    .select('access_token, person_urn')
    .limit(1)
    .maybeSingle();

  let xToken = null;
  let xTokenError = null;
  try {
    const x = await getXAccessToken();
    if (x?.ok) xToken = x.accessToken;
    else xTokenError = x?.error || 'X not connected';
  } catch (err) {
    xTokenError = err?.message || String(err);
  }

  const results = {};

  if (byPlatform.facebook && metaRow?.page_access_token) {
    const post = byPlatform.facebook;
    const out = await fetchFacebookPostMetrics(post.external_id, metaRow.page_access_token);
    results.facebook = {
      post_id: post.external_id,
      scheduled_post_id: post.id,
      ok: out.ok,
      error: out.ok ? null : out.error,
      metrics: out.ok ? out.metrics : null,
    };
  } else {
    results.facebook = {
      skipped: !byPlatform.facebook ? 'no posted facebook post found' : 'no page token in ao_meta_tokens',
    };
  }

  if (byPlatform.instagram && metaRow?.user_access_token) {
    const post = byPlatform.instagram;
    const out = await fetchInstagramMediaMetrics(post.external_id, metaRow.user_access_token);
    results.instagram = {
      media_id: post.external_id,
      scheduled_post_id: post.id,
      ok: out.ok,
      error: out.ok ? null : out.error,
      metrics: out.ok ? out.metrics : null,
    };
  } else {
    results.instagram = {
      skipped: !byPlatform.instagram
        ? 'no posted instagram post found'
        : 'no user token in ao_meta_tokens',
    };
  }

  if (byPlatform.linkedin) {
    if (linkedInRow?.access_token) {
      const post = byPlatform.linkedin;
      const out = await fetchLinkedInPostMetrics(post.external_id, linkedInRow.access_token);
      results.linkedin = {
        post_urn: post.external_id,
        scheduled_post_id: post.id,
        ok: out.ok,
        error: out.ok ? null : out.error,
        metrics: out.ok ? out.metrics : null,
      };
    } else {
      results.linkedin = { skipped: 'no access_token in ao_linkedin_tokens' };
    }
  } else {
    results.linkedin = { skipped: 'no posted linkedin post found' };
  }

  if (byPlatform.twitter) {
    if (xToken) {
      const post = byPlatform.twitter;
      const out = await fetchTwitterPostMetrics(post.external_id, xToken);
      results.twitter = {
        tweet_id: post.external_id,
        scheduled_post_id: post.id,
        ok: out.ok,
        error: out.ok ? null : out.error,
        metrics: out.ok ? out.metrics : null,
      };
    } else {
      results.twitter = { skipped: xTokenError || 'X not connected' };
    }
  } else {
    results.twitter = { skipped: 'no posted twitter post found' };
  }

  // Recent stored sync_errors (queryable visibility from the new column)
  const { data: errorRows } = await supabaseAdmin
    .from('ao_scheduled_post_metrics')
    .select('platform, sync_error, synced_at, scheduled_post_id')
    .not('sync_error', 'is', null)
    .order('synced_at', { ascending: false })
    .limit(12);

  return res.status(200).json({
    ok: true,
    has_meta_tokens: !!metaRow,
    has_page_token: !!metaRow?.page_access_token,
    has_user_token: !!metaRow?.user_access_token,
    has_linkedin_token: !!linkedInRow?.access_token,
    has_twitter_token: !!xToken,
    recent_sync_errors: errorRows || [],
    results,
  });
}
