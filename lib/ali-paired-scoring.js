/**
 * ALI Paired-Construct Scoring (Instrument v2.0)
 *
 * In v1.x, score helpers worked on individual question_ids. In v2.0 the unit
 * of measurement is the construct: each active construct is delivered as a
 * leader stem AND a team-member stem on the same scale. The Leadership Mirror
 * is the gap between those two role-aggregated views, per construct, per
 * pattern, and overall.
 *
 * Inputs use the same shape that api/ali/dashboard.js already builds for v1.x
 * scoring (an array of {question_id, response, role, ...} objects), plus a
 * questionBank map keyed by stable_id whose values include `construct_id`.
 */

const PATTERNS = [
  'clarity',
  'consistency',
  'trust',
  'communication',
  'alignment',
  'stability',
  'leadership_drift',
];

/**
 * Average a list of 1–5 Likert responses, treating reverse-scored items as
 * 6 - response, then mapping to 0–100 to match the existing dashboard scale.
 *
 * Returns null if the list is empty.
 */
function meanLikertTo100(items) {
  const valid = items.filter(
    (i) => typeof i.response === 'number' && i.response >= 1 && i.response <= 5
  );
  if (valid.length === 0) return null;
  let sum = 0;
  for (const item of valid) {
    const score = item.is_negative ? 6 - item.response : item.response;
    sum += score;
  }
  const mean1to5 = sum / valid.length;
  return ((mean1to5 - 1) / 4) * 100;
}

/**
 * Aggregate responses by construct and role.
 *
 * @param {Array} transformedResponses - Items shaped like
 *   {question_id, response, role, is_negative, is_anchor, pattern}
 * @param {Object} questionBank - Map of stable_id -> { construct_id, pattern, is_anchor, is_negative, role }
 * @returns {Map<string, {
 *   construct_id, pattern, is_anchor, leader_score, team_score, leader_n, team_n
 * }>}
 */
export function aggregateByConstruct(transformedResponses, questionBank) {
  const byConstruct = new Map();

  for (const r of transformedResponses) {
    const meta = questionBank?.[r.question_id];
    if (!meta || !meta.construct_id) continue;

    if (!byConstruct.has(meta.construct_id)) {
      byConstruct.set(meta.construct_id, {
        construct_id: meta.construct_id,
        pattern: meta.pattern || r.pattern,
        is_anchor: !!meta.is_anchor,
        leader_items: [],
        team_items: [],
      });
    }

    const bucket = byConstruct.get(meta.construct_id);
    const item = {
      response: r.response,
      is_negative: !!(r.is_negative ?? meta.is_negative),
    };
    if (r.role === 'leader') bucket.leader_items.push(item);
    if (r.role === 'team_member') bucket.team_items.push(item);
  }

  for (const bucket of byConstruct.values()) {
    bucket.leader_score = meanLikertTo100(bucket.leader_items);
    bucket.team_score = meanLikertTo100(bucket.team_items);
    bucket.leader_n = bucket.leader_items.length;
    bucket.team_n = bucket.team_items.length;
    delete bucket.leader_items;
    delete bucket.team_items;
  }

  return byConstruct;
}

/**
 * Compute the per-construct Mirror gap (leader_score - team_score).
 * Returns an array of objects ordered by construct_id for deterministic output.
 */
export function calculateConstructMirrorGaps(constructMap) {
  const out = [];
  for (const c of constructMap.values()) {
    const gap =
      typeof c.leader_score === 'number' && typeof c.team_score === 'number'
        ? c.leader_score - c.team_score
        : null;
    out.push({
      construct_id: c.construct_id,
      pattern: c.pattern,
      is_anchor: !!c.is_anchor,
      leader_score: c.leader_score,
      team_score: c.team_score,
      leader_n: c.leader_n,
      team_n: c.team_n,
      mirror_gap: gap,
    });
  }
  out.sort((a, b) => a.construct_id.localeCompare(b.construct_id));
  return out;
}

/**
 * Average a list of numeric values, ignoring null/undefined/non-finite. Returns
 * null when no usable values exist.
 */
function meanIgnoringMissing(values) {
  const usable = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (usable.length === 0) return null;
  return usable.reduce((a, b) => a + b, 0) / usable.length;
}

