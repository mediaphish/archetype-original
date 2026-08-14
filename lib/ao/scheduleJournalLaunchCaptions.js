/**
 * Shared caption scheduling for journal launch posts.
 * Used by api/ao/auto/schedule-journal-launch.js and the schedule_captions tool handler.
 *
 * Launch date priority (#128):
 * 1. ao_content_drafts.scheduled_publish_at (DB — primary after #127)
 * 2. markdown publish_date in ao-knowledge-hq-kit/journal/<slug>.md (legacy)
 * 3. clear error — never fall through to the cross-content-type queue
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { toScheduledAt, dateFromYmd } from './unifiedScheduler.js';
import { publishDateCalendarOnly } from '../publish-eligibility.mjs';
import { scheduledPosts } from '../db/scheduledPosts.js';
import { contentDrafts, canonicalizeSlug } from '../db/contentDrafts.js';
import {
  validateTwitterCaptionLength,
  JOURNAL_LAUNCH_REQUIRED_CHANNELS,
} from './parseJournalSocialCaptions.js';
import {
  resolveJournalLaunchPublishYmd,
  assertLaunchDateNearTarget,
} from './resolveJournalLaunchDate.js';

export {
  resolveJournalLaunchPublishYmd,
  assertLaunchDateNearTarget,
  ymdFromScheduledPublishAt,
  LAUNCH_DATE_DRIFT_MAX_DAYS,
} from './resolveJournalLaunchDate.js';

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

async function lookupDraftScheduledPublishAt(slug) {
  const slugNorm = canonicalizeSlug(slug);
  if (!slugNorm) return null;
  const { data, error } = await contentDrafts()
    .select('scheduled_publish_at')
    .eq('kind', 'journal')
    .eq('slug', slugNorm)
    .neq('status', 'abandoned')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error || !data?.length) return null;
  return data[0].scheduled_publish_at || null;
}

/**
 * @param {{
 *   email: string,
 *   slug: string,
 *   title?: string,
 *   captions: Record<string, string>,
 *   scheduled_publish_at?: string|null,
 * }} args
 */
export async function scheduleJournalLaunchCaptions({
  email,
  slug,
  title = null,
  captions,
  scheduled_publish_at: passedScheduledAt = null,
}) {
  if (!slug) return { ok: false, error: 'slug is required' };
  if (!captions || typeof captions !== 'object') {
    return { ok: false, error: 'captions object is required' };
  }

  const journalUrl = `https://www.archetypeoriginal.com/journal/${slug}`;

  let scheduledPublishAt = passedScheduledAt || null;
  if (!scheduledPublishAt) {
    try {
      scheduledPublishAt = await lookupDraftScheduledPublishAt(slug);
    } catch (err) {
      console.warn(
        '[scheduleJournalLaunchCaptions] draft scheduled_publish_at lookup failed:',
        err?.message || err
      );
    }
  }

  const resolved = resolveJournalLaunchPublishYmd({
    slug,
    scheduledPublishAt,
    readMarkdownPublishDate: readJournalPublishDate,
  });
  if (!resolved.ok) {
    return { ok: false, error: resolved.error, gate: 'missing_publish_date' };
  }

  const publishYmd = resolved.publishYmd;
  const launchDate = dateFromYmd(publishYmd);
  if (!launchDate) {
    return {
      ok: false,
      error: `Could not parse launch date from publish date "${publishYmd}".`,
      gate: 'missing_publish_date',
    };
  }

  const drift = assertLaunchDateNearTarget(launchDate, scheduledPublishAt);
  if (!drift.ok) {
    return {
      ok: false,
      error: drift.error,
      gate: 'launch_date_drift',
      drift_days: drift.drift_days,
    };
  }

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
        publish_date_source: resolved.source,
        scheduled_publish_at: scheduledPublishAt || null,
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
      publish_date_source: resolved.source,
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
    publish_date_source: resolved.source,
    scheduled: scheduledWithTiming,
    timing: timingMeta,
    total: scheduledWithTiming.length,
    rejected: result.rejected || [],
    integrity_summary: result.integrity_summary,
    message:
      `${scheduledWithTiming.length} social posts scheduled for ${slug} on ${launchYmd}` +
      ` (date from ${resolved.source === 'db' ? 'draft scheduled_publish_at' : 'journal markdown'})` +
      (result.integrity_summary ? ` — ${result.integrity_summary}` : '') +
      (timingLines ? `\n\nTiming breakdown:\n${timingLines}` : ''),
  };
}
