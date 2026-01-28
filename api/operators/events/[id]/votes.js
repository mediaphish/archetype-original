/**
 * Submit Vote
 * 
 * POST /api/operators/events/[id]/votes
 * 
 * Submit a vote (up/down) for a target. Votes are consumed immediately.
 * No self-voting, no retractions. Each user has 10 votes per event.
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
    const { email, target_email, vote_value } = req.body;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }
    if (!target_email) {
      return res.status(400).json({ ok: false, error: 'target_email required' });
    }
    if (vote_value !== 1 && vote_value !== -1) {
      return res.status(400).json({ ok: false, error: 'vote_value must be 1 (up) or -1 (down)' });
    }

    // Check no self-voting
    if (email === target_email) {
      return res.status(400).json({ ok: false, error: 'Cannot vote for yourself' });
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

    // Check state - must be OPEN
    if (event.state !== 'OPEN') {
      return res.status(400).json({ ok: false, error: 'Can only vote during OPEN events' });
    }

    // Check permissions
    const canVote = await canPerformAction(email, 'OPEN', 'vote');
    if (!canVote) {
      return res.status(403).json({ ok: false, error: 'You do not have permission to vote' });
    }

    // Check vote exhaustion
    const { data: existingVotes } = await supabaseAdmin
      .from('operators_votes')
      .select('*', { count: 'exact', head: false })
      .eq('event_id', id)
      .eq('voter_email', email);

    const votesUsed = existingVotes?.length || 0;
    if (votesUsed >= 10) {
      return res.status(400).json({ ok: false, error: 'You have used all 10 votes' });
    }

    // Create new vote - allow multiple votes for the same target
    // Users can vote multiple times for the same person (up to 10 total votes)
    const { data: vote, error: voteError } = await supabaseAdmin
      .from('operators_votes')
      .insert({
        event_id: id,
        voter_email: email,
        target_email,
        vote_value
      })
      .select()
      .single();

    if (voteError) {
      console.error('[VOTE] Database error:', voteError);
      return res.status(500).json({ ok: false, error: 'Failed to submit vote' });
    }

    // Update attendance votes_used count
    const { data: attendance } = await supabaseAdmin
      .from('operators_attendance')
      .select('votes_used')
      .eq('event_id', id)
      .eq('user_email', email)
      .maybeSingle();

    if (attendance) {
      await supabaseAdmin
        .from('operators_attendance')
        .update({ votes_used: votesUsed + 1 })
        .eq('event_id', id)
        .eq('user_email', email);
    }

    return res.status(200).json({ ok: true, vote, remaining: 10 - (votesUsed + 1) });
  } catch (error) {
    console.error('[VOTE] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
