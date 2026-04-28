import { supabaseAdmin } from '../lib/supabase-admin.js';
import { requireBlpAdmin } from '../lib/badLeaderAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const session = await requireBlpAdmin(req, res);
  if (!session) return;

  try {
    const [pendingRes, flaggedRes] = await Promise.all([
      supabaseAdmin
        .from('blp_submissions')
        .select(
          'id, created_at, region, industry, tone, relevance_reason, original_story, blp_stories(id, neutralized_text, ali_conditions, scoreboard_leadership, classification_confidence, status)',
          { count: 'exact' }
        )
        .eq('status', 'pending')
        .eq('relevance_decision', 'approve')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('blp_submissions')
        .select('id, created_at, region, industry, relevance_reason, original_story', { count: 'exact' })
        .eq('status', 'flagged')
        .eq('relevance_decision', 'flag')
        .order('created_at', { ascending: false }),
    ]);

    if (pendingRes.error) throw pendingRes.error;
    if (flaggedRes.error) throw flaggedRes.error;

    return res.status(200).json({
      pending: pendingRes.data || [],
      flagged: flaggedRes.data || [],
      counts: {
        pending: pendingRes.count || 0,
        flagged: flaggedRes.count || 0,
      },
    });
  } catch (error) {
    console.error('[BLP ADMIN QUEUE] Error:', error);
    return res.status(500).json({ error: 'Failed to load admin queue.' });
  }
}
