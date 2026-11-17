/**
 * ALI v3 scoring. Pure functions; no database access.
 *
 * - Reversed items are reverse-scored (6 - x) before anything else.
 * - Each answer maps to 0..100: 1 -> 0, 2 -> 25, 3 -> 50, 4 -> 75, 5 -> 100.
 * - Idea score: team = mean of team members' answers; leader = the leader's answer.
 * - Condition and result score: mean of its idea scores.
 * - Mirror gap: leader minus team, read as a direction, never as "critical".
 * - Drift: change in each team condition score versus the previous closed round.
 * - Trial items are never scored.
 * - Every number handed out is a whole number.
 *
 * Thresholds marked PROVISIONAL are first guesses for the pilot. They are named
 * here so they can be tuned in one place once real pilot data exists.
 */

import { CONDITION_KEYS, RESULT_KEYS, CONDITION_LABELS } from './ali-conditions.js';

/** PROVISIONAL: a leader-team gap within this many points reads as agreement. */
export const MIRROR_AGREEMENT_BAND = 10;
/** Team respondents needed before the read is called solid (fewer is an early read). */
export const SOLID_READ_MIN_TEAM = 8;
/** PROVISIONAL: a condition at or above this is "high" for pattern naming. */
export const PATTERN_HIGH = 70;
/** PROVISIONAL: a condition below this is "low" for pattern naming. */
export const PATTERN_LOW = 55;
/** PROVISIONAL: leader-over-team gaps in at least this many of the 7 conditions = filtered picture. */
export const FILTERED_PICTURE_MIN_CONDITIONS = 5;

export const PATTERNS = Object.freeze({
  care_avoids_hard_things: {
    key: 'care_avoids_hard_things',
    title: 'Care that avoids hard things',
    text: 'Support is high and Accountability is low. People feel cared for, but hard conversations are being avoided.',
  },
  standards_through_fear: {
    key: 'standards_through_fear',
    title: 'Standards held through fear',
    text: 'Accountability is high while Voice or Support is low. Standards are holding, but people may not feel safe or supported.',
  },
  filtered_picture: {
    key: 'filtered_picture',
    title: 'A filtered picture',
    text: 'The leader rates most conditions higher than the team does. The leader may be working from a filtered picture.',
  },
});

const round = (n) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : null);
const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);

/** One answer (1..5) to 0..100, reverse-scored when needed. Invalid -> null. */
export function itemScore(value, isReversed) {
  if (!Number.isInteger(value) || value < 1 || value > 5) return null;
  const v = isReversed ? 6 - value : value;
  return (v - 1) * 25;
}

export function confidenceFor(teamCount) {
  return teamCount >= SOLID_READ_MIN_TEAM
    ? { key: 'solid', label: 'Solid read', teamResponses: teamCount }
    : { key: 'early', label: 'Early read', teamResponses: teamCount };
}

/** Mirror direction for a leader-minus-team gap. */
export function mirrorDirection(gap, band = MIRROR_AGREEMENT_BAND) {
  if (gap === null || gap === undefined) return null;
  if (gap > band) return 'leader_higher';
  if (gap < -band) return 'leader_lower';
  return 'in_agreement';
}

/**
 * Score one round.
 * @param {Array} items  the round's frozen item list (from buildV3Round)
 * @param {Array} responses  [{ role: 'leader' | 'team_member', answers: { [stable_id]: 1..5 } }]
 */
export function scoreV3Round(items, responses) {
  const scored = (items || []).filter((it) => !it.is_trial);
  const team = (responses || []).filter((r) => r && r.role === 'team_member');
  const leader = (responses || []).find((r) => r && r.role === 'leader') || null;

  // Idea level (one item per idea per round).
  const ideaRaw = {};
  for (const it of scored) {
    const teamVals = team
      .map((r) => itemScore(r.answers?.[it.stable_id], it.is_reversed))
      .filter((x) => x !== null);
    const leaderVal = leader ? itemScore(leader.answers?.[it.stable_id], it.is_reversed) : null;
    ideaRaw[it.idea_id] = { condition: it.condition, team: mean(teamVals), leader: leaderVal };
  }

  const groupRaw = (key) => {
    const ideas = Object.values(ideaRaw).filter((i) => i.condition === key);
    const t = ideas.map((i) => i.team).filter((x) => x !== null);
    const l = ideas.map((i) => i.leader).filter((x) => x !== null);
    return { team: mean(t), leader: mean(l) };
  };

  const row = (key) => {
    const raw = groupRaw(key);
    const teamScore = round(raw.team);
    const leaderScore = round(raw.leader);
    const gap = teamScore !== null && leaderScore !== null ? leaderScore - teamScore : null;
    return { key, label: CONDITION_LABELS[key], team: teamScore, leader: leaderScore, gap, direction: mirrorDirection(gap) };
  };

  const conditions = CONDITION_KEYS.map(row);
  const results = RESULT_KEYS.map(row);

  const ideas = Object.entries(ideaRaw).map(([ideaId, v]) => ({
    idea_id: ideaId,
    condition: v.condition,
    team: round(v.team),
    leader: round(v.leader),
  }));

  return {
    teamResponses: team.length,
    leaderAnswered: !!leader,
    confidence: confidenceFor(team.length),
    conditions,
    results,
    ideas,
    patterns: detectPatterns(conditions),
  };
}

/** Name the combinations the spec lists. Uses team scores and leader-team gaps. */
export function detectPatterns(conditions) {
  const by = Object.fromEntries((conditions || []).map((c) => [c.key, c]));
  const t = (k) => (by[k] && typeof by[k].team === 'number' ? by[k].team : null);
  const out = [];

  const support = t('support');
  const accountability = t('accountability');
  const voice = t('voice');

  if (support !== null && accountability !== null && support >= PATTERN_HIGH && accountability < PATTERN_LOW) {
    out.push(PATTERNS.care_avoids_hard_things);
  }
  if (
    accountability !== null &&
    accountability >= PATTERN_HIGH &&
    ((voice !== null && voice < PATTERN_LOW) || (support !== null && support < PATTERN_LOW))
  ) {
    out.push(PATTERNS.standards_through_fear);
  }
  const leaderHigher = (conditions || []).filter((c) => c.direction === 'leader_higher').length;
  if (leaderHigher >= FILTERED_PICTURE_MIN_CONDITIONS) out.push(PATTERNS.filtered_picture);

  return out;
}

/**
 * Drift: current team condition score minus the previous closed round's.
 * Returns null when there is no previous round (round 1).
 */
export function computeDrift(currentConditions, previousConditions) {
  if (!previousConditions) return null;
  const prev = Object.fromEntries(previousConditions.map((c) => [c.key, c.team]));
  return CONDITION_KEYS.map((key) => {
    const cur = (currentConditions || []).find((c) => c.key === key)?.team ?? null;
    const before = prev[key] ?? null;
    const change = cur !== null && before !== null ? cur - before : null;
    return { key, label: CONDITION_LABELS[key], previous: before, current: cur, change };
  });
}
