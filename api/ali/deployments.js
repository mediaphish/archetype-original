/**
 * ALI rounds for the Deploy page.
 *
 * GET  /api/ali/deployments
 *   Lists the company's rounds with the team link and how many team members have
 *   answered. The leader link is included only for the account owner.
 *
 * POST /api/ali/deployments   (account owner only)
 *   { action: 'close', deploymentId }                close a round now
 *   { action: 'set_close_date', deploymentId, closesAt }  move the close date of an open round
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAliSession } from '../../lib/ali-session.js';
import { roundStatus, MAX_ROUND_DAYS } from '../../lib/ali-v3-rounds.js';

export const config = { runtime: 'nodejs' };

async function isAccountOwner(session) {
  if (!session?.contactId || !session?.companyId) return false;
  const { data: me } = await supabaseAdmin
    .from('ali_contacts')
    .select('company_id, permission_level')
    .eq('id', session.contactId)
    .maybeSingle();
  return !!me && me.company_id === session.companyId && me.permission_level === 'account_owner';
}

async function handlePost(req, res, session) {
  if (!(await isAccountOwner(session))) {
    return res.status(403).json({ ok: false, error: 'Only the account owner can change a round.' });
  }
  const { action, deploymentId, closesAt } = req.body || {};
  if (!deploymentId) return res.status(400).json({ ok: false, error: 'Which round?' });

  const { data: d } = await supabaseAdmin
    .from('ali_survey_deployments')
    .select('id, company_id, status, opens_at, closes_at')
    .eq('id', deploymentId)
    .eq('company_id', session.companyId)
    .maybeSingle();
  if (!d) return res.status(404).json({ ok: false, error: 'Round not found.' });
  if (roundStatus(d) === 'closed') return res.status(400).json({ ok: false, error: 'This round is already closed.' });

  if (action === 'close') {
    const { error } = await supabaseAdmin
      .from('ali_survey_deployments')
      .update({ status: 'closed', closes_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', d.id)
      .eq('company_id', session.companyId);
    if (error) return res.status(500).json({ ok: false, error: 'Could not close the round.' });
    return res.status(200).json({ ok: true });
  }

  if (action === 'set_close_date') {
    const s = String(closesAt || '');
    const when = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T23:59:59Z`) : new Date(s);
    const now = Date.now();
    if (Number.isNaN(when.getTime()) || when.getTime() <= now) {
      return res.status(400).json({ ok: false, error: 'The close date must be a future date.' });
    }
    if (when.getTime() > now + MAX_ROUND_DAYS * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ ok: false, error: `The close date can be at most ${MAX_ROUND_DAYS} days away.` });
    }
    const { error } = await supabaseAdmin
      .from('ali_survey_deployments')
      .update({ closes_at: when.toISOString(), updated_at: new Date().toISOString() })
      .eq('id', d.id)
      .eq('company_id', session.companyId);
    if (error) return res.status(500).json({ ok: false, error: 'Could not change the close date.' });
    return res.status(200).json({ ok: true, closesAt: when.toISOString() });
  }

  return res.status(400).json({ ok: false, error: 'Unknown action.' });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const session = await requireAliSession(req, res);
  if (!session) return;

  if (!session.companyId) {
    return res.status(403).json({ ok: false, error: 'This action requires a tenant account.' });
  }

  try {
    if (req.method === 'POST') return await handlePost(req, res, session);

    const companyId = session.companyId;
    const owner = await isAccountOwner(session);

    const { data: deployments, error: deploymentsError } = await supabaseAdmin
      .from('ali_survey_deployments')
      .select('id, survey_index, round_number, instrument_version, status, deployment_token, leader_token, opens_at, closes_at, minimum_responses, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (deploymentsError) {
      console.error('[deployments] Error fetching deployments:', deploymentsError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch deployments' });
    }

    if (!deployments || deployments.length === 0) {
      return res.status(200).json({ ok: true, isAccountOwner: owner, deployments: [] });
    }

    const deploymentIds = deployments.map((d) => d.id);
    const { data: rows, error: countsError } = await supabaseAdmin
      .from('ali_survey_responses')
      .select('deployment_id, respondent_role')
      .in('deployment_id', deploymentIds);
    if (countsError) console.error('[deployments] Error fetching response counts:', countsError);

    const teamCount = {};
    const leaderAnswered = {};
    for (const row of rows || []) {
      if (row.respondent_role === 'leader') leaderAnswered[row.deployment_id] = true;
      else teamCount[row.deployment_id] = (teamCount[row.deployment_id] || 0) + 1;
    }

    const list = deployments.map((d) => {
      const isV3 = d.instrument_version === 'v3.0';
      return {
        id: d.id,
        surveyIndex: d.survey_index,
        roundNumber: d.round_number || null,
        instrumentVersion: d.instrument_version || null,
        isV3,
        status: d.status,
        roundStatus: roundStatus(d),
        deploymentToken: d.deployment_token,
        leaderToken: owner && isV3 ? d.leader_token || null : null,
        opensAt: d.opens_at ? d.opens_at.split('T')[0] : null,
        closesAt: d.closes_at ? d.closes_at.split('T')[0] : null,
        minimumResponses: 5,
        teamResponseCount: teamCount[d.id] ?? 0,
        responseCount: teamCount[d.id] ?? 0,
        leaderAnswered: !!leaderAnswered[d.id],
        createdAt: d.created_at,
      };
    });

    return res.status(200).json({ ok: true, isAccountOwner: owner, deployments: list });
  } catch (err) {
    console.error('[deployments] Error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
