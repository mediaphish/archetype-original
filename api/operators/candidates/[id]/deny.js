/**
 * Deny Candidate
 * 
 * POST /api/operators/candidates/[id]/deny
 * 
 * CO denies a candidate submission. Only CO can deny candidates.
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
      return res.status(400).json({ ok: false, error: 'Candidate ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    // Get candidate
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('operators_candidates')
      .select('*, operators_events!inner(state)')
      .eq('id', id)
      .single();

    if (candidateError || !candidate) {
      return res.status(404).json({ ok: false, error: 'Candidate not found' });
    }

    // Check state - must be LIVE
    if (candidate.operators_events.state !== 'LIVE') {
      return res.status(400).json({ ok: false, error: 'Can only deny candidates for LIVE events' });
    }

    // Check permissions - only CO can deny
    const canDeny = await canPerformAction(email, 'LIVE', 'approve_candidate'); // Same permission as approve
    if (!canDeny) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators can deny candidates' });
    }

    // Check if already approved/denied
    if (candidate.status !== 'pending') {
      return res.status(400).json({ ok: false, error: `Candidate already ${candidate.status}` });
    }

    // Update candidate status
    const { data: updatedCandidate, error: updateError } = await supabaseAdmin
      .from('operators_candidates')
      .update({
        status: 'denied',
        approved_by_email: email,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[DENY_CANDIDATE] Database error:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to deny candidate' });
    }

    return res.status(200).json({ ok: true, candidate: updatedCandidate });
  } catch (error) {
    console.error('[DENY_CANDIDATE] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
