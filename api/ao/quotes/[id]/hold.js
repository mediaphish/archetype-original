/**
 * AO Automation — Hold quote (keeps it out of the main pending list).
 * POST /api/ao/quotes/[id]/hold
 * Body (optional): { reason: string }
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Quote ID required' });
  }

  const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 300) : null;

  try {
    // Try to save hold metadata if columns exist; fall back if they don't.
    try {
      const { data, error } = await supabaseAdmin
        .from('ao_quote_review_queue')
        .update({
          status: 'held',
          held_at: new Date().toISOString(),
          hold_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ ok: true, quote: data });
    } catch (e2) {
      const msg = String(e2?.message || e2 || '');
      const missingColumns = msg.includes('held_at') || msg.includes('hold_reason');
      if (!missingColumns) throw e2;

      const { data, error } = await supabaseAdmin
        .from('ao_quote_review_queue')
        .update({ status: 'held', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Quote not found' });
        return res.status(500).json({ ok: false, error: error.message });
      }
      return res.status(200).json({ ok: true, quote: data });
    }
  } catch (e) {
    console.error('[ao/quotes/hold]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

