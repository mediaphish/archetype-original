/**
 * Get Event Detail
 * 
 * GET /api/operators/events/[id]?email=xxx
 * 
 * Gets detailed event information including RSVPs, candidates, votes, attendance
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { getUserOperatorsRoles, canPerformAction, canManageTopics } from '../../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { email } = req.query;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
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

    const roles = await getUserOperatorsRoles(email);
    const canViewVotes = await canPerformAction(email, event.state, 'view_votes');

    // Get user's RSVP
    const { data: userRSVP } = await supabaseAdmin
      .from('operators_rsvps')
      .select('*')
      .eq('event_id', id)
      .eq('user_email', email)
      .maybeSingle();

    // Get RSVPs (all if CO/SA/Accountant, or just user's if not)
    let rsvps = [];
    if (canViewVotes || roles.includes('super_admin')) {
      const { data: allRSVPs } = await supabaseAdmin
        .from('operators_rsvps')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: true });
      rsvps = allRSVPs || [];
    } else {
      if (userRSVP) {
        rsvps = [userRSVP];
      }
    }

    // Get candidates
    const { data: candidates } = await supabaseAdmin
      .from('operators_candidates')
      .select('*')
      .eq('event_id', id)
      .order('created_at', { ascending: true });

    // Get user's remaining votes (if event is OPEN)
    let remainingVotes = null;
    if (event.state === 'OPEN') {
      const { data: votes } = await supabaseAdmin
        .from('operators_votes')
        .select('*', { count: 'exact', head: false })
        .eq('event_id', id)
        .eq('voter_email', email);
      
      remainingVotes = Math.max(0, 10 - (votes?.length || 0));
    }

    // Get vote summary (if user can view votes)
    let voteSummary = null;
    if (canViewVotes && event.state === 'OPEN') {
      const { data: allVotes } = await supabaseAdmin
        .from('operators_votes')
        .select('target_email, vote_value')
        .eq('event_id', id);
      
      // Aggregate votes by target
      const summary = {};
      (allVotes || []).forEach(vote => {
        if (!summary[vote.target_email]) {
          summary[vote.target_email] = { upvotes: 0, downvotes: 0 };
        }
        if (vote.vote_value === 1) {
          summary[vote.target_email].upvotes++;
        } else {
          summary[vote.target_email].downvotes++;
        }
      });
      voteSummary = summary;
    }

    // Get attendance records (if user can view)
    let attendance = [];
    if (canViewVotes || roles.includes('accountant') || roles.includes('super_admin')) {
      const { data: attendanceRecords } = await supabaseAdmin
        .from('operators_attendance')
        .select('*')
        .eq('event_id', id)
        .order('check_in_time', { ascending: true });
      attendance = attendanceRecords || [];
    }

    // Get ROi winner (if CLOSED)
    let roiWinner = null;
    if (event.state === 'CLOSED') {
      const { data: winner } = await supabaseAdmin
        .from('operators_roi_winners')
        .select('*')
        .eq('event_id', id)
        .maybeSingle();
      roiWinner = winner;
    }

    // Get promotions (if CLOSED)
    let promotions = [];
    if (event.state === 'CLOSED') {
      const { data: promotionRecords } = await supabaseAdmin
        .from('operators_promotions')
        .select('*')
        .eq('event_id', id);
      promotions = promotionRecords || [];
    }

    // Get scenarios (only for SA/CO/Accountant)
    let scenarios = null;
    const canManage = await canManageTopics(email);
    if (canManage) {
      const { data: eventScenarios } = await supabaseAdmin
        .from('operators_event_scenarios')
        .select('*')
        .eq('event_id', id)
        .order('rank', { ascending: true });
      scenarios = eventScenarios || [];
    }

    // Calculate permission flags
    const canCloseRSVP = canManage && event.state === 'LIVE' && !event.rsvp_closed;
    const scenariosExist = scenarios && scenarios.length > 0;
    const canGenerateScenarios = canManage && event.state === 'LIVE' && event.rsvp_closed && !scenariosExist;
    const canEditScenarios = canManage && event.state === 'LIVE' && scenariosExist && (!scenarios[0]?.is_locked);

    // Ensure consistency: if state is LIVE, rsvp_closed should be false
    // This is a safeguard in case the database update didn't complete properly
    if (event.state === 'LIVE' && event.rsvp_closed === true) {
      console.warn('[GET_EVENT] Inconsistent state: event is LIVE but rsvp_closed is true. Event ID:', event.id);
      // Fix the database inconsistency
      await supabaseAdmin
        .from('operators_events')
        .update({ rsvp_closed: false })
        .eq('id', event.id);
      // Force it to false in the response
      event.rsvp_closed = false;
    }

    return res.status(200).json({
      ok: true,
      event: {
        ...event,
        user_rsvp: userRSVP,
        rsvps,
        candidates: candidates || [],
        remaining_votes: remainingVotes,
        vote_summary: voteSummary,
        attendance,
        roi_winner: roiWinner,
        promotions,
        scenarios: canManage ? scenarios : undefined, // Only include if user can manage
        can_close_rsvp: canCloseRSVP,
        can_generate_scenarios: canGenerateScenarios,
        can_edit_scenarios: canEditScenarios
      }
    });
  } catch (error) {
    console.error('[GET_EVENT] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
