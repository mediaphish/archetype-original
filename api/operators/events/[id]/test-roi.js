/**
 * Test ROI Calculation
 * 
 * GET /api/operators/events/[id]/test-roi
 * 
 * Directly tests the calculate_roi_winner database function and manual calculation
 * to diagnose ROI calculation issues.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }

    // Get event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('id, state')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    const diagnostics = {
      event_id: id,
      event_state: event.state,
      database_function: null,
      manual_calculation: null,
      attendance_records: null,
      votes: null
    };

    // Test database function
    try {
      const { data: dbResult, error: dbError } = await supabaseAdmin
        .rpc('calculate_roi_winner', { event_id_param: id });
      
      diagnostics.database_function = {
        success: !dbError,
        error: dbError?.message || null,
        result: dbResult || null,
        result_count: dbResult?.length || 0
      };
    } catch (err) {
      diagnostics.database_function = {
        success: false,
        error: err.message,
        result: null,
        result_count: 0
      };
    }

    // Get attendance records
    const { data: attendanceRecords } = await supabaseAdmin
      .from('operators_attendance')
      .select('user_email, checked_in, present_until_close, marked_no_show, check_in_time')
      .eq('event_id', id);

    diagnostics.attendance_records = attendanceRecords || [];

    // Get user details
    const userEmails = (attendanceRecords || []).map(a => a.user_email);
    const { data: users } = await supabaseAdmin
      .from('operators_users')
      .select('email, owed_balance, benched_until, roles')
      .in('email', userEmails);

    const userMap = {};
    (users || []).forEach(u => {
      userMap[u.email] = u;
    });

    // Get votes
    const { data: allVotes } = await supabaseAdmin
      .from('operators_votes')
      .select('target_email, vote_value')
      .eq('event_id', id);

    const voteSummary = {};
    (allVotes || []).forEach(v => {
      if (!voteSummary[v.target_email]) {
        voteSummary[v.target_email] = { upvotes: 0, downvotes: 0 };
      }
      if (v.vote_value === 1) voteSummary[v.target_email].upvotes++;
      if (v.vote_value === -1) voteSummary[v.target_email].downvotes++;
    });

    diagnostics.votes = voteSummary;

    // Manual calculation
    const eligibleAttendees = (attendanceRecords || []).filter(att => {
      if (!att.checked_in || att.marked_no_show || !att.present_until_close) {
        return false;
      }
      const user = userMap[att.user_email];
      if (!user) return false;
      const hasRole = user.roles && Array.isArray(user.roles) && (user.roles.includes('operator') || user.roles.includes('candidate'));
      const noBalance = (user.owed_balance || 0) === 0;
      const notBenched = !user.benched_until || new Date(user.benched_until) < new Date();
      return hasRole && noBalance && notBenched;
    });

    const manualResults = eligibleAttendees.map(att => {
      const votes = voteSummary[att.user_email] || { upvotes: 0, downvotes: 0 };
      const netScore = votes.upvotes - votes.downvotes;
      const totalVotes = votes.upvotes + votes.downvotes;
      const upvoteRatio = totalVotes > 0 ? votes.upvotes / totalVotes : 0;

      return {
        user_email: att.user_email,
        check_in_time: att.check_in_time,
        net_score: netScore,
        upvote_ratio: upvoteRatio,
        total_votes: totalVotes,
        upvotes: votes.upvotes,
        downvotes: votes.downvotes,
        user: userMap[att.user_email]
      };
    });

    manualResults.sort((a, b) => {
      if (b.net_score !== a.net_score) return b.net_score - a.net_score;
      if (b.upvote_ratio !== a.upvote_ratio) return b.upvote_ratio - a.upvote_ratio;
      if (b.total_votes !== a.total_votes) return b.total_votes - a.total_votes;
      return new Date(a.check_in_time) - new Date(b.check_in_time);
    });

    diagnostics.manual_calculation = {
      eligible_count: eligibleAttendees.length,
      results: manualResults,
      winner: manualResults.length > 0 && manualResults[0].net_score >= 0 ? manualResults[0] : null
    };

    return res.status(200).json({ ok: true, diagnostics });
  } catch (error) {
    console.error('[TEST_ROI] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error', details: error.message });
  }
}
