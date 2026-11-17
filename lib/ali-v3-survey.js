/**
 * ALI v3 survey builder. Pure and deterministic per (company, round number).
 *
 * Each round:
 *   - all 17 core ideas, one version (A to D) each;
 *   - the version of an idea moves one step every round (A, B, C, D, A, ...),
 *     starting from a per-company, per-idea offset, so a company never gets the
 *     same version of an idea in two rounds in a row;
 *   - exactly 1 trial idea (unscored), rotating through the trial pool;
 *   - leader and team get the same version of every idea and the same order;
 *   - the order is shuffled per round.
 */

import crypto from 'crypto';
import { V3_CORE_IDEAS, V3_TRIAL_IDEAS, V3_VERSIONS, V3_INSTRUMENT_VERSION, v3StableId, validateV3Bank } from './ali-v3-bank.js';

export const V3_CORE_IDEA_COUNT = 17;

function hashInt(...parts) {
  const h = crypto.createHash('sha256').update(parts.join('|')).digest();
  return h.readUInt32BE(0);
}

/** Small seeded generator (mulberry32). */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function v3RoundSeed(companyId, roundNumber) {
  return `${V3_INSTRUMENT_VERSION}|${companyId}|round-${roundNumber}`;
}

/** Version letter an idea gets for a company in a given round. */
export function versionFor(companyId, ideaId, roundNumber) {
  const offset = hashInt(V3_INSTRUMENT_VERSION, companyId, ideaId) % V3_VERSIONS.length;
  return V3_VERSIONS[(offset + roundNumber - 1) % V3_VERSIONS.length];
}

/** Trial idea for a company in a given round (rotates through the whole pool). */
export function trialIdeaFor(companyId, roundNumber, pool = V3_TRIAL_IDEAS) {
  if (!pool.length) return null;
  const offset = hashInt(V3_INSTRUMENT_VERSION, companyId, 'trial') % pool.length;
  return pool[(offset + roundNumber - 1) % pool.length];
}

function toItem(idea, version) {
  const ver = idea.versions[version];
  return {
    stable_id: v3StableId(idea.id, version),
    idea_id: idea.id,
    condition: idea.condition,
    kind: idea.kind,
    version,
    team_text: ver.team,
    leader_text: ver.leader,
    is_reversed: !!ver.reversed,
    is_trial: !!idea.trial,
  };
}

/**
 * Build the item list for one round.
 * @returns {{ instrument_version, round_number, seed, items: Array }}
 * @throws when the inputs or the bank cannot produce a valid round.
 */
export function buildV3Round(companyId, roundNumber, { coreIdeas = V3_CORE_IDEAS, trialIdeas = V3_TRIAL_IDEAS } = {}) {
  if (!companyId || typeof companyId !== 'string') throw new Error('buildV3Round: companyId is required');
  if (!Number.isInteger(roundNumber) || roundNumber < 1) throw new Error('buildV3Round: roundNumber must be a whole number from 1');

  const problems = validateV3Bank([...coreIdeas, ...trialIdeas]);
  if (problems.length) throw new Error(`The v3 question bank cannot build a survey: ${problems.join('; ')}`);
  if (coreIdeas.length !== V3_CORE_IDEA_COUNT) {
    throw new Error(`The v3 question bank cannot build a survey: expected ${V3_CORE_IDEA_COUNT} core ideas, found ${coreIdeas.length}`);
  }
  if (!trialIdeas.length) throw new Error('The v3 question bank cannot build a survey: the trial pool is empty');

  const items = coreIdeas.map((i) => toItem(i, versionFor(companyId, i.id, roundNumber)));
  const trial = trialIdeaFor(companyId, roundNumber, trialIdeas);
  items.push(toItem(trial, versionFor(companyId, trial.id, roundNumber)));

  // Shuffle: stable sort by id first, then seeded Fisher-Yates.
  items.sort((a, b) => a.stable_id.localeCompare(b.stable_id));
  const seed = v3RoundSeed(companyId, roundNumber);
  const rand = rng(hashInt(seed));
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  items.forEach((it, idx) => {
    it.order = idx + 1;
  });

  return { instrument_version: V3_INSTRUMENT_VERSION, round_number: roundNumber, seed, items };
}

/** Questions as one respondent sees them (role picks the wording). */
export function questionsForRole(items, role) {
  if (role !== 'leader' && role !== 'team_member') throw new Error('role must be leader or team_member');
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((it) => ({
      id: it.stable_id,
      text: role === 'leader' ? it.leader_text : it.team_text,
      is_trial: !!it.is_trial,
      order: it.order,
    }));
}

// ---------------------------------------------------------------------------
// Round helpers (pure).
// ---------------------------------------------------------------------------

export function isV3Deployment(d) {
  return !!d && d.instrument_version === V3_INSTRUMENT_VERSION && !!d.v3_round_id;
}

/** 'not_open' | 'open' | 'closed' */
export function roundStatus(d, now = new Date()) {
  if (!d) return 'closed';
  if (d.status === 'closed' || d.status === 'archived' || d.status === 'completed') return 'closed';
  if (d.closes_at && now > new Date(d.closes_at)) return 'closed';
  if (d.status === 'pending') return 'not_open';
  if (d.opens_at && now < new Date(d.opens_at)) return 'not_open';
  return 'open';
}

function parseRoundNumber(value) {
  if (Number.isInteger(value)) return value;
  const m = typeof value === 'string' ? value.match(/^S(\d+)$/) : null;
  return m ? parseInt(m[1], 10) : 0;
}

/** Highest round number seen for the company across every instrument, plus one. */
export function nextRoundNumberFrom({ deployments = [], snapshots = [], rounds = [] }) {
  const all = [
    ...deployments.map((d) => Math.max(parseRoundNumber(d.round_number), parseRoundNumber(d.survey_index))),
    ...snapshots.map((s) => parseRoundNumber(s.survey_index)),
    ...rounds.map((r) => parseRoundNumber(r.round_number)),
  ];
  return Math.max(0, ...all) + 1;
}
