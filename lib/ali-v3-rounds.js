/**
 * ALI v3 rounds: shared database reads for the survey, submit and results endpoints.
 * Needs database/ALI_V3_INSTRUMENT.sql applied.
 */

import { supabaseAdmin } from './supabase-admin.js';
import { V3_INSTRUMENT_VERSION } from './ali-v3-bank.js';
import { nextRoundNumberFrom as computeNext } from './ali-v3-survey.js';

export { isV3Deployment, roundStatus, nextRoundNumberFrom } from './ali-v3-survey.js';

export const DEFAULT_ROUND_DAYS = 14;
export const MAX_ROUND_DAYS = 90;

const DEPLOYMENT_COLUMNS =
  'id, company_id, division_id, status, opens_at, closes_at, survey_index, round_number, instrument_version, v3_round_id, deployment_token, leader_token, created_at';

export async function nextRoundNumber(companyId) {
  const [deps, snaps, rounds] = await Promise.all([
    supabaseAdmin.from('ali_survey_deployments').select('survey_index, round_number').eq('company_id', companyId),
    supabaseAdmin.from('ali_survey_snapshots').select('survey_index').eq('client_id', companyId),
    supabaseAdmin.from('ali_v3_rounds').select('round_number').eq('company_id', companyId),
  ]);
  for (const r of [deps, snaps, rounds]) {
    if (r.error) throw new Error(`Could not count earlier rounds: ${r.error.message}`);
  }
  return computeNext({ deployments: deps.data || [], snapshots: snaps.data || [], rounds: rounds.data || [] });
}

/**
 * Find a deployment by either of its links. The link decides the role.
 * @returns {Promise<{ deployment, role } | null>}
 */
export async function findDeploymentByToken(token) {
  if (!token || typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
  const team = await supabaseAdmin.from('ali_survey_deployments').select(DEPLOYMENT_COLUMNS).eq('deployment_token', token).maybeSingle();
  if (team.data) return { deployment: team.data, role: 'team_member' };
  const leader = await supabaseAdmin.from('ali_survey_deployments').select(DEPLOYMENT_COLUMNS).eq('leader_token', token).maybeSingle();
  if (leader.data) return { deployment: leader.data, role: 'leader' };
  return null;
}

export async function loadRound(roundId) {
  const { data, error } = await supabaseAdmin
    .from('ali_v3_rounds')
    .select('id, company_id, round_number, instrument_version, items')
    .eq('id', roundId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the round: ${error.message}`);
  return data || null;
}

export async function loadCompanyName(companyId) {
  const { data } = await supabaseAdmin.from('ali_companies').select('name').eq('id', companyId).maybeSingle();
  return data?.name || '';
}

/** Answers for a round, reduced to { role, answers, division_id }. Nothing else leaves this function. */
export async function loadRoundResponses(deploymentId) {
  const { data, error } = await supabaseAdmin
    .from('ali_survey_responses')
    .select('respondent_role, responses, division_id')
    .eq('deployment_id', deploymentId);
  if (error) throw new Error(`Could not load answers: ${error.message}`);
  return (data || []).map((r) => ({ role: r.respondent_role, answers: r.responses || {}, division_id: r.division_id || null }));
}

/** All v3 deployments for a company, newest round first. */
export async function listV3Deployments(companyId) {
  const { data, error } = await supabaseAdmin
    .from('ali_survey_deployments')
    .select(DEPLOYMENT_COLUMNS)
    .eq('company_id', companyId)
    .eq('instrument_version', V3_INSTRUMENT_VERSION)
    .order('round_number', { ascending: false });
  if (error) throw new Error(`Could not load rounds: ${error.message}`);
  return data || [];
}
