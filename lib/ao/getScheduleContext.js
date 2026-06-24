/**
 * getScheduleContext
 *
 * Reads ao_scheduled_posts from Supabase and returns a formatted summary
 * that can be injected into Auto's system context when scheduling decisions
 * need to be made. Auto uses this data to answer queue questions without
 * asking Bart to check anything manually.
 */

import { supabaseAdmin } from '../supabase-admin.js';

export async function getScheduleContext() {
  try {
    // Count by status for quote cards
    const { data: statusRows, error: statusErr } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('status, platform')
      .eq('source_kind', 'auto_quote_card');

    if (statusErr) throw statusErr;

    const counts = { scheduled: 0, posted: 0, failed: 0 };
    const platformCounts = {};
    for (const row of statusRows || []) {
      counts[row.status] = (counts[row.status] || 0) + 1;
      if (row.status === 'scheduled') {
        platformCounts[row.platform] = (platformCounts[row.platform] || 0) + 1;
      }
    }

    // Next scheduled post across all platforms
    const { data: nextPosts, error: nextErr } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('platform, scheduled_at, caption, image_url')
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(4);

    if (nextErr) throw nextErr;

    // Last scheduled post date (to find where the queue ends)
    const { data: lastPost, error: lastErr } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('scheduled_at, platform')
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: false })
      .limit(1);

    if (lastErr) throw lastErr;

    // Failed posts count
    const { data: failedPosts, error: failedErr } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('platform, scheduled_at, error_message')
      .eq('status', 'failed')
      .order('scheduled_at', { ascending: false })
      .limit(5);

    if (failedErr) throw failedErr;

    // Null caption count on scheduled posts
    const { data: nullCaptions, error: nullErr } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('id')
      .eq('status', 'scheduled')
      .is('caption', null);

    if (nullErr) throw nullErr;

    const lastScheduledAt = lastPost?.[0]?.scheduled_at || null;
    const nextPost = nextPosts?.[0] || null;

    // Build platform breakdown string
    const platformBreakdown = Object.entries(platformCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([p, c]) => `${p} (${c} posts)`)
      .join(', ');

    // Calculate next available slot (3 days after queue end, skipping weekends)
    let nextAvailableSlot = null;
    if (lastPost?.[0]?.scheduled_at) {
      const lastDate = new Date(lastPost[0].scheduled_at);
      const next = new Date(lastDate);
      next.setDate(next.getDate() + 3);
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
      }
      nextAvailableSlot = next.toLocaleDateString('en-US', {
        timeZone: 'America/Chicago',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    // Build the context string Auto will read
    const lines = [
      '## LIVE QUEUE STATUS (read from database)',
      `Scheduled: ${counts.scheduled} posts | Posted: ${counts.posted} | Failed: ${counts.failed}`,
      platformBreakdown ? `Platforms in queue: ${platformBreakdown}` : '',
      `Approved channels for quote cards: LinkedIn Personal, LinkedIn Business, Instagram Business, Facebook Business, X — 5 rows per card, always.`,
      `Default cadence: every 3 days skipping weekends.`,
      nextAvailableSlot ? `Next available slot: ${nextAvailableSlot}` : '',
      '',
    ];

    if (nextPost) {
      const nextDate = new Date(nextPost.scheduled_at).toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
      lines.push(`Next post: ${nextPost.platform} on ${nextDate}`);
      if (nextPost.caption) {
        lines.push(`Caption preview: "${nextPost.caption.slice(0, 80)}..."`);
      } else {
        lines.push('WARNING: Next post has no caption.');
      }
      lines.push('');
    }

    if (lastScheduledAt) {
      const lastDate = new Date(lastScheduledAt).toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      lines.push(`Queue ends: ${lastDate}`);
      lines.push('');
    }

    if ((nullCaptions || []).length > 0) {
      lines.push(`WARNING: ${nullCaptions.length} scheduled posts have no caption and will post with no copy.`);
      lines.push('');
    }

    if ((failedPosts || []).length > 0) {
      lines.push(`FAILURES (${counts.failed} total — most recent):`);
      for (const f of (failedPosts || []).slice(0, 3)) {
        const fDate = new Date(f.scheduled_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
        lines.push(`- ${f.platform} on ${fDate}: ${(f.error_message || 'unknown error').slice(0, 100)}`);
      }
      lines.push('');
    }

    lines.push('Use this data to answer any queue questions. Do not ask Bart to check the queue manually.');

    return lines.join('\n');
  } catch (err) {
    console.error('[getScheduleContext]', err?.message || err);
    return '## QUEUE STATUS: unavailable (database error — proceed without it)';
  }
}
