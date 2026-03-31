import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const actionLogId = req.body?.action_log_id;
  if (!actionLogId) return res.status(400).json({ ok: false, error: 'action_log_id required' });

  try {
    const out = await supabaseAdmin
      .from('ao_auto_action_log')
      .select('*')
      .eq('id', actionLogId)
      .eq('created_by_email', auth.email)
      .single();
    if (out.error) throw out.error;

    const log = out.data;
    if (log.undone_at) return res.status(200).json({ ok: true, already_undone: true });

    const ids = Array.isArray(log?.undo_payload?.scheduled_post_ids) ? log.undo_payload.scheduled_post_ids : [];
    if (!ids.length) return res.status(400).json({ ok: false, error: 'Nothing to undo for this action yet.' });

    const del = await supabaseAdmin
      .from('ao_scheduled_posts')
      .delete()
      .eq('status', 'scheduled')
      .in('id', ids);
    if (del.error) throw del.error;

    await supabaseAdmin
      .from('ao_auto_action_log')
      .update({ undone_at: new Date().toISOString() })
      .eq('id', actionLogId)
      .eq('created_by_email', auth.email);

    return res.status(200).json({ ok: true, undone_ids: ids });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
