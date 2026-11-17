/**
 * ALI: start a survey round (instrument v3).
 *
 * POST /api/ali/deploy-survey
 * Body: {
 *   closesAt?: string   ISO date or YYYY-MM-DD. Default: 14 days from now. Max 90 days.
 *   divisionId?: string (null = company-wide)
 * }
 *
 * Creates one round with two links:
 *   - a team link (deployment_token), shared with the team;
 *   - a leader link (leader_token), shown only to the account owner.
 * The link used decides the respondent's role. Every new round uses v3; there is
 * no way to start a v1 or v2 survey any more.
 *
 * Only the company's account owner can start a round.
 */

import { randomBytes } from 'crypto';
import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { calculateAvailableAt } from '../../lib/ali-cadence.js';
import { requireAliSession } from '../../lib/ali-session.js';
import { V3_INSTRUMENT_VERSION } from '../../lib/ali-v3-bank.js';
import { buildV3Round } from '../../lib/ali-v3-survey.js';
import { checkRoundAllowed, blockedMessage } from '../../lib/ali-billing.js';
import {
  DEFAULT_ROUND_DAYS,
  MAX_ROUND_DAYS,
  nextRoundNumber,
  listV3Deployments,
  roundStatus,
} from '../../lib/ali-v3-rounds.js';

function newToken() {
  return randomBytes(32).toString('base64url');
}

