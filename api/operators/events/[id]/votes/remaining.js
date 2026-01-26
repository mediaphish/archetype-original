/**
 * Get Remaining Votes
 * 
 * GET /api/operators/events/[id]/votes/remaining?email=xxx
 * 
 * Gets the number of remaining votes for a user in an event.
 */

import { supabaseAdmin } from '../../../../../lib/supabase-admin.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { email } = req.query;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    // Get vote count
    const { count, error } = await supabaseAdmin
      .from('operators_votes')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('voter_email', email);

    if (error) {
      console.error('[REMAINING_VOTES] Database error:', error);
      return res.status(500).json({ ok: false, error: 'Failed to fetch votes' });
    }

    const remaining = Math.max(0, 10 - (count || 0));

    return res.status(200).json({ ok: true, remaining, used: count || 0, total: 10 });
  } catch (error) {
    console.error('[REMAINING_VOTES] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
