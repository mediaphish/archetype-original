/**
 * ALI results screen: pure helpers (no React, no network).
 *
 * Everything here works on the payload from GET /api/ali/results. Every number
 * shown to the leader is a whole number. Nothing here ever sees per-person data:
 * the server only hands out combined scores.
 */

import { CONDITION_KEYS, CONDITION_LABELS } from '../../../lib/ali-conditions.js';
import { MIRROR_AGREEMENT_BAND } from '../../../lib/ali-v3-scoring.js';

/** PROVISIONAL: team score at or above this reads "Strong". */
export const BAND_STRONG_MIN = 75;
/** PROVISIONAL: team score at or above this (and below Strong) reads "Mixed". Below is "Weak". */
export const BAND_MIXED_MIN = 55;
/** These cut points are first guesses until pilot data exists. */
export const BANDS_PROVISIONAL = true;

export { MIRROR_AGREEMENT_BAND };

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const whole = (n) => (isNum(n) ? Math.round(n) : null);

/** Word band for a team score. */
export function bandFor(score) {
  if (!isNum(score)) return null;
  if (score >= BAND_STRONG_MIN) return { key: 'strong', label: 'Strong' };
  if (score >= BAND_MIXED_MIN) return { key: 'mixed', label: 'Mixed' };
  return { key: 'weak', label: 'Weak' };
}

/** Leader minus team, or null when either side is missing. */
export function gapOf(row) {
  if (!row || !isNum(row.team) || !isNum(row.leader)) return null;
  return Math.round(row.leader) - Math.round(row.team);
}

/** Direction of a gap: leader_higher, in_agreement, leader_lower (or null). */
export function directionFor(gap, band = MIRROR_AGREEMENT_BAND) {
  if (!isNum(gap)) return null;
  if (gap > band) return 'leader_higher';
  if (gap < -band) return 'leader_lower';
  return 'in_agreement';
}

export const DIRECTION_TEXT = Object.freeze({
  leader_higher: 'You rate this higher than your team',
  in_agreement: 'You and your team agree',
  leader_lower: 'Your team rates this higher',
});

/** Plain words for a mirror direction. */
export function directionText(direction) {
  return DIRECTION_TEXT[direction] || '';
}

/**
 * Rows for the Mirror, in the approved order.
 * @param {Array} rows   payload.conditions or payload.results
 * @param {Array} mirror payload.mirror (may be null)
 * @param {Array} order  keys in display order
 */
export function mirrorRows(rows, mirror, order) {
  const byKey = Object.fromEntries((rows || []).map((r) => [r.key, r]));
  const mirrorByKey = Object.fromEntries((mirror || []).map((m) => [m.key, m]));
  const keys = order && order.length ? order : (rows || []).map((r) => r.key);
  return keys
    .filter((k) => byKey[k])
    .map((k) => {
      const r = byKey[k];
      const team = whole(r.team);
      const leader = whole(r.leader);
      const m = mirrorByKey[k];
      const gap = m && isNum(m.gap) ? Math.round(m.gap) : gapOf({ team, leader });
      const direction = leader === null ? null : (m && m.direction) || directionFor(gap);
      return { key: k, label: r.label || CONDITION_LABELS[k] || k, team, leader, gap: leader === null ? null : gap, direction };
    });
}

/** Conditions sorted by team score, highest first (ties keep the approved order). */
export function sortedByTeam(conditions) {
  const order = (k) => {
    const i = CONDITION_KEYS.indexOf(k);
    return i === -1 ? 99 : i;
  };
  return (conditions || [])
    .filter((c) => isNum(c.team))
    .slice()
    .sort((a, b) => b.team - a.team || order(a.key) - order(b.key));
}

/**
 * The one condition to focus on this round: lowest team score.
 * Ties go to the largest leader-over-team gap, then the approved order.
 * Returns the condition key, or null.
 */
export function pickFocus(conditions) {
  const rows = (conditions || []).filter((c) => c && isNum(c.team));
  if (!rows.length) return null;
  const gapRank = (c) => {
    const g = gapOf(c);
    return g === null ? -Infinity : g;
  };
  const order = (k) => {
    const i = CONDITION_KEYS.indexOf(k);
    return i === -1 ? 99 : i;
  };
  const sorted = rows.slice().sort((a, b) => {
    const ta = Math.round(a.team);
    const tb = Math.round(b.team);
    if (ta !== tb) return ta - tb;
    const ga = gapRank(a);
    const gb = gapRank(b);
    if (ga !== gb) return gb - ga;
    return order(a.key) - order(b.key);
  });
  return sorted[0].key;
}