/** Parse the requested close date. Returns { date } or { error }. */
export function resolveClosesAt(input, now = new Date()) {
  if (input === undefined || input === null || input === '') {
    return { date: new Date(now.getTime() + DEFAULT_ROUND_DAYS * 24 * 60 * 60 * 1000) };
  }
  const s = String(input);
  // A bare date means the end of that day (UTC).
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T23:59:59Z`) : new Date(s);
  if (Number.isNaN(d.getTime())) return { error: 'The close date is not a valid date.' };
  if (d.getTime() <= now.getTime()) return { error: 'The close date must be in the future.' };
  if (d.getTime() > now.getTime() + MAX_ROUND_DAYS * 24 * 60 * 60 * 1000) {
    return { error: `The close date can be at most ${MAX_ROUND_DAYS} days away.` };
  }
  return { date: d };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const session = await requireAliSession(req, res);
  if (!session) return;

  if (!session.companyId) {
    return res.status(403).json({ ok: false, error: 'This action requires a company account.' });
  }

  try {
    const companyId = session.companyId;
    const { closesAt, divisionId } = req.body || {};

    // Only the account owner may start a round (the response carries the leader link).
    const { data: me } = await supabaseAdmin
      .from('ali_contacts')
      .select('id, company_id, permission_level')
      .eq('id', session.contactId)
      .maybeSingle();
    if (!me || me.company_id !== companyId || me.permission_level !== 'account_owner') {
      return res.status(403).json({ ok: false, error: 'Only the account owner can start a survey round.' });
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('ali_companies')
      .select('id, name, baseline_date')
      .eq('id', companyId)
      .single();
    if (companyError || !company) {
      return res.status(404).json({ ok: false, error: 'Company not found' });
    }

    // Billing (2026-11-17): a new round needs a pilot year or a plan. Results
    // stay viewable whatever this says. See lib/ali-billing.js mayStartRound.
    const gate = await checkRoundAllowed(companyId);
    if (!gate.allowed) {
      return res.status(402).json({ ok: false, error: blockedMessage(gate.reason), billing: true, billingUrl: '/ali/billing' });
    }

    const close = resolveClosesAt(closesAt);
    if (close.error) return res.status(400).json({ ok: false, error: close.error });

    if (divisionId) {
      const { data: division } = await supabaseAdmin
        .from('ali_divisions')
        .select('id, company_id, status')
        .eq('id', divisionId)
        .maybeSingle();
      if (!division || division.company_id !== companyId || division.status !== 'active') {
        return res.status(400).json({ ok: false, error: 'That division is not available.' });
      }
    }

    // One open round at a time.
    const existing = await listV3Deployments(companyId);
    const open = existing.find((d) => roundStatus(d) === 'open');
    if (open) {
      return res.status(409).json({
        ok: false,
        error: `Round ${open.round_number} is still open. Close it before starting a new one.`,
      });
    }

    const roundNumber = await nextRoundNumber(companyId);
    const surveyIndex = `S${roundNumber}`;

    // Quarterly cadence after the first round (unchanged product rule).
    if (roundNumber > 1 && company.baseline_date) {
      const availableAt = calculateAvailableAt(company.baseline_date, surveyIndex);
      if (new Date() < availableAt) {
        const day = availableAt.toISOString().split('T')[0];
        return res.status(400).json({ ok: false, error: `Round ${roundNumber} can start on ${day}.` });
      }
    }

    // Build the round from the bank. Fail loudly if it cannot be built.
    let built;
    try {
      built = buildV3Round(companyId, roundNumber);
    } catch (err) {
      console.error('[ali/deploy-survey] v3 bank cannot build a survey:', err?.message || err);
      return res.status(500).json({
        ok: false,
        error: 'The survey could not be built from the question bank. Nothing was started. Please contact support.',
      });
    }

    const { data: round, error: roundError } = await supabaseAdmin
      .from('ali_v3_rounds')
      .insert({
        company_id: companyId,
        round_number: roundNumber,
        instrument_version: V3_INSTRUMENT_VERSION,
        seed: built.seed,
        items: built.items,
      })
      .select('id, round_number')
      .single();
    if (roundError || !round) {
      console.error('[ali/deploy-survey] round insert failed:', roundError?.message);
      const conflict = roundError?.code === '23505';
      return res.status(conflict ? 409 : 500).json({
        ok: false,
        error: conflict ? 'Another round was just started. Refresh the page.' : 'Could not start the round. Please try again.',
      });
    }

    if (roundNumber === 1) {
      const today = new Date().toISOString().split('T')[0];
      await supabaseAdmin.from('ali_companies').update({ baseline_date: today }).eq('id', companyId);
    }

    const now = new Date();
    const teamToken = newToken();
    const leaderToken = newToken();
    const { data: deployment, error: deploymentError } = await supabaseAdmin
      .from('ali_survey_deployments')
      .insert({
        company_id: companyId,
        division_id: divisionId || null,
        survey_index: surveyIndex,
        round_number: roundNumber,
        instrument_version: V3_INSTRUMENT_VERSION,
        v3_round_id: round.id,
        snapshot_id: null,
        deployment_token: teamToken,
        leader_token: leaderToken,
        status: 'active',
        opens_at: now.toISOString(),
        available_at: now.toISOString(),
        closes_at: close.date.toISOString(),
        minimum_responses: 5,
      })
      .select('id, round_number, survey_index, status, opens_at, closes_at')
      .single();

    if (deploymentError || !deployment) {
      console.error('[ali/deploy-survey] deployment insert failed:', deploymentError?.message);
      await supabaseAdmin.from('ali_v3_rounds').delete().eq('id', round.id);
      return res.status(500).json({ ok: false, error: 'Could not start the round. Please try again.' });
    }

    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com';
    return res.status(201).json({
      ok: true,
      success: true,
      deployment: {
        id: deployment.id,
        roundNumber: deployment.round_number,
        surveyIndex: deployment.survey_index,
        instrumentVersion: V3_INSTRUMENT_VERSION,
        status: deployment.status,
        opensAt: deployment.opens_at,
        closesAt: deployment.closes_at,
        questionCount: built.items.length,
        surveyUrl: `${siteUrl}/ali/survey/${teamToken}`,
        leaderUrl: `${siteUrl}/ali/survey/${leaderToken}`,
      },
    });
  } catch (err) {
    console.error('[ali/deploy-survey] error:', err);
    return res.status(500).json({ ok: false, error: 'Server error. Please try again.' });
  }
}
