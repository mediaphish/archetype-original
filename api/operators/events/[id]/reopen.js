/**
 * Reopen Event
 * 
 * POST /api/operators/events/[id]/reopen
 * 
 * Transitions event from CLOSED back to OPEN state. Unlocks topics.
 * Only CO or Accountant can reopen events.
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

    // Check state - must be CLOSED
    if (event.state !== 'CLOSED') {
      return res.status(400).json({ ok: false, error: `Event must be CLOSED to reopen. Current state: ${event.state}` });
    }

    // Check permissions (same as closing - CO or Accountant)
    const canReopen = await canPerformAction(email, 'CLOSED', 'reopen_event');
    if (!canReopen) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators or Accountants can reopen events' });
    }

    // Unlock topics (set is_locked = false)
    const { error: unlockError } = await supabaseAdmin
      .from('operators_event_topics')
      .update({ is_locked: false })
      .eq('event_id', id);

    if (unlockError) {
      console.error('[REOPEN_EVENT] Error unlocking topics:', unlockError);
      // Continue anyway - topics might not exist
    }

    // Update event state to OPEN and clear closed_at
    const { data: updatedEvent, error: updateError } = await supabaseAdmin
      .from('operators_events')
      .update({
        state: 'OPEN',
        closed_at: null
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[REOPEN_EVENT] Database error:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to reopen event' });
    }

    return res.status(200).json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('[REOPEN_EVENT] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
