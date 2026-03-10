/**
 * AO Automation — Reject quote.
 * POST /api/ao/quotes/[id]/reject?email=xxx
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
    const { data, error } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
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
    console.error('[ao/quotes/reject]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
