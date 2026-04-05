/**
 * Generic **owner-local** hour hints when channel analytics are sparse (cold start / new platform).
 * Not personalized; schedule copy should label suggestions as heuristic, not optimal.
 */

/** @type {Record<string, number>} hour 0–23 in owner local time (e.g. America/Chicago) */
export const BENCHMARK_PREFERRED_HOUR_LOCAL = {
  linkedin: 10,
  facebook: 10,
  instagram: 11,
  twitter: 9,
};

/** Default minute for suggested local wall time (e.g. 10:30). */
export function benchmarkMinuteDefault() {
  const m = Number(process.env.AO_OWNER_SCHEDULE_MINUTE ?? 30);
  if (!Number.isFinite(m) || m < 0 || m > 59) return 30;
  return Math.floor(m);
}

export function normalizePlatformKey(p) {
  const s = String(p || '')
    .trim()
    .toLowerCase();
  if (s === 'x') return 'twitter';
  return s;
}

/**
 * @param {string[]} platforms - linkedin | facebook | instagram | twitter | x
 * @returns {number} hour 0–23 local
 */
export function benchmarkHourForPlatforms(platforms) {
  const list = [];
  for (const p of Array.isArray(platforms) ? platforms : []) {
    const k = normalizePlatformKey(p);
    const h = BENCHMARK_PREFERRED_HOUR_LOCAL[k];
    if (typeof h === 'number' && h >= 0 && h <= 23) list.push(h);
  }
  if (!list.length) return 10;
  return Math.round(list.reduce((a, b) => a + b, 0) / list.length);
}
