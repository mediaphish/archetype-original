/**
 * ALI Super Admin Intelligence Feed
 * 
 * GET /api/ali/super-admin/intelligence
 * 
 * Returns AI-generated intelligence items for super admin review.
 * Items are generated weekly by /api/cron/generate-intelligence.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch intelligence items, most recent first
    // Include all items (pending count is calculated client-side based on dismissed_at)
    const { data: items, error } = await supabaseAdmin
      .from('ali_intelligence_items')
      .select('id, company_id, company_name, leader_name, priority, type, metrics, description, recommendations, conclusion, dismissed_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[intelligence.js] Error fetching items:', error);
      return res.status(500).json({ ok: false, error: 'Failed to fetch intelligence items', detail: error.message });
    }

    // Transform to match frontend expected shape (camelCase for some fields)
    const transformedItems = (items || []).map(item => ({
      id: item.id,
      companyName: item.company_name,
      leaderName: item.leader_name,
      timestamp: item.created_at,
      priority: item.priority,
      type: item.type,
      metrics: item.metrics,
      description: item.description,
      recommendations: item.recommendations || [],
      conclusion: item.conclusion,
      dismissed_at: item.dismissed_at
    }));

    return res.status(200).json({
      ok: true,
      items: transformedItems
    });

  } catch (error) {
    console.error('[intelligence.js] Unexpected error:', error);
    return res.status(500).json({ ok: false, error: 'Server error', detail: error.message });
  }
}
