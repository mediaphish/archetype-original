/**
 * POST /api/ao/auto/attach-captions
 *
 * Attaches social captions to an already-published journal entry.
 * Writes rows to ao_scheduled_posts without touching GitHub or triggering redeploy.
 * Used when [PUBLISH_JOURNAL] fires for a slug that already exists as published.
 *
 * Body: {
 *   slug: string,
 *   captions: {
 *     linkedin_personal: string,
 *     linkedin_business: string,
 *     instagram_business: string,
 *     facebook_business: string,
 *     twitter: string,
 *   }
 * }
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

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

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { slug, captions } = req.body || {};

  if (!slug) {
    return res.status(400).json({ ok: false, error: 'slug is required' });
  }

  if (!captions || typeof captions !== 'object') {
    return res.status(400).json({ ok: false, error: 'captions object is required' });
  }

  const journalUrl = `https://www.archetypeoriginal.com/journal/${slug}`;
  const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now

  const rows = [];
  for (const ch of CHANNEL_MAP) {
    const caption = captions[ch.key];
    if (!caption) continue;

    // Fix Instagram — replace any URL in the body with "Link in bio."
    let text = caption;
    if (ch.platform === 'instagram') {
      text = text.replace(/https?:\/\/[^\s]+/g, '').trim();
      if (!text.includes('Link in bio')) {
        text = text + '\n\nLink in bio.';
      }
    }

    rows.push({
      platform: ch.platform,
      account_id: ch.account_id,
      scheduled_at: scheduledAt,
      text,
      caption: text,
      status: 'scheduled',
      source_kind: 'ao_journal_social',
      intent: {
        auto_hub: true,
        channel_label: ch.label,
        slug,
        journal_url: journalUrl,
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
    console.error('[attach-captions]', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.status(200).json({
    ok: true,
    slug,
    journal_url: journalUrl,
    scheduled: data || [],
    total: (data || []).length,
    message: `${(data || []).length} social posts scheduled for ${slug}`,
  });
}
