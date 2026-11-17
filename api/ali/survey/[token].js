/**
 * ALI survey questions for a link.
 *
 * GET /api/ali/survey/[token]
 *
 * The link decides the role: the team link gets team wording, the leader link
 * gets leader wording. Nobody chooses their own role.
 *
 * Response (v3):
 *   { status: 'open' | 'closed' | 'not_open', company_name, role, round_number,
 *     closes_at, questions: [{ id, text, is_trial, order }], answer_labels,
 *     previous_answers (leader link only, so the leader can edit until close) }
 *
 * Never tells a team member how many others have answered.
 * Surveys from the retired v1/v2 instruments no longer accept answers; their
 * links show the closed message.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { V3_ANSWER_LABELS } from '../../../lib/ali-v3-bank.js';
import { questionsForRole } from '../../../lib/ali-v3-survey.js';
import { findDeploymentByToken, isV3Deployment, loadRound, loadCompanyName, roundStatus } from '../../../lib/ali-v3-rounds.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');

  try {
    const { token } = req.query;
    const found = await findDeploymentByToken(typeof token === 'string' ? token : '');
    if (!found) {
      return res.status(404).json({ error: 'This survey link is not valid. Please ask for a new link.' });
    }
    const { deployment, role } = found;
    const companyName = await loadCompanyName(deployment.company_id);

    if (!isV3Deployment(deployment)) {
      return res.status(200).json({ status: 'closed', company_name: companyName, role: null, questions: [] });
    }

    const status = roundStatus(deployment);
    const base = {
      status,
      company_name: companyName,
      role,
      round_number: deployment.round_number,
      closes_at: deployment.closes_at,
      answer_labels: V3_ANSWER_LABELS,
    };
    if (status !== 'open') {
      return res.status(200).json({ ...base, questions: [] });
    }

    const round = await loadRound(deployment.v3_round_id);
    if (!round || !Array.isArray(round.items) || round.items.length === 0) {
      console.error('[ali/survey] round missing for deployment', deployment.id);
      return res.status(500).json({ error: 'This survey could not be loaded. Please try again later.' });
    }

    let previousAnswers = null;
    if (role === 'leader') {
      const { data } = await supabaseAdmin
        .from('ali_survey_responses')
        .select('responses')
        .eq('deployment_id', deployment.id)
        .eq('respondent_role', 'leader')
        .maybeSingle();
      previousAnswers = data?.responses || null;
    }

    return res.status(200).json({
      ...base,
      questions: questionsForRole(round.items, role),
      previous_answers: previousAnswers,
    });
  } catch (err) {
    console.error('[ali/survey] error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
