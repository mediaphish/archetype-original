/**
 * Shared caption scheduling for journal launch posts.
 * Used by api/ao/auto/schedule-journal-launch.js and the schedule_captions tool handler.
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { toScheduledAt, findNextQueueDate, dateFromYmd } from './unifiedScheduler.js';
import { publishDateCalendarOnly } from '../publish-eligibility.mjs';
import { scheduledPosts } from '../db/scheduledPosts.js';
import {
  validateTwitterCaptionLength,
  JOURNAL_LAUNCH_REQUIRED_CHANNELS,
} from './parseJournalSocialCaptions.js';

function normalizeInstagramCaption(caption) {
  let text = String(caption || '').trim();
  text = text.replace(/https?:\/\/[^\s]+/g, '').trim();
  if (!text.includes('Link in bio')) {
    text = `${text}\n\nLink in bio.`.trim();
  }
  return text;
}

function readJournalPublishDate(slug) {
  const filePath = path.join(process.cwd(), 'ao-knowledge-hq-kit/journal', `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data } = matter(raw);
  return publishDateCalendarOnly(data?.publish_date);
}

/**
 * @param {{ email: string, slug: string, title?: string, captions: Record<string, string> }} args
 */
export async function scheduleJournalLaunchCaptions({ email, slug, title = null, captions }) {
  if (!slug) return { ok: false, error: 'slug is required' };
  if (!captions || typeof captions !== 'object') {
    return { ok: false, error: 'captions object is required' };
  }

  const journalUrl = `https://www.archetypeoriginal.com/journal/${slug}`;
  const publishYmd = readJournalPublishDate(slug);
  const launchDate = dateFromYmd(publishYmd) || (await findNextQueueDate(0));
  const launchYmd = launchDate.toISOString().split('T')[0];

  const providedCaptions = JOURNAL_LAUNCH_REQUIRED_CHANNELS.filter(
    (ch) => captions[ch.key] && String(captions[ch.key]).trim()
  );
  if (providedCaptions.length === 0) {
    return {
      ok: false,
      error:
        'No captions provided. At least one platform caption is required to schedule journal launch posts.',
    };
  }

  const rows = [];
  const timingMeta = [];
  for (const ch of JOURNAL_LAUNCH_REQUIRED_CHANNELS) {
    const caption = captions[ch.key];
    if (!caption || !String(caption).trim()) continue;

    let text = String(caption).trim();
    if (ch.platform === 'instagram') {
      text = normalizeInstagramCaption(text);
    }
    if (ch.platform === 'twitter') {
      const tw = validateTwitterCaptionLength(text);
      if (!tw.ok) {
        return { ok: false, error: tw.error, gate: 'twitter_length', count: tw.count, limit: tw.limit };
      }
    }

    const clocked = await toScheduledAt(launchDate, ch.platform, { returnMeta: true });
    const scheduledAt = typeof clocked === 'string' ? clocked : clocked.scheduled_at;
    timingMeta.push({
      channel: ch.key,
      platform: ch.platform,
      account_id: ch.account_id,
      scheduled_at: scheduledAt,
      source: clocked?.source || null,
      sample_count: clocked?.sample_count ?? null,
      external_reference: clocked?.external_reference || null,
    });

    rows.push({
      platform: ch.platform,
      account_id: ch.account_id,
      scheduled_at: scheduledAt,
      text,
      caption: text,
      status: 'scheduled',
      source_kind: 'journal_launch',
      intent: {
        auto_hub: true,
        channel_label: ch.label,
        journal_slug: slug,
        title: title || null,
        journal_url: journalUrl,
        publish_date: publishYmd,
        created_by_email: email || null,
        timing_source: clocked?.source || null,
        timing_sample_count: clocked?.sample_count ?? null,
      },
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: 'No valid captions provided' };
  }

  const { data: existingScheduled, error: existingScheduledError } = await scheduledPosts()
    .select('platform, account_id')
    .eq('source_kind', 'journal_launch')
    .contains('intent', { journal_slug: slug })
    .neq('status', 'failed');

  if (existingScheduledError) {
    console.error(
      '[scheduleJournalLaunchCaptions] Could not check for already-scheduled captions, proceeding without dedup:',
      existingScheduledError.message
    );
  }

  const alreadyScheduledKeys = new Set(
    (existingScheduled || []).map((r) => `${r.platform}::${r.account_id}`)
  );
  const newRows = rows.filter((r) => !alreadyScheduledKeys.has(`${r.platform}::${r.account_id}`));
  const skippedCount = rows.length - newRows.length;
  if (skippedCount > 0) {
    console.warn(
      `[scheduleJournalLaunchCaptions] Skipped ${skippedCount} caption row(s) already scheduled for ${slug}`
    );
  }

  if (newRows.length === 0) {
    return {
      ok: true,
      slug,
      title: title || null,
      journal_url: journalUrl,
      launch_date: `${launchYmd}T12:00:00.000Z`,
      scheduled: [],
      timing: timingMeta,
      total: 0,
      skipped_as_duplicate: rows.length,
      message: `All ${rows.length} caption row(s) for ${slug} were already scheduled — nothing new to insert.`,
    };
  }

  const { insertScheduledPostsSafely } = await import('../db/scheduledPosts.js');
  const result = await insertScheduledPostsSafely(newRows, {
    select: 'id, platform, account_id, scheduled_at, status',
  });

  if (!result.ok) return { ok: false, error: result.error, rejected: result.rejected };

  const scheduledWithTiming = (result.inserted || []).map((row) => {
    const meta = timingMeta.find(
      (t) => t.platform === row.platform && t.account_id === row.account_id
    );
    return {
      ...row,
      channel: meta?.channel || null,
      source: meta?.source || null,
      sample_count: meta?.sample_count ?? null,
      external_reference: meta?.external_reference || null,
    };
  });

  const timingLines = scheduledWithTiming
    .map((r) => {
      const when = r.scheduled_at || 'unknown time';
      const src =
        r.source === 'engagement_data'
          ? `based on your last ${r.sample_count} posts' real engagement data`
          : r.source === 'engagement_data_thin_supplemented'
            ? `your own sample is thin (${r.sample_count} posts)${
                r.external_reference ? `; also weighed: ${r.external_reference}` : ''
              }`
            : r.source === 'fallback_insufficient_data' ||
                r.source === 'fallback_insufficient_data_supplemented'
              ? `using the default benchmark time (not enough of your own ${r.platform} history yet)`
              : 'timing source not recorded';
      return `${r.channel || r.platform}: ${when} — ${src}`;
    })
    .join('\n');

  return {
    ok: true,
    slug,
    title: title || null,
    journal_url: journalUrl,
    launch_date: `${launchYmd}T12:00:00.000Z`,
    scheduled: scheduledWithTiming,
    timing: timingMeta,
    total: scheduledWithTiming.length,
    rejected: result.rejected || [],
    integrity_summary: result.integrity_summary,
    message:
      `${scheduledWithTiming.length} social posts scheduled for ${slug}` +
      (result.integrity_summary ? ` — ${result.integrity_summary}` : '') +
      (timingLines ? `\n\nTiming breakdown:\n${timingLines}` : ''),
  };
}
