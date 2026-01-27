/**
 * Submit Candidate
 * 
 * POST /api/operators/candidates/submit
 * 
 * Operator invites a Candidate to an event. Requires 200+ word essay and contact info.
 * Now includes optional role_title, industry, and bio fields.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { canPerformAction, hasRole } from '../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { email, event_id, candidate_email, essay, contact_info, role_title, industry, bio } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }
    if (!event_id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!candidate_email || !essay || !contact_info) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: candidate_email, essay, contact_info' });
    }

    // Check essay length (200+ words)
    const wordCount = essay.trim().split(/\s+/).length;
    if (wordCount < 200) {
      return res.status(400).json({ ok: false, error: 'Essay must be at least 200 words' });
    }

    // Check permissions - only Operators can invite candidates
    const isOperator = await hasRole(email, 'operator');
    if (!isOperator) {
      return res.status(403).json({ ok: false, error: 'Only Operators can invite Candidates' });
    }

    // Get event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    // Check state - must be LIVE
    if (event.state !== 'LIVE') {
      return res.status(400).json({ ok: false, error: 'Can only submit candidates to LIVE events' });
    }

    // Check if candidate already exists for this event
    const { data: existingCandidate } = await supabaseAdmin
      .from('operators_candidates')
      .select('*')
      .eq('event_id', event_id)
      .eq('candidate_email', candidate_email)
      .maybeSingle();

    if (existingCandidate) {
      return res.status(400).json({ ok: false, error: 'Candidate already submitted for this event' });
    }

    // Create or update candidate user record
    const { data: candidateUser } = await supabaseAdmin
      .from('operators_users')
      .select('*')
      .eq('email', candidate_email)
      .maybeSingle();

    if (!candidateUser) {
      // Create new user with candidate role
      await supabaseAdmin
        .from('operators_users')
        .insert({
          email: candidate_email,
          roles: ['candidate']
        });
    } else {
      // Add candidate role if not present
      const roles = candidateUser.roles || [];
      if (!roles.includes('candidate')) {
        await supabaseAdmin
          .from('operators_users')
          .update({ roles: [...roles, 'candidate'] })
          .eq('email', candidate_email);
      }
    }

    // Create candidate submission
    const candidateData = {
      event_id,
      candidate_email,
      invited_by_email: email,
      essay,
      contact_info,
      status: 'pending'
    };

    // Add optional bio fields if provided
    if (role_title) candidateData.role_title = role_title;
    if (industry) candidateData.industry = industry;
    if (bio) candidateData.bio = bio;

    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('operators_candidates')
      .insert(candidateData)
      .select()
      .single();

    if (candidateError) {
      console.error('[SUBMIT_CANDIDATE] Database error:', candidateError);
      return res.status(500).json({ ok: false, error: 'Failed to submit candidate' });
    }

    return res.status(200).json({ ok: true, candidate });
  } catch (error) {
    console.error('[SUBMIT_CANDIDATE] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
