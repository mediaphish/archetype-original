/**
 * Check In / Check Out / Mark No-Show
 * 
 * POST /api/operators/events/[id]/check-in
 * 
 * Accountant confirms cash and checks in attendees, marks no-shows, or records early departures.
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
    const { email, target_email, action, cash_confirmed } = req.body;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }
    if (!target_email) {
      return res.status(400).json({ ok: false, error: 'target_email required' });
    }
    if (!action || !['check_in', 'check_out', 'mark_no_show'].includes(action)) {
      return res.status(400).json({ ok: false, error: 'Action must be "check_in", "check_out", or "mark_no_show"' });
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

    // Check permissions - only Accountant can do this
    const canCheckIn = await canPerformAction(email, event.state, 'check_in');
    if (!canCheckIn) {
      return res.status(403).json({ ok: false, error: 'Only Accountants can manage check-ins' });
    }

    // Get or create attendance record
    let { data: attendance } = await supabaseAdmin
      .from('operators_attendance')
      .select('*')
      .eq('event_id', id)
      .eq('user_email', target_email)
      .maybeSingle();

    if (!attendance) {
      // Create attendance record
      const { data: newAttendance, error: createError } = await supabaseAdmin
        .from('operators_attendance')
        .insert({
          event_id: id,
          user_email: target_email,
          checked_in: false,
          votes_used: 0,
          present_until_close: false,
          marked_no_show: false
        })
        .select()
        .single();

      if (createError) {
        console.error('[CHECK_IN] Database error creating attendance:', createError);
        return res.status(500).json({ ok: false, error: 'Failed to create attendance record' });
      }
      attendance = newAttendance;
    }

    if (action === 'check_in') {
      if (!cash_confirmed) {
        return res.status(400).json({ ok: false, error: 'Cash confirmation required for check-in' });
      }

      // Update attendance
      const { data: updatedAttendance, error: updateError } = await supabaseAdmin
        .from('operators_attendance')
        .update({
          checked_in: true,
          check_in_time: new Date().toISOString(),
          marked_no_show: false
        })
        .eq('id', attendance.id)
        .select()
        .single();

      if (updateError) {
        console.error('[CHECK_IN] Database error:', updateError);
        return res.status(500).json({ ok: false, error: 'Failed to check in' });
      }

      // Update RSVP status
      await supabaseAdmin
        .from('operators_rsvps')
        .update({ status: 'attended', checked_in_at: new Date().toISOString() })
        .eq('event_id', id)
        .eq('user_email', target_email);

      return res.status(200).json({ ok: true, attendance: updatedAttendance });
    } else if (action === 'check_out') {
      // Mark early departure
      const { data: updatedAttendance, error: updateError } = await supabaseAdmin
        .from('operators_attendance')
        .update({
          present_until_close: false,
          checked_out_at: new Date().toISOString()
        })
        .eq('id', attendance.id)
        .select()
        .single();

      if (updateError) {
        console.error('[CHECK_OUT] Database error:', updateError);
        return res.status(500).json({ ok: false, error: 'Failed to check out' });
      }

      // Record offense
      await supabaseAdmin
        .from('operators_offenses')
        .insert({
          event_id: id,
          user_email: target_email,
          offense_type: 'early_departure',
          recorded_by_email: email
        });

      return res.status(200).json({ ok: true, attendance: updatedAttendance });
    } else {
      // Mark no-show
      const { data: updatedAttendance, error: updateError } = await supabaseAdmin
        .from('operators_attendance')
        .update({
          marked_no_show: true
        })
        .eq('id', attendance.id)
        .select()
        .single();

      if (updateError) {
        console.error('[MARK_NO_SHOW] Database error:', updateError);
        return res.status(500).json({ ok: false, error: 'Failed to mark no-show' });
      }

      // Update RSVP status
      await supabaseAdmin
        .from('operators_rsvps')
        .update({ status: 'no_show' })
        .eq('event_id', id)
        .eq('user_email', target_email);

      // Record offense (triggers card progression and owed balance)
      await supabaseAdmin
        .from('operators_offenses')
        .insert({
          event_id: id,
          user_email: target_email,
          offense_type: 'no_show',
          recorded_by_email: email
        });

      return res.status(200).json({ ok: true, attendance: updatedAttendance });
    }
  } catch (error) {
    console.error('[CHECK_IN] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
