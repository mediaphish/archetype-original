/**
 * AO Automation — Approve quote (optionally with edits).
 * POST /api/ao/quotes/[id]/approve?email=xxx
 * Body (optional): { caption_suggestions, suggested_channels, ... }
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireOwnerEmail } from '../../../../lib/ao/requireOwnerEmail.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireOwnerEmail(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Quote ID required' });
  }

  try {
    let body = {};
    if (typeof req.body === 'object' && req.body !== null) {
      body = req.body;
    }
    const updates = {
      status: 'approved',
      updated_at: new Date().toISOString(),
    };
    if (body.caption_suggestions != null) updates.caption_suggestions = body.caption_suggestions;
    if (body.suggested_channels != null) updates.suggested_channels = body.suggested_channels;

    const { data, error } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ ok: false, error: 'Quote not found' });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res.status(200).json({ ok: true, quote: data });
  } catch (e) {
    console.error('[ao/quotes/approve]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
