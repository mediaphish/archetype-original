/**
 * Operators Dashboard
 * 
 * GET /api/operators/dashboard
 * 
 * Returns aggregate event metrics and longitudinal metrics.
 * No names, no rankings, aggregate data only.
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Event Metrics
    const { count: totalEvents } = await supabaseAdmin
      .from('operators_events')
      .select('*', { count: 'exact', head: true });

    const { count: liveEvents } = await supabaseAdmin
      .from('operators_events')
      .select('*', { count: 'exact', head: true })
      .eq('state', 'LIVE');

    const { count: openEvents } = await supabaseAdmin
      .from('operators_events')
      .select('*', { count: 'exact', head: true })
      .eq('state', 'OPEN');

    const { count: closedEvents } = await supabaseAdmin
      .from('operators_events')
      .select('*', { count: 'exact', head: true })
      .eq('state', 'CLOSED');

    // Get all RSVPs for seat calculations
    const { data: allRSVPs } = await supabaseAdmin
      .from('operators_rsvps')
      .select('event_id, status');

    // Get all events with max_seats
    const { data: allEvents } = await supabaseAdmin
      .from('operators_events')
      .select('id, max_seats');

    const eventMap = {};
    (allEvents || []).forEach(e => { eventMap[e.id] = e.max_seats; });

    let totalSeats = 0;
    let filledSeats = 0;
    (allEvents || []).forEach(e => {
      totalSeats += e.max_seats;
      const confirmed = (allRSVPs || []).filter(r => r.event_id === e.id && r.status === 'confirmed').length;
      filledSeats += Math.min(confirmed, e.max_seats);
    });

    const seatsFilledRate = totalSeats > 0 ? (filledSeats / totalSeats) * 100 : 0;

    // Voting completion rate (from closed events)
    const { data: closedEventIds } = await supabaseAdmin
      .from('operators_events')
      .select('id')
      .eq('state', 'CLOSED');

    let totalAttendees = 0;
    let completedVoters = 0;
    for (const event of (closedEventIds || [])) {
      const { data: attendance } = await supabaseAdmin
        .from('operators_attendance')
        .select('votes_used')
        .eq('event_id', event.id)
        .eq('checked_in', true);

      (attendance || []).forEach(a => {
        totalAttendees++;
        if (a.votes_used === 10) completedVoters++;
      });
    }

    const votingCompletionRate = totalAttendees > 0 ? (completedVoters / totalAttendees) * 100 : 0;

    // Attendance counted rate
    let attendanceCounted = 0;
    for (const event of (closedEventIds || [])) {
      const { data: attendance } = await supabaseAdmin
        .from('operators_attendance')
        .select('checked_in, votes_used, present_until_close, marked_no_show')
        .eq('event_id', event.id);

      (attendance || []).forEach(a => {
        if (a.checked_in && a.votes_used === 10 && a.present_until_close && !a.marked_no_show) {
          attendanceCounted++;
        }
      });
    }

    const attendanceCountedRate = totalAttendees > 0 ? (attendanceCounted / totalAttendees) * 100 : 0;

    // Room positivity index (average upvote ratio from closed events)
    const { data: allRoiWinners } = await supabaseAdmin
      .from('operators_roi_winners')
      .select('upvote_ratio');

    const avgUpvoteRatio = (allRoiWinners || []).length > 0
      ? (allRoiWinners || []).reduce((sum, w) => sum + parseFloat(w.upvote_ratio || 0), 0) / allRoiWinners.length
      : 0;

    // Signal clarity (standard deviation of upvote ratios - lower is clearer)
    const upvoteRatios = (allRoiWinners || []).map(w => parseFloat(w.upvote_ratio || 0));
    const mean = upvoteRatios.length > 0 ? upvoteRatios.reduce((a, b) => a + b, 0) / upvoteRatios.length : 0;
    const variance = upvoteRatios.length > 0
      ? upvoteRatios.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / upvoteRatios.length
      : 0;
    const signalClarity = Math.sqrt(variance);

    // Offense counts
    const { count: totalOffenses } = await supabaseAdmin
      .from('operators_offenses')
      .select('*', { count: 'exact', head: true });

    const { count: noShowOffenses } = await supabaseAdmin
      .from('operators_offenses')
      .select('*', { count: 'exact', head: true })
      .eq('offense_type', 'no_show');

    const { count: earlyDepartureOffenses } = await supabaseAdmin
      .from('operators_offenses')
      .select('*', { count: 'exact', head: true })
      .eq('offense_type', 'early_departure');

    // Pot visibility (total stake from closed events)
    const { data: closedEventsWithStakes } = await supabaseAdmin
      .from('operators_events')
      .select('stake_amount')
      .eq('state', 'CLOSED');

    const totalPot = (closedEventsWithStakes || []).reduce((sum, e) => sum + parseFloat(e.stake_amount || 0), 0);

    // Longitudinal Metrics
    const { count: activeOperators } = await supabaseAdmin
      .from('operators_users')
      .select('*', { count: 'exact', head: true })
      .or('roles.cs.{operator,chief_operator}');

    // Repeat attendance (users with loyalty_count > 1)
    const { count: repeatAttendees } = await supabaseAdmin
      .from('operators_users')
      .select('*', { count: 'exact', head: true })
      .gt('loyalty_count', 1);

    // Promotion rate (candidates promoted / total candidates)
    const { count: totalCandidates } = await supabaseAdmin
      .from('operators_candidates')
      .select('*', { count: 'exact', head: true });

    const { count: promotedCandidates } = await supabaseAdmin
      .from('operators_candidates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'promoted');

    const promotionRate = totalCandidates > 0 ? (promotedCandidates / totalCandidates) * 100 : 0;

    // Average signal clarity (already calculated above)
    const avgSignalClarity = signalClarity;

    // Discipline trends (card status distribution)
    const { count: yellowCards } = await supabaseAdmin
      .from('operators_users')
      .select('*', { count: 'exact', head: true })
      .eq('card_status', 'yellow');

    const { count: orangeCards } = await supabaseAdmin
      .from('operators_users')
      .select('*', { count: 'exact', head: true })
      .eq('card_status', 'orange');

    const { count: redCards } = await supabaseAdmin
      .from('operators_users')
      .select('*', { count: 'exact', head: true })
      .eq('card_status', 'red');

    // Get recent ROI winners (last 10) with event and user details
    const { data: recentWinners } = await supabaseAdmin
      .from('operators_roi_winners')
      .select(`
        id,
        winner_email,
        pot_amount_won,
        created_at,
        operators_events (
          id,
          title,
          event_date
        ),
        operators_users!operators_roi_winners_winner_email_fkey (
          business_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    // Format ROI winners data
    const roiWinners = (recentWinners || []).map(winner => ({
      id: winner.id,
      winner_email: winner.winner_email,
      winner_name: winner.operators_users?.business_name || null,
      pot_amount_won: winner.pot_amount_won ? parseFloat(winner.pot_amount_won) : null,
      event_title: winner.operators_events?.title || null,
      event_date: winner.operators_events?.event_date || null,
      created_at: winner.created_at
    }));

    return res.status(200).json({
      ok: true,
      dashboard: {
        event_metrics: {
          total_events: totalEvents || 0,
          live_events: liveEvents || 0,
          open_events: openEvents || 0,
          closed_events: closedEvents || 0,
          seats_filled_rate: Math.round(seatsFilledRate * 100) / 100,
          voting_completion_rate: Math.round(votingCompletionRate * 100) / 100,
          attendance_counted_rate: Math.round(attendanceCountedRate * 100) / 100,
          room_positivity_index: Math.round(avgUpvoteRatio * 10000) / 10000,
          signal_clarity: Math.round(avgSignalClarity * 10000) / 10000,
          total_offenses: totalOffenses || 0,
          no_show_offenses: noShowOffenses || 0,
          early_departure_offenses: earlyDepartureOffenses || 0,
          total_pot: Math.round(totalPot * 100) / 100
        },
        longitudinal_metrics: {
          active_operators: activeOperators || 0,
          repeat_attendance_count: repeatAttendees || 0,
          promotion_rate: Math.round(promotionRate * 100) / 100,
          average_signal_clarity: Math.round(avgSignalClarity * 10000) / 10000,
          discipline_trends: {
            yellow_cards: yellowCards || 0,
            orange_cards: orangeCards || 0,
            red_cards: redCards || 0
          }
        },
        recent_roi_winners: roiWinners
      }
    });
  } catch (error) {
    console.error('[DASHBOARD] Error:', error);
    console.error('[DASHBOARD] Error stack:', error.stack);
    console.error('[DASHBOARD] Error message:', error.message);
    return res.status(500).json({ 
      ok: false, 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
