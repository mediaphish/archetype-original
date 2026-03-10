/**
 * AO Automation — List quote review queue (pending first).
 * GET /api/ao/quotes/list?email=xxx
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireOwnerEmail } from '../../../lib/ao/requireOwnerEmail.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireOwnerEmail(req, res);
  if (!auth) return;

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    const pending = (data || []).filter((q) => q.status === 'pending');
    const rest = (data || []).filter((q) => q.status !== 'pending');
    return res.status(200).json({ ok: true, quotes: [...pending, ...rest] });
  } catch (e) {
    console.error('[ao/quotes/list]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
