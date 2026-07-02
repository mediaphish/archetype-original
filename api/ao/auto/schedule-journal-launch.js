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

const CHANNEL_MAP = [
  { key: 'linkedin_personal', platform: 'linkedin', account_id: 'personal', label: 'linkedin_personal' },
  { key: 'linkedin_business', platform: 'linkedin', account_id: 'page_1', label: 'linkedin_business' },
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

  const rows = [];
  for (const ch of CHANNEL_MAP) {
    const caption = captions[ch.key];
    if (!caption) continue;

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
      source_kind: 'ao_journal_social',
      intent: {
        auto_hub: true,
        channel_label: ch.label,
        slug,
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

  const { data, error } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .insert(rows)
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
