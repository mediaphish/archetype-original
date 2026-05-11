/**
 * Dedupe guard for devotional broadcast emails (Vercel cron, GitHub Actions, POST /api/journal/notify).
 * Requires table journal_devotional_notify_sent (see database/journal_devotional_notify_sent.sql).
 */

const PG_UNIQUE_VIOLATION = '23505';

/**
 * @param {*} supabaseAdmin supabase service client
 * @param {string} slug
 * @param {string} publishCalendarDate YYYY-MM-DD
 * @param {string} source e.g. daily_cron | journal_notify | ci_corpus
 * @returns {Promise<{ claimed: boolean, duplicate?: boolean, error?: string }>}
 */
export async function claimDevotionalBroadcast(supabaseAdmin, slug, publishCalendarDate, source) {
  if (!slug || !publishCalendarDate) {
    return { claimed: false, error: 'Missing slug or publish_calendar_date' };
  }

  const { error } = await supabaseAdmin.from('journal_devotional_notify_sent').insert({
    post_slug: slug,
    publish_calendar_date: publishCalendarDate,
    source: String(source || 'unknown').slice(0, 64),
  });

  if (!error) return { claimed: true };

  if (error.code === PG_UNIQUE_VIOLATION) {
    return { claimed: false, duplicate: true };
  }

  console.error('[claimDevotionalBroadcast]', error);
  return {
    claimed: false,
    error:
      error.message ||
      'Insert failed (if the table is new, run database/journal_devotional_notify_sent.sql in Supabase).',
  };
}

/**
 * @param {*} supabaseAdmin supabase service client
 * @param {string} slug
 * @param {string} publishCalendarDate YYYY-MM-DD
 */
export async function releaseDevotionalBroadcastClaim(supabaseAdmin, slug, publishCalendarDate) {
  if (!slug || !publishCalendarDate) return;
  await supabaseAdmin
    .from('journal_devotional_notify_sent')
    .delete()
    .eq('post_slug', slug)
    .eq('publish_calendar_date', publishCalendarDate);
}
