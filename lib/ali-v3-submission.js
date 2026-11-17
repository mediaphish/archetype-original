/**
 * ALI v3 submission checks. Pure helpers used by api/ali/submit-response.js.
 */

import crypto from 'crypto';

/**
 * Check answers against the round's items.
 *  - every scored item must be answered with a whole number 1 to 5;
 *  - the trial item is optional, but if present must also be 1 to 5;
 *  - no keys that are not items of this round.
 * @returns {{ ok: boolean, error?: string, missing?: string[], clean?: object }}
 */
export function validateV3Answers(items, answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, error: 'Please answer the questions before sending.' };
  }
  const byId = new Map((items || []).map((it) => [it.stable_id, it]));
  const keys = Object.keys(answers);
  if (keys.length === 0) return { ok: false, error: 'Please answer the questions before sending.' };
  if (keys.length > byId.size) return { ok: false, error: 'These answers do not match this survey.' };

  for (const k of keys) {
    if (!byId.has(k)) return { ok: false, error: 'These answers do not match this survey.' };
  }

  const clean = {};
  const missing = [];
  for (const it of byId.values()) {
    const raw = answers[it.stable_id];
    if (raw === undefined || raw === null) {
      if (!it.is_trial) missing.push(it.stable_id);
      continue;
    }
    if (!Number.isInteger(raw) || raw < 1 || raw > 5) {
      return { ok: false, error: 'Each answer must be one of the five choices.' };
    }
    clean[it.stable_id] = raw;
  }
  if (missing.length) {
    return { ok: false, error: 'Please answer every question before sending.', missing };
  }
  return { ok: true, clean };
}

/** Browser-made submission id: 16 to 64 letters, digits or dashes. */
export function isValidSubmissionId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(id);
}

/** One-way fingerprint of a submission id for one round (the id itself is never stored). */
export function submissionKeyHash(deploymentId, submissionId) {
  return crypto.createHash('sha256').update(`ali-v3|${deploymentId}|${submissionId}`).digest('hex');
}

/**
 * Tiny in-memory rate limiter. Nothing is written anywhere, so no address is
 * ever stored. It resets when the server instance restarts, which is fine for
 * catching obvious abuse.
 */
export function createRateLimiter({ limit, windowMs, now = () => Date.now() }) {
  const hits = new Map();
  return function allow(key) {
    const t = now();
    const list = (hits.get(key) || []).filter((x) => t - x < windowMs);
    if (list.length >= limit) {
      hits.set(key, list);
      return false;
    }
    list.push(t);
    hits.set(key, list);
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (!v.length || t - v[v.length - 1] >= windowMs) hits.delete(k);
      }
    }
    return true;
  };
}