/**
 * One plain headline from the data.
 * "Your team sees Clarity as your strongest condition. You rate Voice 30 points higher than they do."
 */
export function buildHeadline(conditions) {
  const rows = (conditions || []).filter((c) => c && isNum(c.team));
  if (!rows.length) return '';
  const strongest = sortedByTeam(rows)[0];
  const first = `Your team sees ${strongest.label} as your strongest condition.`;

  const withGap = rows
    .map((c) => ({ c, gap: gapOf(c) }))
    .filter((x) => x.gap !== null);

  if (!withGap.length) {
    const focus = rows.find((c) => c.key === pickFocus(rows));
    if (focus && focus.key !== strongest.key) {
      return `${first} ${focus.label} is where they see the most room to grow.`;
    }
    return first;
  }

  const order = (k) => {
    const i = CONDITION_KEYS.indexOf(k);
    return i === -1 ? 99 : i;
  };
  const biggest = withGap
    .slice()
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap) || b.gap - a.gap || order(a.c.key) - order(b.c.key))[0];

  if (Math.abs(biggest.gap) <= MIRROR_AGREEMENT_BAND) {
    return `${first} You and your team see every condition about the same way.`;
  }
  const pts = Math.abs(biggest.gap);
  const unit = pts === 1 ? 'point' : 'points';
  if (biggest.gap > 0) {
    return `${first} You rate ${biggest.c.label} ${pts} ${unit} higher than they do.`;
  }
  return `${first} Your team rates ${biggest.c.label} ${pts} ${unit} higher than you do.`;
}

/** "up 6 since last round", "down 4 since last round", "no change since last round". */
export function driftText(change) {
  if (!isNum(change)) return '';
  const n = Math.round(change);
  if (n > 0) return `up ${n} since last round`;
  if (n < 0) return `down ${Math.abs(n)} since last round`;
  return 'no change since last round';
}

/** True when the payload carries a usable change since the last round. */
export function hasDrift(drift) {
  return Array.isArray(drift) && drift.some((d) => d && isNum(d.change));
}

/** Patterns, in names a leader understands. */
export const PATTERN_COPY = Object.freeze({
  care_avoids_hard_things: {
    title: 'Care that avoids hard conversations',
    text: 'Your team feels cared for, but standards are slipping. The hard conversations are probably being put off.',
  },
  standards_through_fear: {
    title: 'Standards held through fear',
    text: 'Standards are holding, but people may not feel safe to speak up or supported when the load gets heavy.',
  },
  filtered_picture: {
    title: 'You may be working from a filtered picture',
    text: 'You rate most conditions higher than your team does. Some of what they see may not be reaching you.',
  },
});

export function patternCards(patterns) {
  return (patterns || [])
    .filter((p) => p && p.key)
    .map((p) => ({ key: p.key, ...(PATTERN_COPY[p.key] || { title: p.title || '', text: p.text || '' }) }))
    .filter((p) => p.title);
}

function parseDate(value) {
  if (!value) return null;
  // A plain day ("2026-12-01") is read as that calendar day, not midnight UTC.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function longDay(value) {
  const d = parseDate(value);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function shortDay(value) {
  const d = parseDate(value);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "Round 2 · closes Friday, Dec 1" / "Round 1 closed Nov 30" / "Round 3 · opens Monday, Dec 4". */
export function roundStatusLine(round) {
  if (!round || !isNum(round.number)) return '';
  const n = `Round ${round.number}`;
  if (round.status === 'closed') {
    const day = shortDay(round.closesAt);
    return day ? `${n} closed ${day}` : `${n} closed`;
  }
  if (round.status === 'not_open') {
    const day = longDay(round.opensAt);
    return day ? `${n} · opens ${day}` : `${n} · not open yet`;
  }
  const day = longDay(round.closesAt);
  return day ? `${n} · closes ${day}` : `${n} · open`;
}

/** "7 team members answered" (a count, never who). */
export function answeredText(count) {
  const n = isNum(count) ? Math.round(count) : 0;
  return `${n} team ${n === 1 ? 'member' : 'members'} answered`;
}

/** The screen state for a payload. */
export function screenState(payload) {
  if (!payload) return 'error';
  if (payload.reason === 'no_rounds' || (Array.isArray(payload.rounds) && payload.rounds.length === 0 && !payload.round)) {
    return 'welcome';
  }
  return payload.ready ? 'ready' : 'waiting';
}
