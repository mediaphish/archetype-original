/**
 * ALI Seven Conditions — Canonical Order (Single Source of Truth)
 *
 * The seven conditions ALI measures, in their authoritative narrative order:
 *
 *   1. Clarity        — Everything starts here.
 *   2. Communication  — How clarity travels.
 *   3. Consistency    — Earns the right to be trusted.
 *   4. Trust          — The result of consistency over time.
 *   5. Alignment      — What happens when a team that trusts is pointed the same direction.
 *   6. Stability      — The output of the first five working together.
 *   7. Drift          — The warning signal when any of the first six erode.
 *
 * The story this sequence tells:
 *   Clarity creates Communication. Communication earns Consistency.
 *   Consistency builds Trust. Trust enables Alignment. Alignment produces
 *   Stability. Drift is what happens when you stop paying attention to any of it.
 *
 * NO OTHER FILE SHOULD RE-DECLARE THIS ORDER.
 *   - UI rendering, scoring iteration, prompt templates, validation enums,
 *     dropdowns, AI insight schemas — all import from this module.
 *   - The DB stores Drift under the key `leadership_drift` (legacy). The
 *     display label is `Drift`. Both are reflected here.
 */

/** Ordered key list. The single sequence used for iteration anywhere. */
export const CONDITION_KEYS = Object.freeze([
  'clarity',
  'communication',
  'consistency',
  'trust',
  'alignment',
  'stability',
  'leadership_drift',
]);

/** Display labels keyed by canonical key. */
export const CONDITION_LABELS = Object.freeze({
  clarity: 'Clarity',
  communication: 'Communication',
  consistency: 'Consistency',
  trust: 'Trust',
  alignment: 'Alignment',
  stability: 'Stability',
  leadership_drift: 'Drift',
});

/** Short tagline for marketing cards / nav surfaces. */
export const CONDITION_TAGLINES = Object.freeze({
  clarity: 'How well people know what matters.',
  communication: 'Whether information moves in both directions.',
  consistency: 'How reliably leadership shows up the same way over time.',
  trust: 'Whether this is a place where people can be honest.',
  alignment: 'How well shared intent and lived behavior line up.',
  stability: 'How steady and predictable the environment feels.',
  leadership_drift: 'Whether the conditions are holding or silently sliding.',
});

/** Long-form descriptions for marketing cards and explainer modals. */
export const CONDITION_DESCRIPTIONS = Object.freeze({
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

/**
 * Convenience: ordered array of `{ key, label, tagline, description }` records,
 * pre-numbered as 01..07 strings to match marketing card layouts.
 */
export const CONDITION_CARDS = Object.freeze(
  CONDITION_KEYS.map((key, index) => ({
    number: String(index + 1).padStart(2, '0'),
    key,
    label: CONDITION_LABELS[key],
    tagline: CONDITION_TAGLINES[key],
    description: CONDITION_DESCRIPTIONS[key],
  }))
);

/** True when a string matches a known canonical condition key. */
export function isConditionKey(value) {
  return typeof value === 'string' && CONDITION_KEYS.includes(value);
}

/** Display label for a key, or the original key if unknown. */
export function conditionLabel(key) {
  return CONDITION_LABELS[key] || key;
}
