/**
 * Generic UTC hour hints when channel analytics are sparse (cold start / new platform).
 * Not personalized; schedule copy should label suggestions as heuristic, not optimal.
 */

/** @type {Record<string, number>} hour 0–23 UTC */
export const BENCHMARK_PREFERRED_HOUR_UTC = {
  linkedin: 14,
  facebook: 15,
  instagram: 17,
  twitter: 13,
};

export function normalizePlatformKey(p) {
  const s = String(p || '')
    .trim()
    .toLowerCase();
  if (s === 'x') return 'twitter';
  return s;
}

/**
 * @param {string[]} platforms - linkedin | facebook | instagram | twitter | x
 * @returns {number} hour 0–23 UTC
 */
export function benchmarkHourForPlatforms(platforms) {
  const list = [];
  for (const p of Array.isArray(platforms) ? platforms : []) {
    const k = normalizePlatformKey(p);
    const h = BENCHMARK_PREFERRED_HOUR_UTC[k];
    if (typeof h === 'number' && h >= 0 && h <= 23) list.push(h);
  }
  if (!list.length) return 14;
  return Math.round(list.reduce((a, b) => a + b, 0) / list.length);
}
