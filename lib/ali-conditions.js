/**
 * ALI conditions, version 3 (approved by Bart 2026-11-16). Single source of truth.
 *
 * Spec: notes/ali-conditions-v3.md
 *
 * What the leader creates (the seven conditions, in this order):
 *   1. Clarity        I know what matters.
 *   2. Consistency    People can predict you.
 *   3. Accountability Standards hold for everyone, the leader first.
 *   4. Voice          People can tell you the truth.
 *   5. Growth         People are getting better here.
 *   6. Support        People are cared for, and pressure is carried fairly.
 *   7. Alignment      We are pulling the same direction.
 *
 * What it produces (results, measured but not conditions):
 *   - Trust        The result of the seven, earned over time.
 *   - Commitment   People choose to stay and give their best.
 *
 * Calculated, never asked:
 *   - Drift        The direction the conditions are moving, round to round.
 *
 * NO OTHER FILE SHOULD RE-DECLARE THIS ORDER.
 *
 * LEGACY: the older seven (clarity, communication, consistency, trust, alignment,
 * stability, leadership_drift) are still exported below under LEGACY_* names, only
 * because old v1/v2 test data, the old dashboard (rebuilt in milestone 2) and the
 * public marketing pages (rewritten in rollout step 4, wording shown to Bart first)
 * still read them. New code must use the v3 exports.
 */

/** The seven conditions, in order. */
export const CONDITION_KEYS = Object.freeze([
  'clarity',
  'consistency',
  'accountability',
  'voice',
  'growth',
  'support',
  'alignment',
]);

/** The two results the conditions produce. */
export const RESULT_KEYS = Object.freeze(['trust', 'commitment']);

/** Drift is calculated from round to round, never asked. */
export const DRIFT_KEY = 'drift';

/** Every measured key (conditions, then results). */
export const MEASURED_KEYS = Object.freeze([...CONDITION_KEYS, ...RESULT_KEYS]);

export const CONDITION_LABELS = Object.freeze({
  clarity: 'Clarity',
  consistency: 'Consistency',
  accountability: 'Accountability',
  voice: 'Voice',
  growth: 'Growth',
  support: 'Support',
  alignment: 'Alignment',
  trust: 'Trust',
  commitment: 'Commitment',
  drift: 'Drift',
});

/** Short line under each name (approved wording). */
export const CONDITION_TAGLINES = Object.freeze({
  clarity: 'I know what matters.',
  consistency: 'People can predict you.',
  accountability: 'Standards hold for everyone, the leader first.',
  voice: 'People can tell you the truth.',
  growth: 'People are getting better here.',
  support: 'People are cared for, and pressure is carried fairly.',
  alignment: 'We are pulling the same direction.',
  trust: 'The result of the seven, earned over time.',
  commitment: 'People choose to stay and give their best.',
  drift: 'The direction the conditions are moving.',
});

/** Approved definitions. */
export const CONDITION_DESCRIPTIONS = Object.freeze({
  clarity:
    'Priorities, expectations, and what good looks like are plain enough that I can act without guessing, even when things change.',
  consistency:
    "You do what you say. Your follow-through and tone are steady from week to week, so people don't brace for which version of you shows up.",
  accountability:
    "The same expectations apply to everyone. Problems are addressed directly and early. The leader admits mistakes and can be corrected. Care that avoids hard conversations isn't kindness. It's avoidance.",
  voice:
    'Disagreement, bad news, and early warnings reach the leader without a price attached. When voice is low, the leader is working from a filtered version of reality.',
  growth:
    'The leader develops people, gives real feedback, shares credit, and trusts people with real decisions instead of holding every one.',
  support:
    "People are cared for as people. Load is matched to capacity, the weight doesn't always fall on the same few, and people are strengthened before they break, not after.",
  alignment:
    'Work and decisions connect to a shared purpose, and people understand the tradeoffs. Unity without sameness: disagreement is welcome, and drifting apart is not.',
  trust:
    "It can't be declared. It shows up as candor, early problem-raising, and people giving their best.",
  commitment: 'A signal, not a verdict: pay and the job market play a part too.',
  drift:
    "Calculated from one round to the next, starting with round two. It's the early warning that something is sliding before it becomes damage. Never asked as a question.",
});

