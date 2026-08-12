/**
 * Publisher: fetch due scheduled posts from Supabase and publish via channel adapters.
 * Scheduler → Content Object → Platform Adapter → Meta (or other) API.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { postToLinkedIn } from './linkedin.js';
import { postToFacebook } from './facebook.js';
import { postToInstagram } from './instagram.js';
import { postToTwitter } from './twitter.js';
import { supportsFirstComment } from './capabilities.js';
import { publishFirstComment } from './firstComment.js';
import { upsertMemoryFromScheduledPost } from '../ao/editorialMemory.js';
import { upsertScheduledPostMetrics } from '../ao/postMetrics.js';
import { assertPublishableScheduledText } from '../ao/scheduledPostCopy.js';

const ADAPTERS = {
  linkedin: postToLinkedIn,
  facebook: postToFacebook,
  instagram: postToInstagram,
  twitter: postToTwitter
};

const META_ACCOUNT_ID = process.env.META_ACCESS_TOKEN ? 'meta' : 'default';

async function safeUpdateScheduledPost(id, payload) {
  const out = await supabaseAdmin.from('ao_scheduled_posts').update(payload).eq('id', id);
  if (!out?.error) return out;
  const msg = String(out.error.message || '');
  if (msg.includes('posted_at')) {
    const { posted_at, ...rest } = payload || {};
    return await supabaseAdmin.from('ao_scheduled_posts').update(rest).eq('id', id);
  }
  return out;
}

async function mirrorPostedToEditorialMemory(postId) {
  const ownerEmail = String(process.env.AO_OWNER_EMAIL || '').toLowerCase().trim();
  if (!ownerEmail) return;
  if (!postId) return;
  try {
    const full = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('id,platform,account_id,scheduled_at,updated_at,posted_at,text,image_url,status,source_quote_id,source_idea_id,ao_lane,topic_tags,feedback_rating,feedback_notes')
      .eq('id', postId)
      .single();
    if (full.error || !full.data) return;
    if (String(full.data.status || '') !== 'posted') return;
    await upsertMemoryFromScheduledPost({ email: ownerEmail, scheduledPostRow: full.data });
  } catch (_) {
    // best-effort
  }
}

/**
 * Publish a single row (call the right adapter, then optional first comment).
 * Exported for regression tests of the placeholder guard.
 * @param {object} row - from ao_scheduled_posts (id, platform, account_id, text, image_url, first_comment?)
 * @returns {Promise<{ ok: boolean, externalId?: string, error?: string, firstCommentStatus?: string, firstCommentErrorMessage?: string }>}
 */
