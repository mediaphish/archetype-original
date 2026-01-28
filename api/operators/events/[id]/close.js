/**
 * Close Event
 * 
 * POST /api/operators/events/[id]/close
 * 
 * Transitions event from OPEN to CLOSED state. Triggers ROi calculation, promotion resolution,
 * attendance finalization, and loyalty counter updates. Only CO or Accountant can close events.
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
      return res.status(400).json({ ok: false, error: `Event must be OPEN to close. Current state: ${event.state}` });
    }

    // Check permissions
    const canClose = await canPerformAction(email, 'OPEN', 'close_event');
    if (!canClose) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators or Accountants can close events' });
    }

    // Note: Events can be closed without all votes being used.
    // Operators who don't use all votes will receive penalty cards, but the event can still close.

    // FIRST: Finalize attendance - set present_until_close for all checked-in attendees
    // and update votes_used count from actual votes
    // This MUST happen before ROI calculation because calculate_roi_winner requires
    // present_until_close = true and correct votes_used
    const { data: allAttendance } = await supabaseAdmin
      .from('operators_attendance')
      .select('*')
      .eq('event_id', id);

    for (const att of (allAttendance || [])) {
      if (att.checked_in && !att.marked_no_show) {
        // Count actual votes used
        const { count: votesCount } = await supabaseAdmin
          .from('operators_votes')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', id)
          .eq('voter_email', att.user_email);

        // Update attendance: set present_until_close and correct votes_used
        await supabaseAdmin
          .from('operators_attendance')
          .update({
            present_until_close: true,
            votes_used: votesCount || 0
          })
          .eq('id', att.id);
      }
    }

    // NOW: Calculate ROi winner using database function (after attendance is fixed)
    const { data: roiResult, error: roiError } = await supabaseAdmin
      .rpc('calculate_roi_winner', { event_id_param: id });

    if (roiError) {
      console.error('[CLOSE_EVENT] ROi calculation error:', roiError);
      // Continue anyway - ROi might be null if no eligible winners
    }

    // Calculate pot amount if there's a winner
    let potAmountWon = null;
    if (roiResult && roiResult.length > 0) {
      // Count confirmed RSVPs
      const { count: confirmedCount } = await supabaseAdmin
        .from('operators_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id)
        .eq('status', 'confirmed');

      // Calculate total pot: (stake_amount × confirmed_attendees) / 2 + sponsor_pot_value
      const totalPot = (parseFloat(event.stake_amount || 0) * (confirmedCount || 0)) / 2 + parseFloat(event.sponsor_pot_value || 0);
      
      // Calculate winner's pot: 50% of total pot (after 25% host and 25% AO)
      potAmountWon = totalPot * 0.5;
    }

    // Store ROi winner if found
    if (roiResult && roiResult.length > 0) {
      const winner = roiResult[0];
      await supabaseAdmin
        .from('operators_roi_winners')
        .insert({
          event_id: id,
          winner_email: winner.winner_email,
          net_score: winner.net_score,
          upvote_ratio: winner.upvote_ratio,
          total_votes: winner.total_votes,
          check_in_time: winner.check_in_time,
          pot_amount_won: potAmountWon
        });
    }

    // Resolve candidate promotions
    const { data: candidates } = await supabaseAdmin
      .from('operators_candidates')
      .select('candidate_email')
      .eq('event_id', id)
      .eq('status', 'approved');

    for (const candidate of (candidates || [])) {
      // Get promotion votes (yes/no votes for this candidate)
      // Note: This assumes promotion votes are stored separately or calculated from votes
      // For now, we'll create a placeholder - actual implementation depends on promotion voting system
      const { data: promotionVotes } = await supabaseAdmin
        .from('operators_promotions')
        .select('yes_votes, no_votes')
        .eq('event_id', id)
        .eq('candidate_email', candidate.candidate_email)
        .maybeSingle();

      if (promotionVotes) {
        const promoted = promotionVotes.yes_votes > promotionVotes.no_votes;
        
        // Update candidate status
        await supabaseAdmin
          .from('operators_candidates')
          .update({ status: promoted ? 'promoted' : 'denied' })
          .eq('event_id', id)
          .eq('candidate_email', candidate.candidate_email);

        // If promoted, add 'operator' role to user
        if (promoted) {
          const { data: user } = await supabaseAdmin
            .from('operators_users')
            .select('roles')
            .eq('email', candidate.candidate_email)
            .maybeSingle();

          if (user) {
            const newRoles = [...(user.roles || []), 'operator'];
            await supabaseAdmin
              .from('operators_users')
              .update({ roles: newRoles })
              .eq('email', candidate.candidate_email);
          }
        }
      }
    }

    // Update loyalty_count for eligible attendees (after attendance is finalized)
    const { data: finalAttendance } = await supabaseAdmin
      .from('operators_attendance')
      .select('*')
      .eq('event_id', id);

    for (const att of (finalAttendance || [])) {
      if (att.checked_in && !att.marked_no_show) {
        const eligible = await supabaseAdmin.rpc('check_attendance_eligibility', {
          event_id_param: id,
          user_email_param: att.user_email
        });

        if (eligible.data) {
          const { data: user } = await supabaseAdmin
            .from('operators_users')
            .select('loyalty_count')
            .eq('email', att.user_email)
            .maybeSingle();

          if (user) {
            await supabaseAdmin
              .from('operators_users')
              .update({ loyalty_count: (user.loyalty_count || 0) + 1 })
              .eq('email', att.user_email);
          }
        }
      }
    }

    // Update event state to CLOSED
    const { data: updatedEvent, error: updateError } = await supabaseAdmin
      .from('operators_events')
      .update({
        state: 'CLOSED',
        closed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[CLOSE_EVENT] Database error:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to close event' });
    }

    return res.status(200).json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('[CLOSE_EVENT] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
