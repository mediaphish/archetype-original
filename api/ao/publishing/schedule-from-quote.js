/**
 * AO Automation — Publishing: schedule posts from a Studio item (quote queue row).
 * POST /api/ao/publishing/schedule-from-quote
 * Body: { quote_id, schedule: { linkedin?: iso, facebook?: iso, instagram?: iso, x?: iso }, edits?: { channel: text } }
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

function parseIso(v) {
  if (!v) return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toPlatform(channel) {
  if (channel === 'x') return 'twitter';
  return channel;
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const quoteId = req.body?.quote_id;
  if (!quoteId) return res.status(400).json({ ok: false, error: 'quote_id required' });

  const schedule = req.body?.schedule && typeof req.body.schedule === 'object' ? req.body.schedule : {};
  const edits = req.body?.edits && typeof req.body.edits === 'object' ? req.body.edits : {};

  try {
    const { data: quote, error: fetchErr } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Not found' });
      return res.status(500).json({ ok: false, error: fetchErr.message });
    }

    if (quote.status !== 'approved') return res.status(400).json({ ok: false, error: 'Not approved' });
    if (quote.next_stage !== 'publisher') return res.status(400).json({ ok: false, error: 'Not routed to Publisher' });

    const draftsByChannel = quote.drafts_by_channel && typeof quote.drafts_by_channel === 'object' ? quote.drafts_by_channel : {};
    const firstByChannel = quote.first_comment_suggestions && typeof quote.first_comment_suggestions === 'object' ? quote.first_comment_suggestions : {};

    const rows = [];
    const channels = ['linkedin', 'facebook', 'instagram', 'x'];
    for (const c of channels) {
      const when = parseIso(schedule[c]);
      if (!when) continue;
      const text = String(edits[c] || draftsByChannel[c] || '').trim();
      if (!text) continue;
      const platform = toPlatform(c);
      const first_comment = String(firstByChannel[c] || '').trim() || null;
      rows.push({
        platform,
        account_id: platform === 'facebook' || platform === 'instagram' ? 'meta' : 'personal',
        scheduled_at: when,
        text,
        image_url: null,
        first_comment,
        status: 'scheduled',
      });
    }

    if (rows.length === 0) return res.status(400).json({ ok: false, error: 'No scheduled channels provided' });

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .insert(rows)
      .select('id, platform, scheduled_at, status');

    if (insErr) return res.status(500).json({ ok: false, error: insErr.message });

    // Clear routing so it doesn't keep showing up in Drafts.
    try {
      await supabaseAdmin
        .from('ao_quote_review_queue')
        .update({ next_stage: null, updated_at: new Date().toISOString() })
        .eq('id', quoteId);
    } catch (_) {}

    return res.status(200).json({ ok: true, scheduled: inserted || [] });
  } catch (e) {
    console.error('[ao/publishing/schedule-from-quote]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

