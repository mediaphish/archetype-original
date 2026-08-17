/**
 * Cron: sync post engagement metrics from Facebook, Instagram, LinkedIn, Twitter/X.
 * POST /api/cron/ao/sync-post-metrics
 *
 * Secured with CRON_SECRET. Called daily by Vercel cron.
 * Failures are stored on ao_scheduled_post_metrics.sync_error (not only console.warn).
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { scheduledPosts } from '../../../lib/db/scheduledPosts.js';
import { getXAccessToken } from '../../../lib/social/xConnection.js';

const GRAPH_VERSION = 'v25.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const LINKEDIN_API_BASE = 'https://api.linkedin.com/rest';
const TWITTER_API_BASE = 'https://api.twitter.com/2';

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

/**
 * @returns {Promise<{ ok: true, metrics: object } | { ok: false, error: string }>}
 */
export async function fetchFacebookPostMetrics(postId, pageToken) {
  try {
    // Basic engagement fields. Do not request bare `shares` — Graph returns
    // (#100) Tried accessing nonexisting field (shares) on many Page post IDs.
    const url = `${GRAPH_BASE}/${postId}?fields=likes.summary(true),comments.summary(true)&access_token=${pageToken}`;
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.error) {
      const msg = json.error?.message || `HTTP ${res.status}`;
      console.warn(`[sync-metrics] Facebook fetch failed for ${postId}:`, msg);
      return { ok: false, error: `Facebook: ${msg}` };
    }

    // Optional shares — best-effort; never fail the whole sync if missing.
    let shares = 0;
    try {
      const sharesUrl = `${GRAPH_BASE}/${postId}?fields=shares&access_token=${pageToken}`;
      const sharesRes = await fetch(sharesUrl);
      const sharesJson = await sharesRes.json().catch(() => ({}));
      if (sharesRes.ok && !sharesJson.error) {
        shares = sharesJson.shares?.count || 0;
      }
    } catch (_) {
      /* ignore */
    }

    return {
      ok: true,
      metrics: {
        impressions: 0,
        clicks: 0,
        reactions: json.likes?.summary?.total_count || 0,
        comments: json.comments?.summary?.total_count || 0,
        shares,
        raw: json,
      },
    };
  } catch (err) {
    const msg = err?.message || String(err);
    console.warn(`[sync-metrics] Facebook fetch error for ${postId}:`, msg);
    return { ok: false, error: `Facebook: ${msg}` };
  }
}

export async function fetchInstagramMediaMetrics(mediaId, userToken) {
  try {
    const metrics = 'total_interactions,reach,likes,comments,shares,saved';
    const url = `${GRAPH_BASE}/${mediaId}/insights?metric=${metrics}&access_token=${userToken}`;
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));

    if (json.error || !res.ok) {
      const basicUrl = `${GRAPH_BASE}/${mediaId}?fields=like_count,comments_count&access_token=${userToken}`;
      const basicRes = await fetch(basicUrl);
      const basicJson = await basicRes.json().catch(() => ({}));
      if (!basicRes.ok || basicJson.error) {
        const msg =
          basicJson.error?.message ||
          json.error?.message ||
          `HTTP ${basicRes.status || res.status}`;
        console.warn(`[sync-metrics] Instagram fetch failed for ${mediaId}:`, msg);
        return { ok: false, error: `Instagram: ${msg}` };
      }
      return {
        ok: true,
        metrics: {
          impressions: 0,
          clicks: 0,
          reactions: basicJson.like_count || 0,
          comments: basicJson.comments_count || 0,
          shares: 0,
          raw: basicJson,
        },
      };
    }

    const data = json.data || [];
    const byName = {};
    for (const item of data) {
      byName[item.name] = item.values?.[0]?.value ?? item.value ?? 0;
    }
    return {
      ok: true,
      metrics: {
        impressions: byName.reach || 0,
        clicks: 0,
        reactions: byName.likes || byName.total_interactions || 0,
        comments: byName.comments || 0,
        shares: byName.shares || byName.saved || 0,
        raw: json,
      },
    };
  } catch (err) {
    const msg = err?.message || String(err);
    console.warn(`[sync-metrics] Instagram fetch error for ${mediaId}:`, msg);
    return { ok: false, error: `Instagram: ${msg}` };
  }
}

