/**
 * Recalculate ROI Winner for Closed Event
 * 
 * POST /api/operators/events/[id]/recalculate-roi
 * 
 * Fixes attendance records and recalculates ROI winner for a closed event.
 * This is useful when attendance records weren't properly finalized during close.
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

    // Check permissions
    const canRecalculate = await canPerformAction(email, 'CLOSED', 'close_event');
    if (!canRecalculate) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators or Accountants can recalculate ROI' });
    }

    // Fix attendance records - set present_until_close and update votes_used
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

    // Delete existing ROI winner if any
    await supabaseAdmin
      .from('operators_roi_winners')
      .delete()
      .eq('event_id', id);

    // Calculate ROi winner using database function
    const { data: roiResult, error: roiError } = await supabaseAdmin
      .rpc('calculate_roi_winner', { event_id_param: id });

    if (roiError) {
      console.error('[RECALCULATE_ROI] ROi calculation error:', roiError);
      return res.status(500).json({ ok: false, error: 'Failed to calculate ROI winner', details: roiError.message });
    }

    // Calculate pot amount if there's a winner
    let potAmountWon = null;
    if (roiResult && roiResult.length > 0) {
      // Count checked-in attendees (attended or confirmed RSVPs)
      const { count: confirmedCount } = await supabaseAdmin
        .from('operators_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id)
        .eq('checked_in', true)
        .eq('marked_no_show', false);

      // Calculate stake pot: stake_amount × confirmed_attendees
      // Breakdown: 25% Host, 25% AO, 50% ROI winner + full sponsor pot
      const stakePot = parseFloat(event.stake_amount || 0) * (confirmedCount || 0);
      const sponsorPot = parseFloat(event.sponsor_pot_value || 0);
      
      // ROI winner gets: 50% of stake pot + full sponsor pot
      potAmountWon = (stakePot * 0.5) + sponsorPot;
    }

    // Store ROi winner if found
    if (roiResult && roiResult.length > 0) {
      const winner = roiResult[0];
      const { error: insertError } = await supabaseAdmin
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

      if (insertError) {
        console.error('[RECALCULATE_ROI] Insert error:', insertError);
        return res.status(500).json({ ok: false, error: 'Failed to store ROI winner', details: insertError.message });
      }

      return res.status(200).json({ 
        ok: true, 
        roi_winner: {
          winner_email: winner.winner_email,
          net_score: winner.net_score,
          upvote_ratio: winner.upvote_ratio,
          total_votes: winner.total_votes,
          pot_amount_won: potAmountWon
        }
      });
    } else {
      return res.status(200).json({ 
        ok: true, 
        message: 'No eligible ROI winner found',
        roi_winner: null
      });
    }
  } catch (error) {
    console.error('[RECALCULATE_ROI] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
