/**
 * AO — Evaluate a quote candidate via OpenAI (scores, classification, caption suggestions).
 */

/**
 * @param {{ text: string, source_doc_slug?: string, source_type?: string, source_title?: string }} candidate
 * @returns {Promise<{ alignment_score: number, clarity_score: number, shareability_score: number, brand_fit_score: number, depth_score: number, composite_score: number, classification: string, caption_suggestions: string[], leadership_relevance_score: number, is_leadership_related: boolean }>}
 */
export async function evaluateCandidate(candidate) {
  const apiKey = process.env.OPENAI_API_KEY;
  const text = candidate.text || '';
  const source = [candidate.source_title, candidate.source_doc_slug].filter(Boolean).join(' — ') || 'Internal';

  const defaults = {
    alignment_score: 70,
    clarity_score: 70,
    shareability_score: 70,
    brand_fit_score: 70,
    depth_score: 70,
    composite_score: 70,
    classification: 'quote',
    caption_suggestions: [text.slice(0, 200)],
    leadership_relevance_score: 70,
    is_leadership_related: true,
  };

  if (!apiKey) {
    return defaults;
  }

  const prompt = `You are evaluating a short excerpt for leadership relevance and editorial fit.

Quote: "${text.slice(0, 500)}"
Source: ${source}

Hard rule:
- If this is not meaningfully about leadership, teams, culture, accountability, trust, execution, or decision-making, mark it as not leadership-related.

Respond with ONLY a single JSON object (no markdown, no code block) with these exact keys:
- alignment_score (0-100)
- clarity_score (0-100)
- shareability_score (0-100)
- brand_fit_score (0-100)
- depth_score (0-100)
- composite_score (0-100)
- leadership_relevance_score (0-100)
- is_leadership_related (boolean)
- classification (string, e.g. "quote", "insight", "story")
- caption_suggestions (array of 1-3 short caption ideas for social posts).`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
      }),
    });
    if (!res.ok) {
      return defaults;
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    const parsed = JSON.parse(content);
    return {
      alignment_score: Math.min(100, Math.max(0, Number(parsed.alignment_score) || 70)),
      clarity_score: Math.min(100, Math.max(0, Number(parsed.clarity_score) || 70)),
      shareability_score: Math.min(100, Math.max(0, Number(parsed.shareability_score) || 70)),
      brand_fit_score: Math.min(100, Math.max(0, Number(parsed.brand_fit_score) || 70)),
      depth_score: Math.min(100, Math.max(0, Number(parsed.depth_score) || 70)),
      composite_score: Math.min(100, Math.max(0, Number(parsed.composite_score) || 70)),
      leadership_relevance_score: Math.min(100, Math.max(0, Number(parsed.leadership_relevance_score) || 70)),
      is_leadership_related: !!parsed.is_leadership_related,
      classification: typeof parsed.classification === 'string' ? parsed.classification : 'quote',
      caption_suggestions: Array.isArray(parsed.caption_suggestions) ? parsed.caption_suggestions : defaults.caption_suggestions,
    };
  } catch {
    return defaults;
  }
}
