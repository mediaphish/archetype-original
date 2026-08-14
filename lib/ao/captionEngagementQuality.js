/**
 * LLM engagement-quality check for journal captions.
 * Heuristics run first (waypointGates.evaluateCaptionQualityGate); this pass
 * only runs when structural checks already pass.
 *
 * External platform guidance is cached once per platform per day.
 */

import Anthropic from '@anthropic-ai/sdk';

const DAY_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { at: number, summary: string }>} */
const guidanceCache = new Map();

/** @type {null | ((args: object) => Promise<object>)} */
let engagementCheckOverride = null;

/** @type {null | ((platform: string) => Promise<string|null>)} */
let guidanceFetcherOverride = null;

const DEFAULT_ENGAGEMENT_GUIDANCE = {
  linkedin_personal:
    'LinkedIn: strong first two lines before the fold; specific insight + clear CTA beats generic summary.',
  linkedin_business:
    'LinkedIn: strong first two lines before the fold; specific insight + clear CTA beats generic summary.',
  facebook_business:
    'Facebook: conversational hook early; ask a concrete question people can answer in one line.',
  facebook_personal:
    'Facebook personal: human tone; a real ask (comment, share, visit) outperforms vague inspiration.',
  instagram_business:
    'Instagram: give a save/share reason; hashtags support discovery; keep a clear CTA near the end.',
  instagram_personal:
    'Instagram personal: short personal energy with a clear save/share or link-in-bio reason.',
  twitter:
    'X: dense, specific, near the character budget; a sharp question or direct invite outperforms stubs.',
};

export function setCaptionEngagementCheckOverrideForTests(fn) {
  engagementCheckOverride = typeof fn === 'function' ? fn : null;
}

export function setCaptionEngagementGuidanceFetcherForTests(fn) {
  guidanceFetcherOverride = typeof fn === 'function' ? fn : null;
}

export function clearCaptionEngagementGuidanceCacheForTests() {
  guidanceCache.clear();
}

export async function getCachedPlatformEngagementGuidance(platform) {
  const key = String(platform || '')
    .toLowerCase()
    .trim();
  if (!key) return null;
  const hit = guidanceCache.get(key);
  if (hit && Date.now() - hit.at < DAY_MS) return hit.summary;

  let summary = null;
  if (guidanceFetcherOverride) {
    summary = await guidanceFetcherOverride(key);
  } else {
    summary = DEFAULT_ENGAGEMENT_GUIDANCE[key] || DEFAULT_ENGAGEMENT_GUIDANCE.linkedin_personal;
  }
  if (summary) guidanceCache.set(key, { at: Date.now(), summary: String(summary) });
  return summary;
}

/**
 * @param {Record<string, string>} captionsByChannel
 * @param {{ postTitle?: string, postSummary?: string }} [meta]
 * @returns {Promise<{ ok: boolean, failures: Array<{ channel: string, reason: string }>, error?: string, guidance_used?: Record<string, string> }>}
 */
export async function evaluateCaptionEngagementQuality(captionsByChannel, meta = {}) {
  if (engagementCheckOverride) {
    return engagementCheckOverride(captionsByChannel, meta);
  }

  const captions =
    captionsByChannel && typeof captionsByChannel === 'object' ? captionsByChannel : {};
  const entries = Object.entries(captions).filter(([, v]) => String(v || '').trim());
  if (!entries.length) return { ok: true, failures: [] };

  const guidance_used = {};
  for (const [channel] of entries) {
    guidance_used[channel] = await getCachedPlatformEngagementGuidance(channel);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Without an API key, structural gate already ran — do not block scheduling.
    return { ok: true, failures: [], guidance_used, skipped: 'no_anthropic_key' };
  }

  try {
    const client = new Anthropic({ apiKey });
    const payload = entries.map(([channel, text]) => ({
      channel,
      caption: String(text).slice(0, 1200),
      guidance: guidance_used[channel],
    }));

    const prompt = `You are a strict CMO caption reviewer for Archetype Original.
Post title: ${JSON.stringify(meta.postTitle || '')}
Post summary: ${JSON.stringify(String(meta.postSummary || '').slice(0, 500))}

For each caption, decide pass or fail. Fail only if it is thin, generic, does not represent the post's real argument, or has a vague CTA.
Cite the platform guidance when explaining a failure.
Return ONLY JSON: {"results":[{"channel":"...","pass":true|false,"reason":"one line"}]}

Captions:
${JSON.stringify(payload, null, 2)}`;

    const resp = await client.messages.create({
      model: process.env.AO_CAPTION_QUALITY_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = (resp.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ok: true, failures: [], guidance_used, skipped: 'unparseable' };
    const parsed = JSON.parse(jsonMatch[0]);
    const failures = (parsed.results || [])
      .filter((r) => r && r.pass === false)
      .map((r) => ({
        channel: String(r.channel || ''),
        reason: String(r.reason || 'engagement quality failed'),
      }))
      .filter((r) => r.channel);

    if (!failures.length) return { ok: true, failures: [], guidance_used };
    return {
      ok: false,
      failures,
      guidance_used,
      error: `Caption engagement check failed — rewrite before scheduling. ${failures
        .map((f) => `${f.channel}: ${f.reason}`)
        .join(' | ')}`,
    };
  } catch (err) {
    console.warn('[evaluateCaptionEngagementQuality]', err?.message || err);
    // Fail open on infrastructure errors — structural gate already passed.
    return { ok: true, failures: [], guidance_used, skipped: 'llm_error' };
  }
}
