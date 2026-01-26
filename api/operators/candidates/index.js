/**
 * List All Candidates
 * 
 * GET /api/operators/candidates?email=xxx&status=pending
 * 
 * Lists all candidates across all events, optionally filtered by status
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { getUserOperatorsRoles } from '../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { email, status } = req.query;

    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    // Check permissions - only CO and SA can view all candidates
    const roles = await getUserOperatorsRoles(email);
    if (!roles.includes('chief_operator') && !roles.includes('super_admin')) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators can view all candidates' });
    }

    // Build query
    let query = supabaseAdmin
      .from('operators_candidates')
      .select(`
        *,
        operators_events (
          id,
          title,
          event_date,
          state
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status && ['pending', 'approved', 'denied', 'promoted'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: candidates, error } = await query;

    if (error) {
      console.error('[LIST_CANDIDATES] Database error:', error);
      return res.status(500).json({ ok: false, error: 'Failed to fetch candidates' });
    }

    return res.status(200).json({ ok: true, candidates: candidates || [] });
  } catch (error) {
    console.error('[LIST_CANDIDATES] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
