/**
 * ALI survey answers (instrument v3).
 *
 * POST /api/ali/submit-response
 * Body: {
 *   token: string          the link the person used (team or leader); the link sets the role
 *   submissionId: string   random id made once by the browser and kept in localStorage
 *   answers: { [stable_id]: 1..5 }
 * }
 *
 * Checks:
 *   - the round is v3 and open;
 *   - every scored item of the round is answered with a whole number 1 to 5,
 *     the trial item is optional, and no other keys are accepted;
 *   - team link: one submission per browser submission id per round;
 *   - leader link: one leader answer per round, which the leader may change until close;
 *   - obvious bursts are refused (see limits below).
 *
 * Stores nothing that identifies a team member: no email, no address, no device.
 * The answer row holds only the round, the role, the division and the answers.
 * The reply never says how many others have answered.
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { V3_INSTRUMENT_VERSION } from '../../lib/ali-v3-bank.js';
import { validateV3Answers, isValidSubmissionId, submissionKeyHash, createRateLimiter } from '../../lib/ali-v3-submission.js';
import { findDeploymentByToken, isV3Deployment, loadRound, roundStatus } from '../../lib/ali-v3-rounds.js';

// Generous on purpose: a whole office can share one internet address.
const PER_ADDRESS_LIMIT = 75; // submissions per address per window, per server instance
const PER_ROUND_LIMIT = 150; // team submissions per round per window
const WINDOW_MS = 10 * 60 * 1000;
const allowAddress = createRateLimiter({ limit: PER_ADDRESS_LIMIT, windowMs: WINDOW_MS });

function clientAddress(req) {
  const fwd = req.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { token, deploymentToken, submissionId, answers } = req.body || {};
    const linkToken = typeof token === 'string' ? token : typeof deploymentToken === 'string' ? deploymentToken : '';

    if (!allowAddress(clientAddress(req))) {
      return res.status(429).json({ ok: false, error: 'Too many surveys were sent from here in a short time. Please try again later.' });
    }

    const found = await findDeploymentByToken(linkToken);
    if (!found) return res.status(404).json({ ok: false, error: 'This survey link is not valid.' });
    const { deployment, role } = found;

    if (!isV3Deployment(deployment) || roundStatus(deployment) !== 'open') {
      return res.status(400).json({ ok: false, closed: true, error: 'This survey is closed. Thank you for your time.' });
    }

    const round = await loadRound(deployment.v3_round_id);
    if (!round || !Array.isArray(round.items)) {
      console.error('[ali/submit] round missing for deployment', deployment.id);
      return res.status(500).json({ ok: false, error: 'Your answers could not be saved. Please try again later.' });
    }

    const check = validateV3Answers(round.items, answers);
    if (!check.ok) {
      return res.status(400).json({ ok: false, error: check.error, missing: check.missing || undefined });
    }

    // Leader: one answer per round, editable until the round closes.
    if (role === 'leader') {
      const { data: existing } = await supabaseAdmin
        .from('ali_survey_responses')
        .select('id')
        .eq('deployment_id', deployment.id)
        .eq('respondent_role', 'leader')
        .maybeSingle();
      if (existing) {
        const { error } = await supabaseAdmin
          .from('ali_survey_responses')
          .update({ responses: check.clean, completed_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) {
          console.error('[ali/submit] leader update failed:', error.message);
          return res.status(500).json({ ok: false, error: 'Your answers could not be saved. Please try again.' });
        }
        return res.status(200).json({ ok: true, updated: true, message: 'Your answers were updated.' });
      }
    } else {
      // Team: one submission per browser id per round.
      if (!isValidSubmissionId(submissionId)) {
        return res.status(400).json({ ok: false, error: 'Please reload the page and try again.' });
      }

      const since = new Date(Date.now() - WINDOW_MS).toISOString();
      const { count: recent } = await supabaseAdmin
        .from('ali_survey_responses')
        .select('id', { count: 'exact', head: true })
        .eq('deployment_id', deployment.id)
        .gte('created_at', since);
      if ((recent || 0) >= PER_ROUND_LIMIT) {
        return res.status(429).json({ ok: false, error: 'Too many surveys were sent in a short time. Please try again later.' });
      }

      const { error: keyError } = await supabaseAdmin
        .from('ali_v3_submission_keys')
        .insert({ deployment_id: deployment.id, key_hash: submissionKeyHash(deployment.id, submissionId) });
      if (keyError) {
        if (keyError.code === '23505') {
          return res.status(409).json({ ok: false, duplicate: true, error: 'You have already sent your answers for this survey. Thank you.' });
        }
        console.error('[ali/submit] submission key insert failed:', keyError.message);
        return res.status(500).json({ ok: false, error: 'Your answers could not be saved. Please try again.' });
      }
    }

    const { error: insertError } = await supabaseAdmin.from('ali_survey_responses').insert({
      deployment_id: deployment.id,
      division_id: deployment.division_id || null,
      respondent_role: role,
      instrument_version: V3_INSTRUMENT_VERSION,
      responses: check.clean,
      device_type: null,
      completed_at: new Date().toISOString(),
    });

    if (insertError) {
      if (role !== 'leader') {
        await supabaseAdmin
          .from('ali_v3_submission_keys')
          .delete()
          .eq('deployment_id', deployment.id)
          .eq('key_hash', submissionKeyHash(deployment.id, submissionId));
      }
      if (role === 'leader' && insertError.code === '23505') {
        return res.status(409).json({ ok: false, error: 'Your answers were just saved from another window. Reload to edit them.' });
      }
      console.error('[ali/submit] insert failed:', insertError.message);
      return res.status(500).json({ ok: false, error: 'Your answers could not be saved. Please try again.' });
    }

    return res.status(201).json({ ok: true, message: 'Thank you. Your answers were saved.' });
  } catch (err) {
    console.error('[ali/submit] error:', err);
    return res.status(500).json({ ok: false, error: 'Server error. Please try again.' });
  }
}
