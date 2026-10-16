/**
 * Delete everything this app holds that came from LinkedIn.
 *
 * 2026-10-16. LinkedIn's API Management Team asked, as a condition of the
 * Community Management review: "Does your organization have the capability to
 * securely delete all data obtained via our community management APIs if
 * required by LinkedIn?" Until now the honest answer was no, not because
 * anything was being hoarded but because nobody had written the function.
 *
 * What the app actually obtains from LinkedIn is narrow, and this deletes all
 * of it:
 *
 *   ao_linkedin_tokens        the OAuth access and refresh tokens, their
 *                             expiry, and the two URNs identifying Bart's own
 *                             member account and his company page
 *   ao_scheduled_post_metrics the per-post counts read back from
 *                             socialActions: reactions, comments, shares, and
 *                             the raw API response they were parsed from
 *   ao_scheduled_posts        the LinkedIn post URN stored on each published
 *                             row as external_id
 *
 * There is no fourth store, because the app never requests member identities.
 * It reads two totals off socialActions and nothing about who produced them.
 *
 * The app's own content is not LinkedIn's data and is left alone: the captions
 * Bart wrote, the images he made, the schedule. Only the post's LinkedIn
 * identifier is cleared from those rows, not the rows themselves.
 */

import { supabaseAdmin } from '../supabase-admin.js';

/** Every store that holds something obtained from LinkedIn. */
export const LINKEDIN_DATA_STORES = Object.freeze([
  { table: 'ao_linkedin_tokens', what: 'OAuth tokens and the member and page URNs' },
  { table: 'ao_scheduled_post_metrics', what: 'reaction, comment and share counts read from socialActions' },
  { table: 'ao_scheduled_posts', what: 'the LinkedIn post URN stored as external_id' },
]);

/**
 * Remove it all.
 *
 * Reports what it did per store rather than returning a bare boolean, because
 * "we can delete it" is a claim that should be demonstrable, and a count is
 * demonstrable. A dry run answers the same question without the deletion, so
 * the capability can be shown on camera without destroying a working
 * connection mid-review.
 *
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, dryRun: boolean, deleted: Array<object>, errors: string[] }>}
 */
export async function deleteAllLinkedInData({ dryRun = false } = {}) {
  const deleted = [];
  const errors = [];

  // 1. The tokens. Done first: once these are gone the app cannot reach
  //    LinkedIn at all, so an interrupted run cannot leave a live connection
  //    sitting beside half-deleted data.
  try {
    const { count } = await supabaseAdmin
      .from('ao_linkedin_tokens')
      .select('*', { count: 'exact', head: true });
    if (!dryRun && count) {
      const { error } = await supabaseAdmin.from('ao_linkedin_tokens').delete().not('id', 'is', null);
      if (error) throw error;
    }
    deleted.push({ store: 'ao_linkedin_tokens', rows: count || 0, what: 'OAuth tokens, member URN, page URN' });
  } catch (err) {
    errors.push(`ao_linkedin_tokens: ${err?.message || err}`);
  }

  // 2. The counts read back from socialActions, and the raw responses.
  try {
    const { count } = await supabaseAdmin
      .from('ao_scheduled_post_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('platform', 'linkedin');
    if (!dryRun && count) {
      const { error } = await supabaseAdmin
        .from('ao_scheduled_post_metrics')
        .delete()
        .eq('platform', 'linkedin');
      if (error) throw error;
    }
    deleted.push({
      store: 'ao_scheduled_post_metrics',
      rows: count || 0,
      what: 'reaction, comment and share counts plus the raw socialActions responses',
    });
  } catch (err) {
    errors.push(`ao_scheduled_post_metrics: ${err?.message || err}`);
  }

  // 3. The post URNs. The rows stay: Bart's own captions and images are his
  //    content, not LinkedIn's. Only the LinkedIn identifier is cleared.
  try {
    const { count } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('*', { count: 'exact', head: true })
      .eq('platform', 'linkedin')
      .not('external_id', 'is', null);
    if (!dryRun && count) {
      const { error } = await supabaseAdmin
        .from('ao_scheduled_posts')
        .update({ external_id: null, updated_at: new Date().toISOString() })
        .eq('platform', 'linkedin')
        .not('external_id', 'is', null);
      if (error) throw error;
    }
    deleted.push({
      store: 'ao_scheduled_posts',
      rows: count || 0,
      what: 'the LinkedIn post URN on each published row (the post content itself is Bart\'s own and is kept)',
    });
  } catch (err) {
    errors.push(`ao_scheduled_posts: ${err?.message || err}`);
  }

  return { ok: errors.length === 0, dryRun, deleted, errors };
}

/**
 * What is held right now, without deleting any of it.
 *
 * This is what gets shown on camera: a Page admin can see at any moment
 * exactly what LinkedIn data the app holds, which is the honest version of
 * "we can delete it if asked".
 */
export async function describeLinkedInDataHeld() {
  const result = await deleteAllLinkedInData({ dryRun: true });
  return {
    ok: result.ok,
    stores: result.deleted,
    total_rows: result.deleted.reduce((n, d) => n + (d.rows || 0), 0),
    member_identities_held: 0, // The app never requests them. See the audit.
    errors: result.errors,
  };
}
