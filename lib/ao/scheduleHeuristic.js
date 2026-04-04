/**
 * Memory-aware schedule suggestions: stagger channel posts using upcoming queue + minimum gaps.
 * Blends optional per-post metrics (ao_scheduled_post_metrics) with generic benchmarks when data is thin.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { resolveSuggestedHourUtc } from './postMetrics.js';
import { normalizePlatformKey } from './scheduleBenchmarks.js';

const MIN_GAP_MS = 2 * 60 * 60 * 1000;

const CHANNEL_ORDER = ['linkedin', 'facebook', 'instagram', 'x'];

/**
 * Per-channel ISO times for a packaged journal/social bundle.
 * Stagger each channel by MIN_GAP_MS from the anchor (after last future scheduled post or soon).
 * @param {string[]} channels - e.g. ['linkedin','facebook','instagram','x']
 * @returns {Promise<Record<string, string>>}
 */
export async function buildScheduleSuggestionForChannels(channels = CHANNEL_ORDER) {
  const now = new Date();
  const want = new Set(
    (Array.isArray(channels) ? channels : [])
      .map((c) => String(c || '').trim().toLowerCase())
      .filter((c) => ['linkedin', 'facebook', 'instagram', 'x'].includes(c))
  );
  if (!want.size) {
    CHANNEL_ORDER.forEach((c) => want.add(c));
  }

  const { data } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .select('scheduled_at')
    .eq('status', 'scheduled')
    .gte('scheduled_at', now.toISOString())
    .order('scheduled_at', { ascending: false })
    .limit(1);

  const lastFuture = data?.[0]?.scheduled_at ? new Date(data[0].scheduled_at) : null;
  let anchorMs = Math.max(now.getTime() + MIN_GAP_MS, lastFuture ? lastFuture.getTime() + MIN_GAP_MS : now.getTime() + MIN_GAP_MS);

  const firstWanted = CHANNEL_ORDER.find((c) => want.has(c));
  const hintPlatforms = firstWanted ? [normalizePlatformKey(firstWanted)] : ['linkedin'];
  const { hour: prefHourUtc } = await resolveSuggestedHourUtc(hintPlatforms);

  let slot = new Date(anchorMs);
  slot.setUTCMinutes(0, 0, 0);
  slot.setUTCHours(prefHourUtc, 0, 0, 0);
  if (slot.getTime() <= now.getTime()) {
    slot = new Date(now.getTime() + MIN_GAP_MS);
    slot.setUTCMinutes(0, 0, 0);
    slot.setUTCHours(prefHourUtc, 0, 0, 0);
  }

  const suggestion = {};
  for (const ch of CHANNEL_ORDER) {
    if (!want.has(ch)) continue;
    suggestion[ch] = new Date(slot).toISOString();
    slot = new Date(slot.getTime() + MIN_GAP_MS);
  }

  return suggestion;
}
