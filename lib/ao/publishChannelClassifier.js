/**
 * Content-type registry + channel fit for intelligent publish (rules + optional model).
 */

import { getOpenAiKey } from '../openaiKey.js';

export const CONTENT_TYPES = {
  quote_card: {
    id: 'quote_card',
    label: 'Quote card',
    imageRequired: true,
    defaultPlatforms: ['instagram', 'facebook', 'linkedin', 'twitter'],
  },
  journal_post: {
    id: 'journal_post',
    label: 'Journal post',
    imageRequired: false,
    defaultPlatforms: ['linkedin', 'facebook', 'instagram', 'x'],
  },
  journal_series: {
    id: 'journal_series',
    label: 'Journal series',
    imageRequired: false,
    defaultPlatforms: ['linkedin', 'facebook', 'instagram', 'x'],
  },
  devotional: {
    id: 'devotional',
    label: 'Devotional',
    imageRequired: false,
    defaultPlatforms: ['linkedin', 'facebook', 'instagram'],
  },
  devotional_series: {
    id: 'devotional_series',
    label: 'Devotional series',
    imageRequired: false,
    defaultPlatforms: ['linkedin', 'facebook'],
  },
};

function safeText(v, max = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return max ? s.slice(0, max) : s;
}

/**
 * Rules-first classifier for corpus quote cards; optional LLM refinement.
 * @param {Array<{ caption?: string, quote?: string, source_title?: string }>} items
 * @param {{ coverageHints?: { coolingOff?: Array<{ note?: string }> } }} [ctx]
 */
export async function classifyQuoteCardsForPublish(items, ctx = {}) {
  const recommended = ['linkedin', 'instagram', 'facebook', 'twitter'];
  const discouraged = [];
  const reasons = [];
  const risk_flags = [];

  for (const it of items || []) {
    const cap = safeText(it.caption, 5000);
    const q = safeText(it.quote, 2000);
    if (cap.length + q.length > 3500) {
      risk_flags.push('very_long');
      reasons.push('Some lines are long — Instagram captions may need trimming in Publisher.');
    }
    const combined = `${cap} ${q}`.toLowerCase();
    if (/\b(dopamine|norepinephrine|cortisol|neuroscience|study shows|research finds)\b/.test(combined)) {
      risk_flags.push('technical_or_science');
      discouraged.push('twitter');
      reasons.push('Science-heavy phrasing may read better on LinkedIn than on X; you can still post everywhere and adjust.');
      break;
    }
  }

  const cooling = ctx.coverageHints?.coolingOff;
  if (Array.isArray(cooling) && cooling.length) {
    cooling.slice(0, 2).forEach((c) => {
      if (c?.note) reasons.push(`Memory: ${c.note}`);
    });
  }

  let summaryLines = [
    'Channel fit (suggested): quote cards work as image posts on Instagram and Facebook; LinkedIn and X carry the same asset where supported.',
  ];
  if (reasons.length) {
    summaryLines = summaryLines.concat(reasons.map((r) => `— ${r}`));
  }

  const modelRefine = await maybeRefineChannelsWithModel(items, { recommended, discouraged });
  if (modelRefine) {
    summaryLines.push(`Model note: ${modelRefine.note}`);
  }

  const usePlatforms = recommended.filter((p) => !discouraged.includes(p));

  return {
    content_type: CONTENT_TYPES.quote_card.id,
    recommended,
    discouraged: [...new Set(discouraged)],
    use_platforms: usePlatforms.length ? usePlatforms : recommended,
    reasons,
    risk_flags,
    summaryLines,
  };
}

async function maybeRefineChannelsWithModel(items, baseline) {
  const apiKey = getOpenAiKey();
  if (!apiKey || !items?.length) return null;
  try {
    const snippet = items
      .map((it) => safeText(it.caption, 400))
      .join(' | ')
      .slice(0, 1200);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AO_AUTO_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Given these interpretive captions for leadership quote cards, reply JSON ONLY: {"note":"one short sentence audience/channel tip","discourage_x":boolean}
Captions: ${JSON.stringify(snippet)}`,
          },
        ],
        max_tokens: 120,
        temperature: 0.2,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    let parsed = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start >= 0 && end > start) parsed = JSON.parse(content.slice(start, end + 1));
    }
    if (!parsed?.note) return null;
    if (parsed.discourage_x && !baseline.discouraged.includes('twitter')) {
      baseline.discouraged.push('twitter');
    }
    return { note: safeText(parsed.note, 240) };
  } catch {
    return null;
  }
}

/**
 * Long-form packaged post — lighter rules (schedule heuristic handles timing).
 * @param {string} text
 */
export async function classifyJournalPostForPublish(text) {
  const body = safeText(text, 8000);
  const recommended = ['linkedin', 'facebook', 'instagram', 'x'];
  const reasons = [];
  if (body.length < 400) {
    reasons.push('Short post — all channels ok; X may be the lightest lift.');
  } else if (body.length > 3500) {
    reasons.push('Longer piece — LinkedIn and Facebook are natural; trim for X in Publisher if needed.');
  }
  return {
    content_type: CONTENT_TYPES.journal_post.id,
    recommended,
    discouraged: [],
    use_platforms: recommended,
    reasons,
    summaryLines: reasons,
  };
}
