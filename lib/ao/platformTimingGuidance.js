/**
 * Cached general platform timing guidance for thin engagement samples.
 * Injectable fetcher for tests; production uses a bounded static summary
 * refreshed at most once per platform per day (no per-schedule web crawl).
 */

const THIN_SAMPLE_THRESHOLD = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { at: number, summary: string }>} */
const cache = new Map();

/** @type {null | ((platform: string) => Promise<string|null>)} */
let guidanceFetcherOverride = null;

const DEFAULT_GUIDANCE = {
  linkedin:
    'Current general LinkedIn guidance favors mid-week late morning to early afternoon in the audience timezone.',
  facebook:
    'Current general Facebook Page guidance often points to weekday afternoons and early evenings.',
  instagram:
    'Current general Instagram feed guidance often favors late morning and early evening windows.',
  twitter:
    'Current general X/Twitter guidance often points to late morning through early afternoon on weekdays.',
};

export function getThinSampleThreshold() {
  return THIN_SAMPLE_THRESHOLD;
}

export function setPlatformTimingGuidanceFetcherForTests(fn) {
  guidanceFetcherOverride = typeof fn === 'function' ? fn : null;
}

export function clearPlatformTimingGuidanceCacheForTests() {
  cache.clear();
}

/**
 * @param {string} platform
 * @returns {Promise<string|null>}
 */
export async function getPlatformTimingExternalGuidance(platform) {
  const key = String(platform || '')
    .toLowerCase()
    .trim();
  if (!key) return null;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < DAY_MS) return hit.summary;

  let summary = null;
  if (guidanceFetcherOverride) {
    summary = await guidanceFetcherOverride(key);
  } else {
    summary = DEFAULT_GUIDANCE[key] || DEFAULT_GUIDANCE.linkedin;
  }

  if (summary) cache.set(key, { at: Date.now(), summary: String(summary) });
  return summary;
}
