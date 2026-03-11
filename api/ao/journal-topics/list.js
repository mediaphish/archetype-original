/**
 * AO Automation — List journal topic queue.
 * GET /api/ao/journal-topics/list?email=xxx
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_journal_topic_queue')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    const pending = (data || []).filter((t) => t.status === 'pending');
    const rest = (data || []).filter((t) => t.status !== 'pending');
    return res.status(200).json({ ok: true, topics: [...pending, ...rest] });
  } catch (e) {
    console.error('[ao/journal-topics/list]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
