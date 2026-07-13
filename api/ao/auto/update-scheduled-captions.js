/**
 * PUT /api/ao/auto/update-scheduled-captions
 *
 * Updates the caption text on scheduled (not yet posted) social posts for a given slug.
 * Called when Auto fires the [UPDATE_SCHEDULED_CAPTIONS] signal after captions are corrected.
 *
 * Body: {
 *   slug: string,           — Journal slug to update captions for
 *   captions: {             — Map of platform key to corrected caption text
 *     linkedin_personal?: string,
 *     instagram_business?: string,
 *     facebook_business?: string,
 *     twitter?: string,
 *   }
 * }
 *
 * Only updates rows with status='scheduled'. Never touches posted rows.
 * Returns list of updated rows.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

const PLATFORM_MAP = {
  linkedin_personal: { platform: 'linkedin', account_id: 'personal' },
  instagram_business: { platform: 'instagram', account_id: 'meta' },
  facebook_business: { platform: 'facebook', account_id: 'meta' },
  twitter: { platform: 'twitter', account_id: 'personal' },
};

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { slug, captions } = req.body || {};

  if (!slug) {
    return res.status(400).json({ ok: false, error: 'slug is required' });
  }

  if (!captions || typeof captions !== 'object' || Object.keys(captions).length === 0) {
    return res.status(400).json({ ok: false, error: 'captions object is required with at least one platform' });
  }

  const safeSlug = String(slug)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const updated = [];
  const errors = [];

  for (const [key, captionText] of Object.entries(captions)) {
    const mapping = PLATFORM_MAP[key];
    if (!mapping) {
      errors.push(`Unknown platform key: ${key}`);
      continue;
    }

    if (!captionText || !String(captionText).trim()) {
      errors.push(`Empty caption for ${key} — skipped`);
      continue;
    }

    let text = String(captionText).trim();

    // Instagram: strip URLs, ensure Link in bio
    if (mapping.platform === 'instagram') {
      text = text.replace(/https?:\/\/[^\s]+/g, '').trim();
      if (!text.includes('Link in bio')) {
        text = `${text}\n\nLink in bio.`;
      }
    }

    try {
      // Find scheduled (not posted) rows for this slug and platform
      const { data: rows, error: fetchErr } = await supabaseAdmin
        .from('ao_scheduled_posts')
        .select('id, platform, caption, status, intent')
        .eq('platform', mapping.platform)
        .eq('account_id', mapping.account_id)
        .eq('status', 'scheduled')
        .filter('intent->>journal_slug', 'eq', safeSlug);

      if (fetchErr) {
        errors.push(`Fetch failed for ${key}: ${fetchErr.message}`);
        continue;
      }

      if (!rows || rows.length === 0) {
        errors.push(`No scheduled rows found for ${key} with slug ${safeSlug}`);
        continue;
      }

      // Update all matching rows
      for (const row of rows) {
        const { error: updateErr } = await supabaseAdmin
          .from('ao_scheduled_posts')
          .update({
            caption: text,
            text,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id)
          .eq('status', 'scheduled'); // Safety: never update posted rows

        if (updateErr) {
          errors.push(`Update failed for ${key} row ${row.id}: ${updateErr.message}`);
        } else {
          updated.push({ id: row.id, platform: mapping.platform, key });
          console.log(`[update-scheduled-captions] Updated ${key} for slug ${safeSlug} (row ${row.id})`);
        }
      }
    } catch (err) {
      errors.push(`Error processing ${key}: ${err?.message || err}`);
    }
  }

  return res.status(200).json({
    ok: updated.length > 0,
    slug: safeSlug,
    updated,
    errors: errors.length > 0 ? errors : null,
    message:
      updated.length > 0
        ? `Updated ${updated.length} scheduled post${updated.length > 1 ? 's' : ''} for ${safeSlug}.${errors.length > 0 ? ` ${errors.length} warning(s): ${errors.join('; ')}` : ''}`
        : `No posts were updated. Errors: ${errors.join('; ')}`,
  });
}
