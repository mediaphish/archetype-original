/**
 * Approve Candidate
 * 
 * POST /api/operators/candidates/[id]/approve
 * 
 * CO approves a candidate submission. Only CO can approve candidates.
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
      return res.status(400).json({ ok: false, error: 'Can only approve candidates for LIVE events' });
    }

    // Check permissions - only CO can approve
    const canApprove = await canPerformAction(email, 'LIVE', 'approve_candidate');
    if (!canApprove) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators can approve candidates' });
    }

    // Check if already approved/denied
    if (candidate.status !== 'pending') {
      return res.status(400).json({ ok: false, error: `Candidate already ${candidate.status}` });
    }

    // Update candidate status
    const { data: updatedCandidate, error: updateError } = await supabaseAdmin
      .from('operators_candidates')
      .update({
        status: 'approved',
        approved_by_email: email,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[APPROVE_CANDIDATE] Database error:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to approve candidate' });
    }

    return res.status(200).json({ ok: true, candidate: updatedCandidate });
  } catch (error) {
    console.error('[APPROVE_CANDIDATE] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