/**
 * Per-pattern paired view. For each of the seven patterns, computes:
 *   - leader_score: mean of leader-side construct scores in the pattern
 *   - team_score: mean of team-side construct scores in the pattern
 *   - mirror_gap: leader_score - team_score
 *   - construct_count: number of constructs used
 */
export function calculateConditionMirror(constructMap) {
  const grouped = new Map();
  for (const c of constructMap.values()) {
    const key = c.pattern;
    if (!grouped.has(key)) {
      grouped.set(key, { pattern: key, leader_scores: [], team_scores: [], constructs: [] });
    }
    const g = grouped.get(key);
    g.leader_scores.push(c.leader_score);
    g.team_scores.push(c.team_score);
    g.constructs.push(c.construct_id);
  }

  const out = {};
  for (const pattern of PATTERNS) {
    const g = grouped.get(pattern);
    if (!g) {
      out[pattern] = {
        pattern,
        leader_score: null,
        team_score: null,
        mirror_gap: null,
        construct_count: 0,
      };
      continue;
    }
    const leader = meanIgnoringMissing(g.leader_scores);
    const team = meanIgnoringMissing(g.team_scores);
    const gap =
      typeof leader === 'number' && typeof team === 'number' ? leader - team : null;
    out[pattern] = {
      pattern,
      leader_score: leader,
      team_score: team,
      mirror_gap: gap,
      construct_count: g.constructs.length,
    };
  }
  return out;
}

/**
 * Overall Mirror gap = mean of per-construct gaps where both sides exist.
 */
export function calculateOverallMirror(constructMirrorGaps) {
  const usable = constructMirrorGaps.filter(
    (c) => typeof c.mirror_gap === 'number' && Number.isFinite(c.mirror_gap)
  );
  if (usable.length === 0) {
    return { leader_score: null, team_score: null, mirror_gap: null, construct_count: 0 };
  }
  const leader = meanIgnoringMissing(usable.map((c) => c.leader_score));
  const team = meanIgnoringMissing(usable.map((c) => c.team_score));
  const gap = meanIgnoringMissing(usable.map((c) => c.mirror_gap));
  return {
    leader_score: leader,
    team_score: team,
    mirror_gap: gap,
    construct_count: usable.length,
  };
}

/**
 * Build an anchor trajectory series from a list of per-deployment paired
 * scoring results. Each input item should look like:
 *   { period, anchorAggregates: [{ construct_id, mirror_gap, team_score }, ...] }
 *
 * Returns an array keyed by anchor construct_id, each containing an ordered
 * list of {period, leader_score, team_score, mirror_gap}.
 */
export function buildAnchorTrajectories(perDeploymentResults) {
  const series = new Map();
  for (const result of perDeploymentResults) {
    const period = result.period;
    for (const c of result.constructMirrorGaps || []) {
      if (!c.is_anchor) continue;
      if (!series.has(c.construct_id)) series.set(c.construct_id, []);
      series.get(c.construct_id).push({
        period,
        leader_score: c.leader_score,
        team_score: c.team_score,
        mirror_gap: c.mirror_gap,
      });
    }
  }
  const out = [];
  for (const [construct_id, points] of series.entries()) {
    out.push({ construct_id, points });
  }
  out.sort((a, b) => a.construct_id.localeCompare(b.construct_id));
  return out;
}

/**
 * Convenience: compute the full paired scoring block for a single deployment.
 *
 * Returns:
 *   {
 *     constructs: Array<{ construct_id, ..., mirror_gap }>,
 *     conditionMirror: { clarity: { leader_score, team_score, mirror_gap }, ... },
 *     overallMirror: { leader_score, team_score, mirror_gap, construct_count }
 *   }
 */
export function calculatePairedDeploymentScores(transformedResponses, questionBank) {
  const aggregates = aggregateByConstruct(transformedResponses, questionBank);
  const constructMirrorGaps = calculateConstructMirrorGaps(aggregates);
  const conditionMirror = calculateConditionMirror(aggregates);
  const overallMirror = calculateOverallMirror(constructMirrorGaps);
  return {
    constructs: constructMirrorGaps,
    conditionMirror,
    overallMirror,
  };
}
