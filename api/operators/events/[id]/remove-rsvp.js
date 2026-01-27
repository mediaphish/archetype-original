/**
 * Remove RSVP
 * 
 * POST /api/operators/events/[id]/remove-rsvp
 * 
 * Super Admins or Chief Operators can force-remove an RSVP.
 * Auto-promotes from waitlist only if RSVP is not closed.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { hasAnyRole } from '../../../../lib/operators/permissions.js';

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
      return res.status(400).json({ ok: false, error: 'Requester email required' });
    }
    if (!target_email) {
      return res.status(400).json({ ok: false, error: 'Target email to remove required' });
    }

    // Check permissions - only SA or CO can remove RSVPs
    const canRemove = await hasAnyRole(email, ['super_admin', 'chief_operator']);
    if (!canRemove) {
      return res.status(403).json({ ok: false, error: 'Only Super Admins or Chief Operators can remove RSVPs' });
    }

    // Get event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('id, max_seats, rsvp_closed')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    // Find the RSVP to remove
    const { data: existingRSVP, error: fetchError } = await supabaseAdmin
      .from('operators_rsvps')
      .select('*')
      .eq('event_id', id)
      .eq('user_email', target_email)
      .maybeSingle();

    if (fetchError) {
      console.error('[REMOVE_RSVP] Database error fetching RSVP:', fetchError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch RSVP' });
    }

    if (!existingRSVP) {
      return res.status(404).json({ ok: false, error: 'RSVP not found for this user and event' });
    }

    // Delete RSVP
    const { error: deleteError } = await supabaseAdmin
      .from('operators_rsvps')
      .delete()
      .eq('id', existingRSVP.id);

    if (deleteError) {
      console.error('[REMOVE_RSVP] Database error deleting RSVP:', deleteError);
      return res.status(500).json({ ok: false, error: 'Failed to remove RSVP' });
    }

    // If a confirmed RSVP was removed, try to promote from waitlist (only if RSVP is not closed)
    if (existingRSVP.status === 'confirmed' && !event.rsvp_closed) {
      const { data: waitlisted } = await supabaseAdmin
        .from('operators_rsvps')
        .select('*')
        .eq('event_id', id)
        .eq('status', 'waitlisted')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (waitlisted) {
        // Auto-promote first waitlisted (Operators only)
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
