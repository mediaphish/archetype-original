import { getOpenAiKey } from '../openaiKey.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

/**
 * Interpretive captions for pull-quote cards (the image carries the quote text).
 * Returns a main caption (Instagram-length room) and a separate X-sized line—both must explain / enhance / interpret, not compress the quote into a fragment.
 *
 * @returns {Promise<{ captions: string[], captions_x: string[] }>}
 */
export async function generatePullQuoteCaptionsForQuotes(selectedQuotes, { maxChars = 2000, maxCharsX = 200 } = {}) {
  const empty = () => ({
    captions: selectedQuotes.map((q) => `A line worth sitting with—from ${safeText(q.source_title, 100)}. The image shows the quote; this note is context only.`),
    captions_x: selectedQuotes.map(
      () => 'Context for the line on the image—interpretation, not a shortened quote.'
    ).map((s) => safeText(s, maxCharsX)),
  });

  const apiKey = getOpenAiKey();
  if (!apiKey || !selectedQuotes.length) {
    return empty();
  }
  const payload = selectedQuotes.map((q, i) => ({
    n: i + 1,
    quote: safeText(q.quote, 480),
    source: safeText(q.source_title, 200),
  }));
  try {
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
            content: `You write captions for quote-card images. The IMAGE already contains the full pull quote. Your job is commentary: explain, interpret, deepen, or help the reader feel why the line matters.

CRITICAL — what NOT to do:
- Do NOT repeat the quote (or most of it) in the caption.
- Do NOT treat "do not repeat the quote" as permission to paste a FRAGMENT of the quote and call it done. A partial quote used as the caption is still wrong. The caption is not a shorter version of the quote.
- Do NOT optimize for brevity or "compression." Clarity and substance matter more than length.

What TO do:
- Help the reader react: recognition, tension, stakes, "so what?", or a honest question. Grounded, leader-to-leader, no hype, no empty praise, no padding.

LENGTH (targets, not minimums):
- "captions": For Instagram and for the main text used on Facebook and LinkedIn when paired with the card—often up to about seven sentences when the idea needs room, or up to about two short paragraphs when that serves clarity. Hard cap ${maxChars} characters per entry.
- "captions_x": A SEPARATE line for X (Twitter)—aim for about ${maxCharsX} characters, same interpretive standard: full sentences that interpret or contextualize, NOT a fragment of the quote and NOT a blunt truncation of the long caption unless you rewrite for clarity within the limit.

Return JSON ONLY with two parallel arrays of the same length:
{"captions":["...","..."],"captions_x":["...","..."]}

Items:
${JSON.stringify(payload)}`,
          },
        ],
        max_tokens: 3600,
        temperature: 0.38,
      }),
    });
    if (!res.ok) throw new Error('caption api');
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
    const caps = Array.isArray(parsed?.captions) ? parsed.captions : [];
    const capsX = Array.isArray(parsed?.captions_x) ? parsed.captions_x : [];
    return {
      captions: selectedQuotes.map((q, i) => {
        const c = String(caps[i] || '').trim();
        return safeText(c, maxChars) || `Reflection — from “${safeText(q.source_title, 100)}”.`;
      }),
      captions_x: selectedQuotes.map((q, i) => {
        const cx = String(capsX[i] != null ? capsX[i] : '').trim();
        const fallback = safeText(String(caps[i] || '').trim(), maxCharsX);
        return safeText(cx || fallback, maxCharsX) || safeText(`Context for the line on the image — ${safeText(q.source_title, 80)}`, maxCharsX);
      }),
    };
  } catch {
    return empty();
  }
}
