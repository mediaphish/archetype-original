/**
 * Cron: sync post engagement metrics from Facebook, Instagram, LinkedIn.
 * POST /api/cron/ao/sync-post-metrics
 *
 * Secured with CRON_SECRET. Called daily by Vercel cron.
 * Reads ao_scheduled_posts where status='posted' and external_id is set.
 * Fetches metrics from platform APIs and upserts into ao_scheduled_post_metrics.
 *
 * Platforms:
 * - Facebook: GET /{post-id}/insights via Meta Graph API
 * - Instagram: GET /{media-id}/insights via Meta Graph API
 * - LinkedIn: GET /socialActions/{post-urn} via LinkedIn REST API
 *
 * Twitter/X excluded — requires paid API tier for analytics.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';

const GRAPH_VERSION = 'v25.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const LINKEDIN_API_BASE = 'https://api.linkedin.com/rest';

function authCheck(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const auth = req.headers.authorization || '';
  const provided = auth.replace(/^Bearer\s+/i, '') || (req.query?.secret ?? '');
  return provided === cronSecret;
}

async function getMetaToken() {
  const { data } = await supabaseAdmin
    .from('ao_meta_tokens')
    .select('user_access_token, page_access_token, instagram_business_id, facebook_page_id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

async function getLinkedInToken() {
  try {
    const { data } = await supabaseAdmin
      .from('ao_linkedin_tokens')
      .select('access_token, person_urn')
      .limit(1)
      .maybeSingle();
    return data?.access_token || null;
  } catch (err) {
    console.warn('[sync-metrics] Failed to load LinkedIn token:', err.message);
    return null;
  }
}

async function fetchFacebookPostMetrics(postId, pageToken) {
  try {
    // Use basic post fields — more reliable than insights across post types
    // Insights endpoint has changed significantly in v22.0+
    const url = `${GRAPH_BASE}/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${pageToken}`;
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));

    if (json.error) {
      console.warn(`[sync-metrics] Facebook fetch failed for ${postId}:`, json.error?.message);
      return null;
    }

    return {
      impressions: 0,
      clicks: 0,
      reactions: json.likes?.summary?.total_count || 0,
      comments: json.comments?.summary?.total_count || 0,
      shares: json.shares?.count || 0,
      raw: json,
    };
  } catch (err) {
    console.warn(`[sync-metrics] Facebook fetch error for ${postId}:`, err.message);
    return null;
  }
}

async function fetchInstagramMediaMetrics(mediaId, userToken) {
  try {
    // v22.0+ supported metrics — impressions was removed
    const metrics = 'total_interactions,reach,likes,comments,shares,saved';
    const url = `${GRAPH_BASE}/${mediaId}/insights?metric=${metrics}&access_token=${userToken}`;
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));

    if (json.error) {
      // Fall back to basic media fields
      const basicUrl = `${GRAPH_BASE}/${mediaId}?fields=like_count,comments_count&access_token=${userToken}`;
      const basicRes = await fetch(basicUrl);
      const basicJson = await basicRes.json().catch(() => ({}));
      if (basicJson.error) {
        console.warn(`[sync-metrics] Instagram basic fetch failed for ${mediaId}:`, basicJson.error?.message);
        return null;
      }
      return {
        impressions: 0,
        clicks: 0,
        reactions: basicJson.like_count || 0,
        comments: basicJson.comments_count || 0,
        shares: 0,
        raw: basicJson,
      };
    }

    const data = json.data || [];
    const byName = {};
    for (const item of data) {
      byName[item.name] = item.values?.[0]?.value ?? item.value ?? 0;
    }
    return {
      impressions: byName.reach || 0,
      clicks: 0,
      reactions: byName.likes || byName.total_interactions || 0,
      comments: byName.comments || 0,
      shares: byName.shares || byName.saved || 0,
      raw: json,
    };
  } catch (err) {
    console.warn(`[sync-metrics] Instagram fetch error for ${mediaId}:`, err.message);
    return null;
  }
}

async function fetchLinkedInPostMetrics(postUrn, accessToken) {
  try {
    // LinkedIn Social Actions API for likes, comments, shares
    const encodedUrn = encodeURIComponent(postUrn);
    const url = `${LINKEDIN_API_BASE}/socialActions/${encodedUrn}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401',
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`[sync-metrics] LinkedIn social actions failed for ${postUrn}:`, json.message || res.status);
      return null;
    }

    // Also fetch impressions via Organization Statistics if it's a page post
    return {
      impressions: 0, // LinkedIn impressions require separate statistics API call
      clicks: 0,
      reactions: json.likesSummary?.totalLikes || 0,
      comments: json.commentsSummary?.totalFirstLevelComments || 0,
      shares: json.sharesSummary?.totalShares || 0,
      raw: json,
    };
  } catch (err) {
    console.warn(`[sync-metrics] LinkedIn fetch error for ${postUrn}:`, err.message);
    return null;
  }
}

function computeEngagementScore(metrics) {
  if (!metrics) return 0;
  const { impressions = 0, reactions = 0, comments = 0, shares = 0, clicks = 0 } = metrics;
  if (impressions === 0) return 0;
  // Weighted engagement: comments and shares count more than reactions
  const weighted = reactions * 1 + comments * 3 + shares * 4 + clicks * 2;
  return Math.round((weighted / impressions) * 1000) / 10; // percentage with 1 decimal
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  if (!authCheck(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  console.log('[sync-metrics] Starting daily metrics sync...');

  // Fetch all posted rows with external_id set
  const { data: posts, error: postsError } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .select('id, platform, account_id, external_id, posted_at, intent')
    .eq('status', 'posted')
    .not('external_id', 'is', null)
    .order('posted_at', { ascending: false })
    .limit(200);

  if (postsError) {
    console.error('[sync-metrics] Failed to fetch posts:', postsError.message);
    return res.status(500).json({ ok: false, error: postsError.message });
  }

  if (!posts || posts.length === 0) {
    return res.status(200).json({ ok: true, synced: 0, message: 'No posted rows with external_id found.' });
  }

  console.log(`[sync-metrics] Found ${posts.length} posted rows to sync`);

  // Load Meta credentials once
  const metaCreds = await getMetaToken();
  const linkedinToken = await getLinkedInToken();

  let synced = 0;
  let failed = 0;

  for (const post of posts) {
    let metrics = null;

    try {
      if (post.platform === 'facebook' && metaCreds?.page_access_token) {
        metrics = await fetchFacebookPostMetrics(post.external_id, metaCreds.page_access_token);
      } else if (post.platform === 'instagram' && metaCreds?.user_access_token) {
        metrics = await fetchInstagramMediaMetrics(post.external_id, metaCreds.user_access_token);
      } else if (post.platform === 'linkedin' && linkedinToken) {
        metrics = await fetchLinkedInPostMetrics(post.external_id, linkedinToken);
      } else {
        // twitter or unconfigured — skip
        continue;
      }

      if (!metrics) {
        failed++;
        continue;
      }

      const engagementScore = computeEngagementScore(metrics);

      const { error: upsertError } = await supabaseAdmin
        .from('ao_scheduled_post_metrics')
        .upsert({
          scheduled_post_id: post.id,
          platform: post.platform,
          external_id: post.external_id,
          posted_at_utc: post.posted_at || null,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          reactions: metrics.reactions,
          comments: metrics.comments,
          shares: metrics.shares,
          engagement_score: engagementScore,
          raw: metrics.raw,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'scheduled_post_id',
        });

      if (upsertError) {
        console.error(`[sync-metrics] Upsert failed for ${post.id}:`, upsertError.message);
        failed++;
      } else {
        synced++;
      }
    } catch (err) {
      console.error(`[sync-metrics] Error processing post ${post.id}:`, err.message);
      failed++;
    }
  }

  console.log(`[sync-metrics] Done. Synced: ${synced}, Failed: ${failed}`);

  return res.status(200).json({
    ok: true,
    synced,
    failed,
    total: posts.length,
    message: `Synced ${synced} of ${posts.length} posts. ${failed} failed.`,
  });
}
