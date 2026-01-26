/**
 * Promote from Waitlist
 * 
 * POST /api/operators/events/[id]/promote-waitlist
 * 
 * Manually promotes a user from waitlist to confirmed. Only CO or Accountant can do this.
 * Only Operators can be promoted (Candidates cannot be added late).
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
    const { email, target_email } = req.body;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }
    if (!target_email) {
      return res.status(400).json({ ok: false, error: 'target_email required' });
    }

    // Get event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('*')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    // Check permissions - CO or Accountant
    const canPromote = await canPerformAction(email, event.state, 'promote_waitlist');
    if (!canPromote) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators or Accountants can promote from waitlist' });
    }

    // Check if target is waitlisted
    const { data: waitlistedRSVP } = await supabaseAdmin
      .from('operators_rsvps')
      .select('*')
      .eq('event_id', id)
      .eq('user_email', target_email)
      .eq('status', 'waitlisted')
      .maybeSingle();

    if (!waitlistedRSVP) {
      return res.status(400).json({ ok: false, error: 'User is not waitlisted for this event' });
    }

    // Check if target is an Operator (Candidates cannot be added late)
    const { data: targetUser } = await supabaseAdmin
      .from('operators_users')
      .select('roles')
      .eq('email', target_email)
      .maybeSingle();

    if (!targetUser || !targetUser.roles || !targetUser.roles.includes('operator')) {
      return res.status(400).json({ ok: false, error: 'Only Operators can be promoted from waitlist. Candidates cannot be added late.' });
    }

    // Check if there's space
    const { count: confirmedCount } = await supabaseAdmin
      .from('operators_rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('status', 'confirmed');

    if ((confirmedCount || 0) >= event.max_seats) {
      return res.status(400).json({ ok: false, error: 'Event is full' });
    }

    // Promote
    const { data: updatedRSVP, error: updateError } = await supabaseAdmin
      .from('operators_rsvps')
      .update({ status: 'confirmed' })
      .eq('id', waitlistedRSVP.id)
      .select()
      .single();

    if (updateError) {
      console.error('[PROMOTE_WAITLIST] Database error:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to promote from waitlist' });
    }

    return res.status(200).json({ ok: true, rsvp: updatedRSVP });
  } catch (error) {
    console.error('[PROMOTE_WAITLIST] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
