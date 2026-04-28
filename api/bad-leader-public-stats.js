import { supabaseAdmin } from '../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const [{ count: submissionCount, error: subErr }, { count: publishedCount, error: pubErr }, { count: clusterCount, error: clusterErr }, { data: industries, error: indErr }] =
      await Promise.all([
        supabaseAdmin.from('blp_submissions').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('blp_stories').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabaseAdmin.from('blp_clusters').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('blp_stories').select('industry').eq('status', 'approved'),
      ]);
    if (subErr || pubErr || clusterErr || indErr) throw subErr || pubErr || clusterErr || indErr;

    const industriesRepresented = new Set((industries || []).map((i) => i.industry)).size;

    return res.status(200).json({
      totalSubmitted: submissionCount || 0,
      totalPublished: publishedCount || 0,
      patternClusters: clusterCount || 0,
      industriesRepresented,
    });
  } catch (error) {
    console.error('[BLP PUBLIC STATS] Error:', error);
    return res.status(500).json({ error: 'Failed to load public stats.' });
  }
}