/** True when the value is one of the seven v3 conditions. */
export function isConditionKey(value) {
  return typeof value === 'string' && CONDITION_KEYS.includes(value);
}

/** True when the value is a v3 condition or result. */
export function isMeasuredKey(value) {
  return typeof value === 'string' && MEASURED_KEYS.includes(value);
}

/** Display label for a key (v3 first, then legacy), or the key itself. */
export function conditionLabel(key) {
  return CONDITION_LABELS[key] || LEGACY_CONDITION_LABELS[key] || key;
}

// ---------------------------------------------------------------------------
// LEGACY (v1/v2 instrument). Read-only use for old test data and old pages.
// ---------------------------------------------------------------------------

/** Old pattern keys as stored in ali_question_bank.pattern (v1/v2). */
export const LEGACY_CONDITION_KEYS = Object.freeze([
  'clarity',
  'communication',
  'consistency',
  'trust',
  'alignment',
  'stability',
  'leadership_drift',
]);

export const LEGACY_CONDITION_LABELS = Object.freeze({
  clarity: 'Clarity',
  communication: 'Communication',
  consistency: 'Consistency',
  trust: 'Trust',
  alignment: 'Alignment',
  stability: 'Stability',
  leadership_drift: 'Drift',
});

export const LEGACY_CONDITION_TAGLINES = Object.freeze({
  clarity: 'How well people know what matters.',
  communication: 'Whether information moves in both directions.',
  consistency: 'How reliably leadership shows up the same way over time.',
  trust: 'Whether this is a place where people can be honest.',
  alignment: 'How well shared intent and lived behavior line up.',
  stability: 'How steady and predictable the environment feels.',
  leadership_drift: 'Whether the conditions are holding or silently sliding.',
});

export const LEGACY_CONDITION_DESCRIPTIONS = Object.freeze({
  clarity:
    'Clarity is how well people know what matters: priorities, expectations, and what good looks like in the day to day. It is not whether the leader feels clear. It is whether direction, tradeoffs, and decisions land for the team and stay intelligible when pressure hits. Everything else in the system depends on this.',
  communication:
    'Communication is whether information moves in both directions, not merely whether leaders talk. It is the delivery system for clarity. It covers whether messages land, where bottlenecks and distortion appear, and whether the team is stuck in loops, assumptions, or leadership by rumor.',
  consistency:
    'Consistency is how reliably leadership shows up the same way over time: standards, follow through, emotional steadiness, and the match between what leaders say and what they do. Consistency is what earns the right to be trusted. Inconsistency reads as caprice, erodes trust, and teaches people to second guess or protect themselves.',
  trust:
    'Trust is whether this is a place where people can be honest: psychological safety, fairness, room to disagree, and reactions to bad news that do not train silence. Trust is built by pattern, not by intention — it is the result of consistency over time. High trust shows up as candor and early problem raising. Low trust shows up as filtering, fear, and late exits.',
  alignment:
    'Alignment is how well shared intent and lived behavior line up: common read on values, standards, and direction, and whether the group is rowing the same way. Alignment is what happens when a team that trusts its leader is actually pointed in the same direction. Without the prior conditions, alignment is forced. With them, it emerges.',
  stability:
    'Stability is how steady and predictable the environment feels: structure under stress, how conflict is held, and whether roles and expectations hold instead of lurching. Stability is the output of the first five conditions functioning together. It is the difference between a team that can perform under load and one that is constantly bracing for the next shift in tone or rules.',
  leadership_drift:
    'Drift is the pattern where small, tolerated slips in clarity, standards, and accountability compound: avoiding hard conversations, tolerating ambiguity, slowly shifting how things really work. Drift is not a parallel condition; it is the warning signal that one or more of the first six conditions are eroding. On the dashboard, Drift flags growing mismatch and erosion before it becomes visible damage.',
});

/** Legacy marketing cards, kept so the public pages render unchanged until step 4. */
export const LEGACY_CONDITION_CARDS = Object.freeze(
  LEGACY_CONDITION_KEYS.map((key, index) => ({
    number: String(index + 1).padStart(2, '0'),
    key,
    label: LEGACY_CONDITION_LABELS[key],
    tagline: LEGACY_CONDITION_TAGLINES[key],
    description: LEGACY_CONDITION_DESCRIPTIONS[key],
  }))
);
