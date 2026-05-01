/**
 * ALI Narrative Trigger Engine
 *
 * Evaluates a single submission against two pattern-based triggers:
 *
 *   1. Specific dissonance — a single condition score is in the bottom of
 *      the scale AND is meaningfully below the respondent's own mean
 *      across conditions. The story will be specific.
 *
 *   2. Systemic stress — three or more conditions are in the bottom of
 *      the scale. The story will be about overall strain.
 *
 * At most one prompt is offered per submission. When both trigger types
 * fire, the dissonance prompt wins (specific stories beat broad ones).
 *
 * The engine is pure: it consumes the responses object and the question-
 * bank metadata, and returns a `prompt` descriptor or null. All persistence
 * happens in api/ali/submit-response.js.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedConfig = null;

const DEFAULT_CONFIG = {
  version: 1,
  specific_dissonance: {
    enabled: true,
    low_score_threshold_1to5: 2.0,
    delta_below_personal_mean: 1.5,
    min_personal_conditions: 3,
    prompt:
      'We noticed your reflections on {condition} sit lower than the rest of your answers. If you are willing, share what is shaping that. Your story is anonymous and is processed separately from your scores.',
  },
  systemic_stress: {
    enabled: true,
    low_score_threshold_1to5: 2.0,
    min_low_conditions: 3,
    prompt:
      'Your answers point to broader strain across several conditions. If you are willing, share what is shaping the overall pressure. Your story is anonymous and is processed separately from your scores.',
  },
  rules: {
    one_prompt_per_submission: true,
    preferred_when_both_fire: 'specific_dissonance',
    team_member_only: true,
  },
};

const CONDITION_LABELS = {
  clarity: 'Clarity',
  consistency: 'Consistency',
  trust: 'Trust',
  communication: 'Communication',
  alignment: 'Alignment',
  stability: 'Stability',
  leadership_drift: 'Drift',
};

/**
 * Load the trigger configuration from config/ali-narrative-triggers.json
 * with a hard-coded fallback so the trigger engine never fails closed.
 */
export function loadTriggerConfig() {
  if (cachedConfig) return cachedConfig;
  const candidates = [
    path.resolve(__dirname, '../config/ali-narrative-triggers.json'),
    path.resolve(process.cwd(), 'config/ali-narrative-triggers.json'),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        cachedConfig = JSON.parse(raw);
        return cachedConfig;
      }
    } catch (err) {
      console.warn('[narrative-triggers] Failed to read config at', filePath, err?.message || err);
    }
  }
  cachedConfig = DEFAULT_CONFIG;
  return cachedConfig;
}

/**
 * Compute per-pattern (a.k.a. per-condition) Likert means from a single
 * respondent's response object, using question_bank metadata to apply
 * reverse scoring for negative items.
 *
 * @param {Object} responses - { stable_id: 1..5, ... }
 * @param {Object} questionBank - { stable_id: { pattern, is_negative, ... } }
 * @returns {Object} { pattern: { mean, n } }
 */
export function computePerConditionMeans(responses, questionBank) {
  const buckets = {};
  for (const [stableId, raw] of Object.entries(responses || {})) {
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 1 || score > 5) continue;
    const meta = questionBank?.[stableId];
    if (!meta || !meta.pattern) continue;
    const adjusted = meta.is_negative ? 6 - score : score;
    if (!buckets[meta.pattern]) buckets[meta.pattern] = { sum: 0, n: 0 };
    buckets[meta.pattern].sum += adjusted;
    buckets[meta.pattern].n += 1;
  }
  const out = {};
  for (const [pattern, agg] of Object.entries(buckets)) {
    out[pattern] = {
      mean: agg.n > 0 ? agg.sum / agg.n : null,
      n: agg.n,
    };
  }
  return out;
}

/**
 * Evaluate trigger logic for a single submission.
 *
 * @param {Object} args
 * @param {Object} args.responses - { stable_id: 1..5 }
 * @param {Object} args.questionBank - keyed by stable_id with { pattern, is_negative, role }
 * @param {string} args.respondentRole - 'leader' or 'team_member'
 * @param {Object} [args.config] - Override the loaded config.
 * @returns {Object|null} { type, condition, prompt_text, signal } or null
 */
export function evaluateNarrativeTriggers({ responses, questionBank, respondentRole, config }) {
  const cfg = config || loadTriggerConfig();

  if (cfg.rules?.team_member_only && respondentRole !== 'team_member') {
    return null;
  }

  const perCondition = computePerConditionMeans(responses, questionBank);
  const conditionEntries = Object.entries(perCondition).filter(
    ([, v]) => typeof v?.mean === 'number' && Number.isFinite(v.mean)
  );

  if (conditionEntries.length === 0) return null;

  const dissonance = evaluateDissonance(conditionEntries, cfg);
  const systemic = evaluateSystemic(conditionEntries, cfg);

  const preferred = cfg.rules?.preferred_when_both_fire || 'specific_dissonance';

  if (dissonance && systemic) {
    return preferred === 'specific_dissonance' ? dissonance : systemic;
  }
  if (dissonance) return dissonance;
  if (systemic) return systemic;
  return null;
}

function evaluateDissonance(conditionEntries, cfg) {
  const block = cfg.specific_dissonance;
  if (!block?.enabled) return null;
  if (conditionEntries.length < (block.min_personal_conditions || 3)) return null;

  const personalMean =
    conditionEntries.reduce((acc, [, v]) => acc + v.mean, 0) / conditionEntries.length;

  const lowThreshold = block.low_score_threshold_1to5 ?? 2.0;
  const delta = block.delta_below_personal_mean ?? 1.5;

  const candidates = conditionEntries
    .filter(([, v]) => v.mean <= lowThreshold && personalMean - v.mean >= delta)
    .sort((a, b) => a[1].mean - b[1].mean);

  if (candidates.length === 0) return null;

  const [pattern, info] = candidates[0];
  const conditionLabel = CONDITION_LABELS[pattern] || pattern;
  const promptText = (block.prompt || '').replace('{condition}', conditionLabel);

  return {
    type: 'dissonance',
    condition: pattern,
    prompt_text: promptText,
    signal: {
      condition_mean_1to5: round(info.mean, 2),
      personal_mean_1to5: round(personalMean, 2),
      delta_below_personal_mean: round(personalMean - info.mean, 2),
      low_score_threshold_1to5: lowThreshold,
    },
  };
}

function evaluateSystemic(conditionEntries, cfg) {
  const block = cfg.systemic_stress;
  if (!block?.enabled) return null;

  const lowThreshold = block.low_score_threshold_1to5 ?? 2.0;
  const minLow = block.min_low_conditions ?? 3;

  const lowConditions = conditionEntries
    .filter(([, v]) => v.mean <= lowThreshold)
    .map(([k]) => k);

  if (lowConditions.length < minLow) return null;

  return {
    type: 'systemic',
    condition: null,
    prompt_text: block.prompt || '',
    signal: {
      low_conditions: lowConditions,
      low_count: lowConditions.length,
      low_score_threshold_1to5: lowThreshold,
    },
  };
}

function round(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export const __TEST_ONLY__ = {
  DEFAULT_CONFIG,
  CONDITION_LABELS,
};
