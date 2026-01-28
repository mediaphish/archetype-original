/**
 * Open Event
 * 
 * POST /api/operators/events/[id]/open
 * 
 * Transitions event from LIVE to OPEN state. Only CO or Accountant can open events.
 * Locks all scenarios for the event when opening.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { canPerformAction } from '../../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { email } = req.body;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    // Get current event state
    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('state')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    // Check state - must be LIVE
    if (event.state !== 'LIVE') {
      return res.status(400).json({ ok: false, error: `Event must be LIVE to open. Current state: ${event.state}` });
    }

    // Check permissions
    const canOpen = await canPerformAction(email, 'LIVE', 'open_event');
    if (!canOpen) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators or Accountants can open events' });
    }

    // Update event state
    const { data: updatedEvent, error: updateError } = await supabaseAdmin
      .from('operators_events')
      .update({
        state: 'OPEN',
        opened_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[OPEN_EVENT] Database error:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to open event' });
    }

    // Lock all scenarios for this event
    const { error: lockError } = await supabaseAdmin
      .from('operators_event_scenarios')
      .update({ is_locked: true })
      .eq('event_id', id);

    if (lockError) {
      console.error('[OPEN_EVENT] Error locking topics:', lockError);
      // Don't fail the request if topic locking fails, but log it
    }

    return res.status(200).json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('[OPEN_EVENT] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
