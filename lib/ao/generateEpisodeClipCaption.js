/**
 * Podcast clip captions.
 *
 * The caption is written in Bart's voice and posted under his name, so it runs
 * on Claude through textModel.js. It ran on gpt-4o-mini until 2026-09-23, which
 * meant his voice guardrails were checking writing from a model that had never
 * seen the standard. The title-and-link fallback still applies when no text
 * model is configured.
 */

import { completeJson, textModelConfigured } from './textModel.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

async function clipCaptionJson(prompt) {
  if (!textModelConfigured()) return null;
  try {
    return await completeJson({ prompt, task: 'voice', maxTokens: 1500 });
  } catch {
    return null;
  }
}

/**
 * Short-form clip caption: hook-first, one sentence, light hashtags, CTA to full episode.
 * Scaffolding for Riverside Magic Clips — not wired into live Auto UI yet.
 */
export async function generateEpisodeClipCaption({
  episode_title = '',
  episode_url = '',
  clip_hint = '',
} = {}) {
  const title = safeText(episode_title, 200);
  const url = safeText(episode_url, 500);
  const hint = safeText(clip_hint, 800);

  const fallbackCaption = title
    ? `${title}${url ? ` — full episode: ${url}` : ''}`
    : url || 'New clip from the podcast.';

  if (!textModelConfigured()) {
    return {
      ok: true,
      caption: safeText(fallbackCaption, 280),
      hashtags: ['#leadership', '#podcast'].slice(0, 4),
      cta: url || null,
    };
  }

  const parsed = await clipCaptionJson(`Write a short social caption for a podcast clip.

Rules:
- One sentence hook only. No em dashes. No AI filler.
- Punchy, conversational, Bart's voice — not a summary of the episode.
- End with a clear CTA to the full episode URL if provided.
- Propose 2-4 relevant hashtags (no stuffing).

Return ONLY JSON:
{
  "caption": string,
  "hashtags": string[],
  "cta": string|null
}

Episode title: ${JSON.stringify(title)}
Full episode URL: ${JSON.stringify(url)}
Optional clip context (transcript snippet or topic): ${JSON.stringify(hint)}`);

  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: true,
      caption: safeText(fallbackCaption, 280),
      hashtags: ['#leadership', '#podcast'].slice(0, 4),
      cta: url || null,
    };
  }

  const hashtags = (Array.isArray(parsed.hashtags) ? parsed.hashtags : [])
    .map((h) => {
      const tag = safeText(h, 40);
      if (!tag) return '';
      return tag.startsWith('#') ? tag : `#${tag.replace(/^#+/, '')}`;
    })
    .filter(Boolean)
    .slice(0, 4);

  return {
    ok: true,
    caption: safeText(parsed.caption, 280) || safeText(fallbackCaption, 280),
    hashtags,
    cta: safeText(parsed.cta, 200) || url || null,
  };
}
