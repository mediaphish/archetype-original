/**
 * AO Automation — Approve journal topic.
 * POST /api/ao/journal-topics/[id]/approve?email=xxx
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
    return res.status(400).json({ ok: false, error: 'Topic ID required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_journal_topic_queue')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ ok: false, error: 'Topic not found' });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res.status(200).json({ ok: true, topic: data });
  } catch (e) {
    console.error('[ao/journal-topics/approve]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
