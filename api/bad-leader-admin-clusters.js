import { supabaseAdmin } from '../lib/supabase-admin.js';
import { requireBlpAdmin } from '../lib/badLeaderAuth.js';

export default async function handler(req, res) {
  const session = await requireBlpAdmin(req, res);
  if (!session) return;

  if (req.method === 'PATCH') {
    try {
      const clusterId = String(req.body?.clusterId || '').trim();
      const label = req.body?.label == null ? null : String(req.body.label).trim();
      if (!clusterId) return res.status(400).json({ error: 'clusterId is required.' });

      const { error } = await supabaseAdmin.from('blp_clusters').update({ label: label || null }).eq('id', clusterId);
      if (error) throw error;

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('[BLP ADMIN CLUSTERS] PATCH error:', error);
      return res.status(500).json({ error: 'Failed to update cluster label.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