export async function publishOne(row) {
  const { id, platform, account_id, image_url, first_comment } = row;
  const adapter = ADAPTERS[platform];
  if (!adapter) {
    return { ok: false, error: `Unknown platform: ${platform}` };
  }

  const publishable = assertPublishableScheduledText(row);
  if (!publishable.ok) {
    console.error(`[publishOne] Blocked placeholder/empty text for ${id}:`, publishable.error);
    return { ok: false, error: publishable.error };
  }
  const text = publishable.text;

  try {
    const result = await adapter({ text, imageUrl: image_url || undefined }, account_id);
    if (!result.success || !result.postId) {
      return { ok: false, error: result.error || 'Publish failed' };
    }

    let firstCommentStatus = null;
    let firstCommentErrorMessage = null;

    if (first_comment && typeof first_comment === 'string' && first_comment.trim()) {
      if (supportsFirstComment(platform)) {
        const fc = await publishFirstComment(platform, account_id, result.postId, first_comment.trim());
        firstCommentStatus = fc.success ? 'posted' : 'failed';
        if (!fc.success) firstCommentErrorMessage = fc.error || null;
      } else {
        firstCommentStatus = 'unsupported';
      }
    } else {
      firstCommentStatus = 'skipped';
    }

    return {
      ok: true,
      externalId: result.postId,
      firstCommentStatus,
      firstCommentErrorMessage
    };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/**
 * Publish a single post by id (fetch row, publish, update).
 * @param {string} id - ao_scheduled_posts.id
 * @returns {Promise<{ ok: boolean, externalId?: string, error?: string }>}
 */
export async function publishPostById(id) {
  const { data: row, error } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .select('id, platform, account_id, text, caption, image_url, first_comment')
    .eq('id', id)
    .eq('status', 'scheduled')
    .single();
  if (error || !row) return { ok: false, error: error?.message || 'Post not found' };
  const now = new Date().toISOString();
  await safeUpdateScheduledPost(id, { status: 'publishing', updated_at: now });
  const result = await publishOne(row);
  const nextStatus = result.ok ? 'posted' : 'failed';
  const postedAtIso = nextStatus === 'posted' ? new Date().toISOString() : null;
  const updatePayload = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
    ...(postedAtIso ? { posted_at: postedAtIso } : {}),
    ...(result.ok ? { external_id: result.externalId } : {}),
    ...(result.error ? { error_message: result.error } : {})
  };
  if (result.firstCommentStatus != null) {
    updatePayload.first_comment_status = result.firstCommentStatus;
    if (result.firstCommentErrorMessage != null) updatePayload.first_comment_error_message = result.firstCommentErrorMessage;
  }
  await safeUpdateScheduledPost(id, updatePayload);
  if (result.ok) {
    await mirrorPostedToEditorialMemory(id);
    if (result.externalId) {
      await upsertScheduledPostMetrics({
        scheduled_post_id: id,
        platform: row.platform,
        external_id: result.externalId,
        posted_at_utc: postedAtIso || new Date().toISOString(),
      });
    }
  }
  return result.ok ? { ok: true, externalId: result.externalId } : { ok: false, error: result.error };
}

/**
 * Fetch due scheduled posts, publish each, update status.
 * @param {object} [options] - { limit?: number }
 * @returns {Promise<{ processed: number, posted: number, failed: number, errors: Array<{ id: string, error: string }> }>}
 */
export async function publishDuePosts(options = {}) {
  const limit = options.limit ?? 50;
  const now = new Date().toISOString();

  const { data: rows, error: fetchError } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .select('id, platform, account_id, text, caption, image_url, first_comment')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (fetchError) {
    throw new Error(`Failed to fetch scheduled posts: ${fetchError.message}`);
  }
  if (!rows || rows.length === 0) {
    return { processed: 0, posted: 0, failed: 0, errors: [] };
  }

  let posted = 0;
  const errors = [];

  for (const row of rows) {
    const publishingUpdate = await safeUpdateScheduledPost(row.id, { status: 'publishing', updated_at: now });

    if (publishingUpdate?.error) {
      errors.push({ id: row.id, error: publishingUpdate.error.message });
      continue;
    }

    const result = await publishOne(row);
    const nextStatus = result.ok ? 'posted' : 'failed';
    const postedAtIso = nextStatus === 'posted' ? new Date().toISOString() : null;
    const updatePayload = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
      ...(postedAtIso ? { posted_at: postedAtIso } : {}),
      ...(result.ok ? { external_id: result.externalId } : {}),
      ...(result.error ? { error_message: result.error } : {})
    };
    if (result.firstCommentStatus != null) {
      updatePayload.first_comment_status = result.firstCommentStatus;
      if (result.firstCommentErrorMessage != null) updatePayload.first_comment_error_message = result.firstCommentErrorMessage;
    }

    await safeUpdateScheduledPost(row.id, updatePayload);

    if (result.ok) posted++;
    else errors.push({ id: row.id, error: result.error });

    if (result.ok) {
      await mirrorPostedToEditorialMemory(row.id);
      if (result.externalId) {
        await upsertScheduledPostMetrics({
          scheduled_post_id: row.id,
          platform: row.platform,
          external_id: result.externalId,
          posted_at_utc: postedAtIso || new Date().toISOString(),
        });
      }
    }
  }

  return {
    processed: rows.length,
    posted,
    failed: rows.length - posted,
    errors
  };
}
