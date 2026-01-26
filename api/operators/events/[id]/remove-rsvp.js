/**
 * Remove RSVP (Admin)
 * 
 * POST /api/operators/events/[id]/remove-rsvp
 * 
 * Allows SA or CO to remove any operator from an event (force remove, bypasses 24-hour rule).
 * If removed user was confirmed, auto-promotes first waitlisted operator.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { hasRole } from '../../../../lib/operators/permissions.js';

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

    // Check permissions - only SA or CO can remove operators
    const isSA = await hasRole(email, 'super_admin');
    const isCO = await hasRole(email, 'chief_operator');
    
    if (!isSA && !isCO) {
      return res.status(403).json({ ok: false, error: 'Only Super Admins or Chief Operators can remove operators from events' });
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

    // Find RSVP for target_email
    const { data: targetRSVP, error: rsvpError } = await supabaseAdmin
      .from('operators_rsvps')
      .select('*')
      .eq('event_id', id)
      .eq('user_email', target_email)
      .maybeSingle();

    if (rsvpError) {
      console.error('[REMOVE_RSVP] Database error:', rsvpError);
      return res.status(500).json({ ok: false, error: 'Failed to find RSVP' });
    }

    if (!targetRSVP) {
      return res.status(400).json({ ok: false, error: 'User has not RSVP\'d to this event' });
    }

    const wasConfirmed = targetRSVP.status === 'confirmed';

    // Delete the RSVP
    const { error: deleteError } = await supabaseAdmin
      .from('operators_rsvps')
      .delete()
      .eq('id', targetRSVP.id);

    if (deleteError) {
      console.error('[REMOVE_RSVP] Database error:', deleteError);
      return res.status(500).json({ ok: false, error: 'Failed to remove RSVP' });
    }

    // If removed user was confirmed, auto-promote first waitlisted operator
    if (wasConfirmed) {
      const { data: waitlisted } = await supabaseAdmin
        .from('operators_rsvps')
        .select('*')
        .eq('event_id', id)
        .eq('status', 'waitlisted')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (waitlisted) {
        // Check if waitlisted user is an Operator (Candidates cannot be added late)
        const { data: waitlistedUser } = await supabaseAdmin
          .from('operators_users')
          .select('roles')
          .eq('email', waitlisted.user_email)
          .maybeSingle();

        if (waitlistedUser && waitlistedUser.roles && waitlistedUser.roles.includes('operator')) {
          await supabaseAdmin
            .from('operators_rsvps')
            .update({ status: 'confirmed' })
            .eq('id', waitlisted.id);
        }
      }
    }

    return res.status(200).json({ ok: true, message: 'RSVP removed successfully' });
  } catch (error) {
    console.error('[REMOVE_RSVP] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