export async function fetchLinkedInPostMetrics(postUrn, accessToken) {
  // Reading likes/comments uses LinkedIn's Community Management socialActions
  // endpoint (partnerApiSocialActions). That permission is restricted / partner-
  // gated (r_member_social_feed), not something the current posting token
  // (openid profile email w_member_social) can pick up by reconnecting.
  // Do not "fix" this by adding a scope to the OAuth request until LinkedIn
  // grants that product. Failures are stored on sync_error and surfaced in Auto.
  try {
    const encodedUrn = encodeURIComponent(postUrn);
    const url = `${LINKEDIN_API_BASE}/socialActions/${encodedUrn}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202607',
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json.message || json.error || `HTTP ${res.status}`;
      console.warn(`[sync-metrics] LinkedIn social actions failed for ${postUrn}:`, msg);
      return { ok: false, error: `LinkedIn: ${msg}` };
    }

    return {
      ok: true,
      metrics: {
        impressions: 0,
        clicks: 0,
        reactions: json.likesSummary?.totalLikes || 0,
        comments: json.commentsSummary?.totalFirstLevelComments || 0,
        shares: json.sharesSummary?.totalShares || 0,
        raw: json,
      },
    };
  } catch (err) {
    const msg = err?.message || String(err);
    console.warn(`[sync-metrics] LinkedIn fetch error for ${postUrn}:`, msg);
    return { ok: false, error: `LinkedIn: ${msg}` };
  }
}

/**
 * Twitter/X public_metrics via API v2 (own tweets with user OAuth token).
 */
export async function fetchTwitterPostMetrics(tweetId, accessToken) {
  try {
    if (!accessToken) {
      return { ok: false, error: 'Twitter: no access token' };
    }
    const url = `${TWITTER_API_BASE}/tweets/${encodeURIComponent(tweetId)}?tweet.fields=public_metrics,created_at`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.errors?.length) {
      const msg =
        json.errors?.[0]?.detail ||
        json.errors?.[0]?.title ||
        json.detail ||
        json.title ||
        `HTTP ${res.status}`;
      console.warn(`[sync-metrics] Twitter fetch failed for ${tweetId}:`, msg);
      return { ok: false, error: `Twitter: ${msg}` };
    }
    const pm = json.data?.public_metrics || {};
    return {
      ok: true,
      metrics: {
        impressions: pm.impression_count || 0,
        clicks: 0,
        reactions: pm.like_count || 0,
        comments: pm.reply_count || 0,
        shares: (pm.retweet_count || 0) + (pm.quote_count || 0),
        raw: json,
      },
    };
  } catch (err) {
    const msg = err?.message || String(err);
    console.warn(`[sync-metrics] Twitter fetch error for ${tweetId}:`, msg);
    return { ok: false, error: `Twitter: ${msg}` };
  }
}

/**
 * Engagement score. When impressions are unavailable (common for FB/LI basic fields),
 * fall back to absolute weighted engagement so rows are not left forever unscored.
 */
export function computeEngagementScore(metrics) {
  if (!metrics) return null;
  const { impressions = 0, reactions = 0, comments = 0, shares = 0, clicks = 0 } = metrics;
  const weighted = reactions * 1 + comments * 3 + shares * 4 + clicks * 2;
  if (impressions > 0) {
    return Math.round((weighted / impressions) * 1000) / 10;
  }
  return weighted > 0 ? weighted : 0;
}

async function recordSyncFailure(post, errorMessage) {
  const msg = String(errorMessage || 'Unknown sync error').slice(0, 1000);
  const { error } = await supabaseAdmin.from('ao_scheduled_post_metrics').upsert(
    {
      scheduled_post_id: post.id,
      platform: post.platform,
      external_id: post.external_id,
      posted_at_utc: post.posted_at || null,
      sync_error: msg,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'scheduled_post_id' }
  );
  if (error) {
    console.error(`[sync-metrics] Failed to store sync_error for ${post.id}:`, error.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  if (!authCheck(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  console.log('[sync-metrics] Starting daily metrics sync...');

  const { data: posts, error: postsError } = await scheduledPosts()
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
    return res.status(200).json({
      ok: true,
      synced: 0,
      message: 'No posted rows with external_id found.',
    });
  }

  console.log(`[sync-metrics] Found ${posts.length} posted rows to sync`);

  const metaCreds = await getMetaToken();
  const linkedinToken = await getLinkedInToken();
  let twitterToken = null;
  try {
    const xTok = await getXAccessToken();
    if (xTok?.ok) twitterToken = xTok.accessToken;
  } catch (err) {
    console.warn('[sync-metrics] X token load failed:', err?.message || err);
  }

  let synced = 0;
  let failed = 0;
  const failureSamples = [];

  for (const post of posts) {
    try {
      let result = null;

      if (post.platform === 'facebook') {
        if (!metaCreds?.page_access_token) {
          result = { ok: false, error: 'Facebook: no page_access_token configured' };
        } else {
          result = await fetchFacebookPostMetrics(post.external_id, metaCreds.page_access_token);
        }
      } else if (post.platform === 'instagram') {
        if (!metaCreds?.user_access_token) {
          result = { ok: false, error: 'Instagram: no user_access_token configured' };
        } else {
          result = await fetchInstagramMediaMetrics(post.external_id, metaCreds.user_access_token);
        }
      } else if (post.platform === 'linkedin') {
        if (!linkedinToken) {
          result = { ok: false, error: 'LinkedIn: no token in ao_linkedin_tokens' };
        } else {
          result = await fetchLinkedInPostMetrics(post.external_id, linkedinToken);
        }
      } else if (post.platform === 'twitter') {
        if (!twitterToken) {
          result = { ok: false, error: 'Twitter: X not connected / no access token' };
        } else {
          result = await fetchTwitterPostMetrics(post.external_id, twitterToken);
        }
      } else {
        continue;
      }

      if (!result?.ok) {
        failed++;
        await recordSyncFailure(post, result?.error || 'Fetch returned null');
        if (failureSamples.length < 8) {
          failureSamples.push({ id: post.id, platform: post.platform, error: result?.error });
        }
        continue;
      }

      const metrics = result.metrics;
      const engagementScore = computeEngagementScore(metrics);

      const { error: upsertError } = await supabaseAdmin.from('ao_scheduled_post_metrics').upsert(
        {
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
          sync_error: null,
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'scheduled_post_id' }
      );

      if (upsertError) {
        console.error(`[sync-metrics] Upsert failed for ${post.id}:`, upsertError.message);
        failed++;
        await recordSyncFailure(post, `Upsert failed: ${upsertError.message}`);
      } else {
        synced++;
      }
    } catch (err) {
      console.error(`[sync-metrics] Error processing post ${post.id}:`, err.message);
      failed++;
      await recordSyncFailure(post, err.message);
    }
  }

  console.log(`[sync-metrics] Done. Synced: ${synced}, Failed: ${failed}`);

  return res.status(200).json({
    ok: true,
    synced,
    failed,
    total: posts.length,
    failure_samples: failureSamples,
    message: `Synced ${synced} of ${posts.length} posts. ${failed} failed.`,
  });
}
