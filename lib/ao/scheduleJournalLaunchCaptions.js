/**
 * Shared caption scheduling for journal launch posts.
 * Used by api/ao/auto/schedule-journal-launch.js and the schedule_captions tool handler.
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { supabaseAdmin } from '../supabase-admin.js';
import { toScheduledAt, findNextQueueDate, dateFromYmd } from './unifiedScheduler.js';
import { publishDateCalendarOnly } from '../publish-eligibility.mjs';

const CHANNEL_MAP = [
  { key: 'linkedin_personal', platform: 'linkedin', account_id: 'personal', label: 'linkedin_personal' },
  { key: 'instagram_business', platform: 'instagram', account_id: 'meta', label: 'instagram_business' },
  { key: 'facebook_business', platform: 'facebook', account_id: 'meta', label: 'facebook_business' },
  { key: 'twitter', platform: 'twitter', account_id: 'personal', label: 'x' },
];

function readJournalPublishDate(slug) {
  const filePath = path.join(process.cwd(), 'ao-knowledge-hq-kit/journal', `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data } = matter(raw);
  return publishDateCalendarOnly(data?.publish_date);
}

function normalizeInstagramCaption(caption) {
  let text = String(caption || '').trim();
  text = text.replace(/https?:\/\/[^\s]+/g, '').trim();
  if (!text.includes('Link in bio')) {
    text = `${text}\n\nLink in bio.`.trim();
  }
  return text;
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

  const providedCaptions = CHANNEL_MAP.filter(
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
  for (const ch of CHANNEL_MAP) {
    const caption = captions[ch.key];
    if (!caption || !String(caption).trim()) continue;

    let text = String(caption).trim();
    if (ch.platform === 'instagram') {
      text = normalizeInstagramCaption(text);
    }

    rows.push({
      platform: ch.platform,
      account_id: ch.account_id,
      scheduled_at: await toScheduledAt(launchDate, ch.platform),
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
      },
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: 'No valid captions provided' };
  }

  const { data: existingScheduled, error: existingScheduledError } = await supabaseAdmin
    .from('ao_scheduled_posts')
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
      total: 0,
      skipped_as_duplicate: rows.length,
      message: `All ${rows.length} caption row(s) for ${slug} were already scheduled — nothing new to insert.`,
    };
  }

  const { insertScheduledPostsSafely } = await import('../social/scheduledPostIntegrity.js');
  const result = await insertScheduledPostsSafely(newRows, {
    select: 'id, platform, scheduled_at, status',
  });

  if (!result.ok) return { ok: false, error: result.error, rejected: result.rejected };

  return {
    ok: true,
    slug,
    title: title || null,
    journal_url: journalUrl,
    launch_date: `${launchYmd}T12:00:00.000Z`,
    scheduled: result.inserted || [],
    total: (result.inserted || []).length,
    rejected: result.rejected || [],
    integrity_summary: result.integrity_summary,
    message: `${(result.inserted || []).length} social posts scheduled for ${slug}${
      result.integrity_summary ? ` — ${result.integrity_summary}` : ''
    }`,
  };
}
