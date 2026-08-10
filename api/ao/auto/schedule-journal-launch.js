/**
 * POST /api/ao/auto/schedule-journal-launch
 *
 * Schedules social captions for a journal entry on its publish date (or next weekday slot).
 * Writes rows to ao_scheduled_posts using only real table columns — slug/title live in intent JSON.
 *
 * Body: {
 *   slug: string,
 *   title?: string,
 *   captions: {
 *     linkedin_personal?: string,
 *     linkedin_business?: string,
 *     instagram_business?: string,
 *     facebook_business?: string,
 *     twitter?: string,
 *   }
 * }
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { toScheduledAt, findNextQueueDate, dateFromYmd } from '../../../lib/ao/unifiedScheduler.js';
import { publishDateCalendarOnly } from '../../../lib/publish-eligibility.mjs';

// LINKEDIN BUSINESS — EXCLUDED FROM AUTOMATED QUEUE
// Requires Community Management API via second LinkedIn developer app ("AO Page Publisher").
// App is pending LinkedIn review as of July 2026.
// Do not re-enable until: (1) LinkedIn approves the app, (2) cursor-prompt-linkedin-business-enable.md is executed.
// When re-enabled: account_id must be set to 'page', token path must use ao_linkedin_tokens.page_urn.
// Auto still generates LinkedIn Business captions in chat for manual paste. Only the queue row is excluded.
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

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { slug, title, captions } = req.body || {};

  if (!slug) {
    return res.status(400).json({ ok: false, error: 'slug is required' });
  }

  if (!captions || typeof captions !== 'object') {
    return res.status(400).json({ ok: false, error: 'captions object is required' });
  }

  const journalUrl = `https://www.archetypeoriginal.com/journal/${slug}`;
  const publishYmd = readJournalPublishDate(slug);
  const launchDate = dateFromYmd(publishYmd) || (await findNextQueueDate(0));
  const launchYmd = launchDate.toISOString().split('T')[0];

  // Validate that at least one caption was provided
  const providedCaptions = CHANNEL_MAP.filter(
    (ch) => captions[ch.key] && String(captions[ch.key]).trim()
  );
  if (providedCaptions.length === 0) {
    return res.status(400).json({
      ok: false,
      error:
        'No captions provided. At least one platform caption is required to schedule journal launch posts.',
    });
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
      // Match the field names every other real row and publish-journal.js's own
      // duplicate guard already use ('journal_launch' / intent.journal_slug) --
      // this endpoint previously used 'ao_journal_social' / intent.slug, which
      // meant nothing else in the system could ever detect rows it created.
      source_kind: 'journal_launch',
      intent: {
        auto_hub: true,
        channel_label: ch.label,
        journal_slug: slug,
        title: title || null,
        journal_url: journalUrl,
        publish_date: publishYmd,
        created_by_email: auth.email,
      },
    });
  }

  if (rows.length === 0) {
    return res.status(400).json({ ok: false, error: 'No valid captions provided' });
  }

  // Guard against double-scheduling -- same pattern as publish-journal.js's existing
  // duplicate-publish guard (commit 64bed13ab). Without this, clicking "Schedule social
  // posts" on an already-scheduled post inserts a second full set of rows, and any that
  // haven't posted yet go out twice per platform.
  const { data: existingScheduled, error: existingScheduledError } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .select('platform, account_id')
    .eq('source_kind', 'journal_launch')
    .contains('intent', { journal_slug: slug })
    .neq('status', 'failed');

  if (existingScheduledError) {
    console.error(
      '[schedule-journal-launch] Could not check for already-scheduled captions, proceeding without dedup:',
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
      `[schedule-journal-launch] Skipped ${skippedCount} caption row(s) already scheduled for ${slug} — avoiding duplicate social posts.`
    );
  }

  if (newRows.length === 0) {
    return res.status(200).json({
      ok: true,
      slug,
      title: title || null,
      journal_url: journalUrl,
      launch_date: `${launchYmd}T12:00:00.000Z`,
      scheduled: [],
      total: 0,
      skipped_as_duplicate: rows.length,
      message: `All ${rows.length} caption row(s) for ${slug} were already scheduled — nothing new to insert.`,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .insert(newRows)
    .select('id, platform, scheduled_at, status');

  if (error) {
    console.error('[schedule-journal-launch]', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.status(200).json({
    ok: true,
    slug,
    title: title || null,
    journal_url: journalUrl,
    launch_date: `${launchYmd}T12:00:00.000Z`,
    scheduled: data || [],
    total: (data || []).length,
    message: `${(data || []).length} social posts scheduled for ${slug}`,
  });
}
