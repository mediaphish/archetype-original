import { getOpenAiKey } from '../openaiKey.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

/**
 * Instagram-style captions for pull-quote cards (image already shows the quote).
 * Length follows what the line needs—short, a few lines, or up to ~2 short paragraphs—capped for practical posting.
 */
export async function generatePullQuoteCaptionsForQuotes(selectedQuotes, { maxChars = 2000 } = {}) {
  const apiKey = getOpenAiKey();
  if (!apiKey || !selectedQuotes.length) {
    return selectedQuotes.map((q) => `From “${safeText(q.source_title, 80)}”.`);
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
            content: `For each item, write ONE Instagram caption to go under the quote image (the image already shows the quote—do not repeat the quote text).

Length is not fixed: use only what the line needs. A sharp two-line caption is fine; if the idea needs more room—tension, stakes, recognition, naming what the reader might feel, answering a silent “so what?”, or a closing question—use a couple of short paragraphs. Do not pad. Do not use empty praise.

Each caption should help the reader react: “this is good stuff,” “I’ve seen that,” or “this is me—what do I do?” Tone: grounded, leader-to-leader, no hype.

Hard cap ${maxChars} characters per caption (Instagram allows more; stay within this for discipline).

Return JSON only: {"captions":["...","..."]}

Items:
${JSON.stringify(payload)}`,
          },
        ],
        max_tokens: 2200,
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
    return selectedQuotes.map((q, i) => {
      const c = String(caps[i] || '').trim();
      return safeText(c, maxChars) || `Reflection — “${safeText(q.source_title, 100)}”.`;
    });
  } catch {
    return selectedQuotes.map((q) => `From the writing: ${safeText(q.source_title, 100)}.`);
  }
}
