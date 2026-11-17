/**
 * ALI results (instrument v3).
 *
 * GET /api/ali/results            the latest v3 round
 * GET /api/ali/results?round=2    a specific round
 * GET /api/ali/results?divisionId=<id>   a division cut (same minimum applies)
 *
 * Company comes from the signed-in session only. Every number passes through the
 * privacy gate in lib/ali-v3-privacy.js: no per-person data, and no team results
 * until at least 5 team members (leader excluded) have answered and the round has
 * closed. Below that the reply is { ready: false, teamResponses, needed: 5 }.
 */

import { requireAliSession } from '../../lib/ali-session.js';
import { V3_INSTRUMENT_VERSION } from '../../lib/ali-v3-bank.js';
import { gateRoundResults, MIN_TEAM_RESPONSES } from '../../lib/ali-v3-privacy.js';
import { listV3Deployments, loadRound, loadRoundResponses, roundStatus } from '../../lib/ali-v3-rounds.js';

export const config = { runtime: 'nodejs' };

function cutByDivision(responses, divisionId) {
  if (!divisionId) return responses;
  return responses.filter((r) => r.role === 'leader' || r.division_id === divisionId);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');

  const session = await requireAliSession(req, res);
  if (!session) return;
  if (!session.companyId) {
    return res.status(403).json({ ok: false, error: 'This action requires a company account.' });
  }

  try {
    const companyId = session.companyId;
    const divisionId = typeof req.query?.divisionId === 'string' && req.query.divisionId ? req.query.divisionId : null;
    const wanted = req.query?.round ? parseInt(String(req.query.round), 10) : null;

    const rounds = await listV3Deployments(companyId); // newest first, this company only
    if (rounds.length === 0) {
      return res.status(200).json({
        ok: true,
        instrumentVersion: V3_INSTRUMENT_VERSION,
        round: null,
        rounds: [],
        ready: false,
        reason: 'no_rounds',
        teamResponses: 0,
        needed: MIN_TEAM_RESPONSES,
      });
    }

    const current = wanted ? rounds.find((d) => d.round_number === wanted) : rounds[0];
    if (!current) return res.status(404).json({ ok: false, error: 'Round not found.' });

    const status = roundStatus(current);
    const round = await loadRound(current.v3_round_id);
    if (!round) return res.status(500).json({ ok: false, error: 'This round could not be loaded.' });
    const responses = cutByDivision(await loadRoundResponses(current.id), divisionId);

    // Previous closed round, for drift.
    let previous = null;
    const prevDeployment = rounds.find(
      (d) => d.round_number < current.round_number && roundStatus(d) === 'closed'
    );
    if (prevDeployment) {
      const prevRound = await loadRound(prevDeployment.v3_round_id);
      if (prevRound) {
        previous = {
          items: prevRound.items,
          responses: cutByDivision(await loadRoundResponses(prevDeployment.id), divisionId),
        };
      }
    }

    const gated = gateRoundResults({
      items: round.items,
      responses,
      roundClosed: status === 'closed',
      previous,
    });

    return res.status(200).json({
      ok: true,
      instrumentVersion: V3_INSTRUMENT_VERSION,
      divisionId,
      round: {
        number: current.round_number,
        status,
        opensAt: current.opens_at,
        closesAt: current.closes_at,
      },
      rounds: rounds.map((d) => ({ number: d.round_number, status: roundStatus(d) })),
      ...gated,
    });
  } catch (err) {
    console.error('[ali/results] error:', err);
    return res.status(500).json({ ok: false, error: 'Server error. Please try again.' });
  }
}
