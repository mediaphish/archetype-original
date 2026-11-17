/**
 * ALI privacy gate (server side). Every results endpoint goes through here.
 *
 * Rules:
 *   - Never hand out per-person data: no individual scores, no per-respondent
 *     timestamps, no per-person points. Only combined numbers leave the server.
 *   - Team results for a round (or any division cut of it) are returned only when
 *     at least MIN_TEAM_RESPONSES team members have answered. The leader does not
 *     count toward that number.
 *   - The leader's own answers may be shown back (they are the leader's own).
 *   - Team results are shown only after the round closes, so nobody can watch the
 *     numbers move as each person answers and work out one person's answers.
 */

import { scoreV3Round, computeDrift } from './ali-v3-scoring.js';

export const MIN_TEAM_RESPONSES = 5;
export const SHOW_TEAM_RESULTS_ONLY_WHEN_CLOSED = true;

/** True when a group of team responses is large enough to show. */
export function teamResultsAllowed(teamCount) {
  return Number.isInteger(teamCount) && teamCount >= MIN_TEAM_RESPONSES;
}

/** Count team responses (leader excluded) in a list of response rows. */
export function countTeamResponses(responses) {
  return (responses || []).filter((r) => r && r.role === 'team_member').length;
}

function leaderOwnView(score) {
  if (!score.leaderAnswered) return { answered: false };
  return {
    answered: true,
    conditions: score.conditions.map((c) => ({ key: c.key, label: c.label, score: c.leader })),
    results: score.results.map((c) => ({ key: c.key, label: c.label, score: c.leader })),
  };
}

/**
 * Build the results payload for one round.
 *
 * @param {object} args
 * @param {Array}  args.items          the round's item list
 * @param {Array}  args.responses      [{ role, answers }] for this round (already cut by division if any)
 * @param {boolean} args.roundClosed   whether the round has closed
 * @param {object|null} args.previous  { items, responses } of the previous closed round, or null
 * @param {boolean} args.includeLeaderOwn  show the leader's own answers back
 */
export function gateRoundResults({ items, responses, roundClosed, previous = null, includeLeaderOwn = true }) {
  const score = scoreV3Round(items, responses);
  const teamResponses = score.teamResponses;
  const base = {
    teamResponses,
    needed: MIN_TEAM_RESPONSES,
    leaderAnswered: score.leaderAnswered,
    leaderOwn: includeLeaderOwn ? leaderOwnView(score) : undefined,
  };

  if (!teamResultsAllowed(teamResponses)) {
    return { ready: false, reason: 'not_enough_responses', ...base };
  }
  if (SHOW_TEAM_RESULTS_ONLY_WHEN_CLOSED && !roundClosed) {
    return { ready: false, reason: 'round_open', ...base };
  }

  let drift = null;
  if (previous && Array.isArray(previous.items) && Array.isArray(previous.responses)) {
    // The previous round must pass the same gate, or its numbers could be worked out from the change.
    if (teamResultsAllowed(countTeamResponses(previous.responses))) {
      const prevScore = scoreV3Round(previous.items, previous.responses);
      drift = computeDrift(score.conditions, prevScore.conditions);
    }
  }

  const hasLeader = score.leaderAnswered;
  const toPublic = (c) => ({
    key: c.key,
    label: c.label,
    team: c.team,
    leader: hasLeader ? c.leader : null,
  });
  const toMirror = (c) => ({ key: c.key, label: c.label, gap: c.gap, direction: c.direction });

  return {
    ready: true,
    ...base,
    confidence: score.confidence,
    conditions: score.conditions.map(toPublic),
    results: score.results.map(toPublic),
    mirror: hasLeader ? [...score.conditions, ...score.results].map(toMirror) : null,
    drift,
    patterns: score.patterns.filter((p) => hasLeader || p.key !== 'filtered_picture'),
  };
}
