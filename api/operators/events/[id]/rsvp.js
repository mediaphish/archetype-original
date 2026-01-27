/**
 * RSVP to Event
 * 
 * POST /api/operators/events/[id]/rsvp
 * 
 * RSVPs to an event. If event is full, user is waitlisted.
 * 24-hour notice required for cancellation.
 * Cannot RSVP if rsvp_closed is true.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { canPerformAction, isBenched, hasOwedBalance } from '../../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { email, action } = req.body; // action: 'rsvp' or 'cancel'

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }
    if (!action || !['rsvp', 'cancel'].includes(action)) {
      return res.status(400).json({ ok: false, error: 'Action must be "rsvp" or "cancel"' });
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

    // Check state - must be LIVE
    if (event.state !== 'LIVE') {
      return res.status(400).json({ ok: false, error: 'Can only RSVP to LIVE events' });
    }

    // Check if RSVP is closed (for new RSVPs only)
    if (action === 'rsvp' && event.rsvp_closed) {
      return res.status(400).json({ ok: false, error: 'RSVP is closed for this event' });
    }

    // Check permissions
    const canRSVP = await canPerformAction(email, 'LIVE', 'rsvp');
    if (!canRSVP) {
      return res.status(403).json({ ok: false, error: 'You do not have permission to RSVP' });
    }

    // Check if benched
    if (await isBenched(email)) {
      return res.status(403).json({ ok: false, error: 'You are benched and cannot RSVP' });
    }

    // Check if has owed balance
    if (await hasOwedBalance(email)) {
      return res.status(403).json({ ok: false, error: 'You have an owed balance and cannot RSVP until it is paid' });
    }

    if (action === 'rsvp') {
      // Check if already RSVP'd
      const { data: existingRSVP } = await supabaseAdmin
        .from('operators_rsvps')
        .select('*')
        .eq('event_id', id)
        .eq('user_email', email)
        .maybeSingle();

      if (existingRSVP) {
        return res.status(400).json({ ok: false, error: 'You have already RSVP\'d to this event' });
      }

      // Get confirmed count
      const { count: confirmedCount } = await supabaseAdmin
        .from('operators_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id)
        .eq('status', 'confirmed');

      // Determine status
      const status = (confirmedCount || 0) < event.max_seats ? 'confirmed' : 'waitlisted';

      // Create RSVP
      const { data: rsvp, error: rsvpError } = await supabaseAdmin
        .from('operators_rsvps')
        .insert({
          event_id: id,
          user_email: email,
          status
        })
        .select()
        .single();

      if (rsvpError) {
        console.error('[RSVP] Database error:', rsvpError);
        return res.status(500).json({ ok: false, error: 'Failed to create RSVP' });
      }

      return res.status(200).json({ ok: true, rsvp });
    } else {
      // Cancel RSVP
      const { data: existingRSVP } = await supabaseAdmin
        .from('operators_rsvps')
        .select('*')
        .eq('event_id', id)
        .eq('user_email', email)
        .maybeSingle();

      if (!existingRSVP) {
        return res.status(400).json({ ok: false, error: 'You have not RSVP\'d to this event' });
      }

      // Check 24-hour notice
      const eventDate = new Date(event.event_date);
      const now = new Date();
      const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

      if (hoursUntilEvent < 24) {
        return res.status(400).json({
          ok: false,
          error: 'Cannot cancel RSVP: less than 24 hours until event. Cancellation will result in a no-show offense.'
        });
      }

      // Delete RSVP
      const { error: deleteError } = await supabaseAdmin
        .from('operators_rsvps')
        .delete()
        .eq('event_id', id)
        .eq('user_email', email);

      if (deleteError) {
        console.error('[CANCEL_RSVP] Database error:', deleteError);
        return res.status(500).json({ ok: false, error: 'Failed to cancel RSVP' });
      }

      // Promote from waitlist if there's space AND RSVP is not closed
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

      return res.status(200).json({ ok: true, message: 'RSVP cancelled' });
    }
  } catch (error) {
    console.error('[RSVP] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
