/**
 * Get ROi Winner
 * 
 * GET /api/operators/events/[id]/roi
 * 
 * Gets the ROi winner for a CLOSED event. Uses deterministic algorithm.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }

    // Get event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('state')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    // Check state - must be CLOSED
    if (event.state !== 'CLOSED') {
      return res.status(400).json({ ok: false, error: 'ROi winner only available for CLOSED events' });
    }

    // Get ROi winner from database
    const { data: roiWinner, error: roiError } = await supabaseAdmin
      .from('operators_roi_winners')
      .select('*')
      .eq('event_id', id)
      .maybeSingle();

    if (roiError) {
      console.error('[GET_ROI] Database error:', roiError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch ROi winner' });
    }

    if (!roiWinner) {
      return res.status(200).json({ ok: true, roi_winner: null, message: 'No eligible ROi winner' });
    }

    return res.status(200).json({ ok: true, roi_winner: roiWinner });
  } catch (error) {
    console.error('[GET_ROI] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
