/**
 * Per-recipient dedupe for devotional mass emails.
 * Requires journal_devotional_recipient_sent (see database/journal_devotional_recipient_sent.sql).
 */

const PG_UNDEFINED_TABLE = '42P01';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * @returns {Promise<Array<{ id?: string|number, email: string }>>}
 */
export async function filterDevotionalRecipientsNotYetSent(
  supabaseAdmin,
  slug,
  publishCalendarDate,
  recipients
) {
  if (!recipients?.length) return [];

  const emails = [
    ...new Set(recipients.map((r) => normalizeEmail(r.email)).filter((e) => e.includes('@'))),
  ];
  if (emails.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('journal_devotional_recipient_sent')
    .select('email')
    .eq('post_slug', slug)
    .eq('publish_calendar_date', publishCalendarDate)
    .in('email', emails);

  if (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn(
        '[filterDevotionalRecipientsNotYetSent] Table missing — run database/journal_devotional_recipient_sent.sql'
      );
      return recipients;
    }
    console.error('[filterDevotionalRecipientsNotYetSent]', error);
    throw new Error(error.message || 'Could not check per-recipient devotional dedupe');
  }

  const already = new Set((data || []).map((row) => normalizeEmail(row.email)));
  return recipients.filter((r) => !already.has(normalizeEmail(r.email)));
}

/**
 * @param {string[]} sentAddresses raw emails from broadcast helper
 */
export async function recordDevotionalRecipientsSent(
  supabaseAdmin,
  slug,
  publishCalendarDate,
  sentAddresses,
  source
) {
  const unique = [
    ...new Set(sentAddresses.map(normalizeEmail).filter((e) => e.includes('@'))),
  ];
  if (unique.length === 0) return;

  const rows = unique.map((email) => ({
    post_slug: slug,
    publish_calendar_date: publishCalendarDate,
    email,
    source: String(source || 'unknown').slice(0, 64),
  }));

  const { error } = await supabaseAdmin
    .from('journal_devotional_recipient_sent')
    .upsert(rows, { onConflict: 'post_slug,publish_calendar_date,email', ignoreDuplicates: true });

  if (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn(
        '[recordDevotionalRecipientsSent] Table missing — run database/journal_devotional_recipient_sent.sql'
      );
      return;
    }
    console.error('[recordDevotionalRecipientsSent]', error);
  }
}
