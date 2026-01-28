/**
 * Revert Event to LIVE
 * 
 * POST /api/operators/events/[id]/revert-to-live
 * 
 * Transitions event from OPEN back to LIVE state. Unlocks scenarios and resets RSVP status.
 * Only CO or Accountant can revert events.
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
      .select('*')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    // Check state - must be OPEN
    if (event.state !== 'OPEN') {
      return res.status(400).json({ ok: false, error: `Event must be OPEN to revert to LIVE. Current state: ${event.state}` });
    }

    // Check permissions (same as opening/closing - CO or Accountant)
    const canRevert = await canPerformAction(email, 'OPEN', 'revert_to_live');
    if (!canRevert) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators or Accountants can revert events to LIVE' });
    }

    // Unlock scenarios (set is_locked = false)
    const { error: unlockError } = await supabaseAdmin
      .from('operators_event_scenarios')
      .update({ is_locked: false })
      .eq('event_id', id);

    if (unlockError) {
      console.error('[REVERT_TO_LIVE] Error unlocking scenarios:', unlockError);
      // Continue anyway - scenarios might not exist
    }

    // Update event state to LIVE, clear opened_at/closed_at, and reset rsvp_closed to allow RSVPs again
    console.log('[REVERT_TO_LIVE] Attempting to update event. Current state:', event.state, 'Event ID:', id);
    
    const { data: updatedEvent, error: updateError } = await supabaseAdmin
      .from('operators_events')
      .update({
        state: 'LIVE',
        opened_at: null,
        closed_at: null,  // Clear closed_at if it exists
        rsvp_closed: false  // Reset RSVP status to allow new RSVPs
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[REVERT_TO_LIVE] Database error:', updateError);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to revert event to LIVE',
        details: updateError.message || 'Database error'
      });
    }

    if (!updatedEvent) {
      console.error('[REVERT_TO_LIVE] No event returned after update');
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to revert event to LIVE',
        details: 'Event update completed but no data returned'
      });
    }

    // Verify state was updated
    if (updatedEvent.state !== 'LIVE') {
      console.error('[REVERT_TO_LIVE] State was not updated to LIVE. Current state:', updatedEvent.state);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to revert event to LIVE',
        details: `State update failed. Current state: ${updatedEvent.state}`
      });
    }

    // Verify rsvp_closed was updated
    if (updatedEvent.rsvp_closed !== false) {
      console.warn('[REVERT_TO_LIVE] Warning: rsvp_closed was not set to false. Current value:', updatedEvent.rsvp_closed);
      // Force it in the response and try to fix in database
      await supabaseAdmin
        .from('operators_events')
        .update({ rsvp_closed: false })
        .eq('id', id);
      updatedEvent.rsvp_closed = false;
    }

    console.log('[REVERT_TO_LIVE] Event successfully reverted to LIVE. State:', updatedEvent.state, 'RSVP Closed:', updatedEvent.rsvp_closed);

    return res.status(200).json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('[REVERT_TO_LIVE] Error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Server error',
      details: error.message || 'Unknown error'
    });
  }
}
