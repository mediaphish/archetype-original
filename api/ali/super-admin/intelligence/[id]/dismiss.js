/**
 * ALI Super Admin Intelligence Dismiss
 * 
 * POST /api/ali/super-admin/intelligence/:id/dismiss
 * 
 * Marks an intelligence item as resolved by setting dismissed_at.
 * Frontend optimistically removes the item from local state.
 */

import { supabaseAdmin } from '../../../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ ok: false, error: 'Missing id parameter' });
  }

  try {
    const { error } = await supabaseAdmin
      .from('ali_intelligence_items')
      .update({
        dismissed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('[intelligence/dismiss.js] Update error:', error);
      return res.status(500).json({ ok: false, error: 'Failed to dismiss item' });
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[intelligence/dismiss.js] Unexpected error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
