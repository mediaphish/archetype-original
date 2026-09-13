/**
 * POST /api/ao/auto/manual-post
 *
 * Records that Bart posted a journal post by hand to a manual-only channel.
 *
 * LinkedIn Business (until LinkedIn grants API access) and Facebook Personal are
 * posted by hand. Nothing recorded that happening, so the Schedule & Publish tab
 * could list them but never mark them done. Stored on the journal draft's
 * existing metadata jsonb, so no migration:
 *
 *   metadata.manual_posts = { linkedin_business: { posted_at: ISO } }
 *
 * Body: { slug, channel, posted }  (posted false clears the mark)
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { contentDrafts } from '../../../lib/db/contentDrafts.js';
import { isManualChannelKey } from '../../../lib/ao/journalPanelData.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const slug = String(body.slug || '').trim();
    const channel = String(body.channel || '').trim();
    const posted = body.posted !== false;

    if (!slug) return res.status(400).json({ ok: false, error: 'slug is required' });
    if (!isManualChannelKey(channel)) {
      return res.status(400).json({ ok: false, error: 'channel must be linkedin_business or facebook_personal' });
    }

    const email = auth.email.toLowerCase().trim();
    const { data: row, error: loadError } = await contentDrafts()
      .select('id, metadata')
      .eq('created_by_email', email)
      .eq('kind', 'journal')
      .eq('slug', slug)
      .neq('status', 'abandoned')
      .maybeSingle();

    if (loadError) return res.status(500).json({ ok: false, error: loadError.message });
    if (!row) return res.status(404).json({ ok: false, error: 'Draft not found' });

    const metadata = row.metadata && typeof row.metadata === 'object' ? { ...row.metadata } : {};
    const manualPosts = { ...(metadata.manual_posts || {}) };
    if (posted) {
      manualPosts[channel] = { posted_at: new Date().toISOString() };
    } else {
      delete manualPosts[channel];
    }
    metadata.manual_posts = manualPosts;

    const { error: updateError } = await contentDrafts()
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (updateError) return res.status(500).json({ ok: false, error: updateError.message });

    return res.status(200).json({ ok: true, manual_posts: manualPosts });
  } catch (err) {
    console.error('[manual-post]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
