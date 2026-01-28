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
    let roiResult = null;
    let roiError = null;
    
    try {
      const result = await supabaseAdmin.rpc('calculate_roi_winner', { event_id_param: id });
      roiResult = result.data;
      roiError = result.error;
    } catch (err) {
      console.error('[CLOSE_EVENT] ROi calculation error:', err);
      roiError = err;
    }

    // If function fails or returns no results, manually calculate ROI winner
    if (roiError || !roiResult || roiResult.length === 0) {
      console.log('[CLOSE_EVENT] Function returned no winner, calculating manually...');
      
      // Get all checked-in attendees
      const { data: attendanceRecords } = await supabaseAdmin
        .from('operators_attendance')
        .select('user_email, check_in_time')
        .eq('event_id', id)
        .eq('checked_in', true)
        .eq('present_until_close', true)
        .eq('marked_no_show', false);

      if (attendanceRecords && attendanceRecords.length > 0) {
        // Get user details for eligibility check
        const userEmails = attendanceRecords.map(a => a.user_email);
        const { data: users } = await supabaseAdmin
          .from('operators_users')
          .select('email, owed_balance, benched_until, roles')
          .in('email', userEmails);

        const userMap = {};
        (users || []).forEach(u => {
          userMap[u.email] = u;
        });

        // Filter eligible attendees (no owed balance, not benched, has operator/candidate role)
        const eligibleAttendees = attendanceRecords.filter(att => {
          const user = userMap[att.user_email];
          if (!user) return false;
          const hasRole = user.roles && Array.isArray(user.roles) && (user.roles.includes('operator') || user.roles.includes('candidate'));
          const noBalance = (user.owed_balance || 0) === 0;
          const notBenched = !user.benched_until || new Date(user.benched_until) < new Date();
          return hasRole && noBalance && notBenched;
        });

        console.log(`[CLOSE_EVENT] Found ${eligibleAttendees.length} eligible attendees out of ${attendanceRecords.length} checked-in`);

        // Calculate vote totals for each eligible attendee
        const voteTotals = await Promise.all(
          eligibleAttendees.map(async (att) => {
            const { data: votes } = await supabaseAdmin
              .from('operators_votes')
              .select('vote_value')
              .eq('event_id', id)
              .eq('target_email', att.user_email);

            const upvotes = (votes || []).filter(v => v.vote_value === 1).length;
            const downvotes = (votes || []).filter(v => v.vote_value === -1).length;
            const netScore = upvotes - downvotes;
            const totalVotes = upvotes + downvotes;
            const upvoteRatio = totalVotes > 0 ? upvotes / totalVotes : 0;

            console.log(`[CLOSE_EVENT] ${att.user_email}: ${upvotes} upvotes, ${downvotes} downvotes, net_score: ${netScore}`);

            return {
              user_email: att.user_email,
              check_in_time: att.check_in_time,
              net_score: netScore,
              upvote_ratio: upvoteRatio,
              total_votes: totalVotes,
              upvotes,
              downvotes
            };
          })
        );

        // Sort by net_score DESC, upvote_ratio DESC, total_votes DESC, check_in_time ASC
        voteTotals.sort((a, b) => {
          if (b.net_score !== a.net_score) return b.net_score - a.net_score;
          if (b.upvote_ratio !== a.upvote_ratio) return b.upvote_ratio - a.upvote_ratio;
          if (b.total_votes !== a.total_votes) return b.total_votes - a.total_votes;
          return new Date(a.check_in_time) - new Date(b.check_in_time);
        });

        console.log(`[CLOSE_EVENT] Sorted vote totals:`, voteTotals.map(v => `${v.user_email}: ${v.net_score}`));

        if (voteTotals.length > 0 && voteTotals[0].net_score >= 0) {
          roiResult = [voteTotals[0]];
          console.log(`[CLOSE_EVENT] Manual calculation found winner: ${voteTotals[0].user_email} with net_score ${voteTotals[0].net_score}`);
        } else {
          console.log(`[CLOSE_EVENT] No eligible winner found (all have negative net_score or no votes)`);
        }
      } else {
        console.log('[CLOSE_EVENT] No attendance records found for manual calculation');
      }
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
      
      // Delete any existing ROI winner for this event
      await supabaseAdmin
        .from('operators_roi_winners')
        .delete()
        .eq('event_id', id);
      
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
        console.error('[CLOSE_EVENT] Failed to insert ROI winner:', insertError);
      } else {
        console.log('[CLOSE_EVENT] ROI winner stored:', winner.winner_email, 'net_score:', winner.net_score);
      }
    } else {
      console.log('[CLOSE_EVENT] No eligible ROI winner found');
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
