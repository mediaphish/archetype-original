/**
 * Publisher: fetch due scheduled posts from Supabase and publish via channel adapters.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { postToLinkedIn } from './linkedin.js';
import { postToFacebook } from './facebook.js';
import { postToInstagram } from './instagram.js';
import { postToTwitter } from './twitter.js';

const ADAPTERS = {
  linkedin: postToLinkedIn,
  facebook: postToFacebook,
  instagram: postToInstagram,
  twitter: postToTwitter
};

/**
 * Publish a single row (call the right adapter and update row).
 * @param {object} row - from ao_scheduled_posts
 * @returns {Promise<{ ok: boolean, externalId?: string, error?: string }>}
 */
async function publishOne(row) {
  const { id, platform, account_id, text, image_url } = row;
  const adapter = ADAPTERS[platform];
  if (!adapter) {
    return { ok: false, error: `Unknown platform: ${platform}` };
  }

  try {
    const result = await adapter({ text, imageUrl: image_url || undefined }, account_id);
    if (result.success && result.postId) {
      return { ok: true, externalId: result.postId };
    }
    return { ok: false, error: result.error || 'Publish failed' };
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
    .select('id, platform, account_id, text, image_url')
    .eq('id', id)
    .eq('status', 'scheduled')
    .single();
  if (error || !row) return { ok: false, error: error?.message || 'Post not found' };
  const now = new Date().toISOString();
  await supabaseAdmin.from('ao_scheduled_posts').update({ status: 'publishing', updated_at: now }).eq('id', id);
  const result = await publishOne(row);
  const nextStatus = result.ok ? 'posted' : 'failed';
  await supabaseAdmin
    .from('ao_scheduled_posts')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
      ...(result.ok ? { external_id: result.externalId } : {}),
      ...(result.error ? { error_message: result.error } : {})
    })
    .eq('id', id);
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
    .select('id, platform, account_id, text, image_url')
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
    const updateError = await supabaseAdmin
      .from('ao_scheduled_posts')
      .update({ status: 'publishing', updated_at: now })
      .eq('id', row.id);

    if (updateError) {
      errors.push({ id: row.id, error: updateError.message });
      continue;
    }

    const result = await publishOne(row);
    const nextStatus = result.ok ? 'posted' : 'failed';
    const updatePayload = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
      ...(result.ok ? { external_id: result.externalId } : {}),
      ...(result.error ? { error_message: result.error } : {})
    };

    await supabaseAdmin
      .from('ao_scheduled_posts')
      .update(updatePayload)
      .eq('id', row.id);

    if (result.ok) posted++;
    else errors.push({ id: row.id, error: result.error });
  }

  return {
    processed: rows.length,
    posted,
    failed: rows.length - posted,
    errors
  };
}
