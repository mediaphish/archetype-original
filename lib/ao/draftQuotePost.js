/**
 * AO — Generate per-channel draft posts for a quote candidate.
 * Uses OpenAI if configured; otherwise returns simple fallbacks.
 */

function clampHashtags(arr, max = 6) {
  const out = Array.isArray(arr) ? arr.map((x) => String(x || '').trim()).filter(Boolean) : [];
  return out.slice(0, max);
}

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function defaultDrafts(quoteText) {
  const q = safeText(quoteText, 500);
  return {
    ok: true,
    drafts_by_channel: {
      linkedin: q,
      facebook: q,
      instagram: q,
      x: safeText(q, 260),
    },
    hashtags_by_channel: {
      linkedin: [],
      facebook: [],
      instagram: [],
      x: [],
    },
    first_comment_suggestions: {
      linkedin: null,
      facebook: null,
      instagram: null,
      x: null,
    },
  };
}

/**
 * @param {{ quote_text: string, source_slug_or_url?: string, source_type?: string }} quoteRow
 * @returns {Promise<{ ok: boolean, drafts_by_channel?: any, hashtags_by_channel?: any, first_comment_suggestions?: any, error?: string }>}
 */
export async function draftQuotePost(quoteRow) {
  const apiKey = process.env.OPENAI_API_KEY;
  const quote = safeText(quoteRow?.quote_text, 600);
  if (!quote) return { ok: false, error: 'Missing quote_text' };
  if (!apiKey) return defaultDrafts(quote);

  const source = safeText(quoteRow?.source_slug_or_url, 200) || 'External';
  const prompt = `You write social posts in Bart's voice: clear, grounded, leadership-forward, not hypey, not salesy.\n\nCreate drafts for the SAME underlying idea using this quote:\n\"${quote}\"\nSource: ${source}\n\nReturn ONLY one JSON object (no markdown). Keys:\n- drafts_by_channel: { linkedin: string, facebook: string, instagram: string, x: string }\n- hashtags_by_channel: { linkedin: string[], facebook: string[], instagram: string[], x: string[] }\n- first_comment_suggestions: { linkedin: string|null, facebook: string|null, instagram: string|null, x: string|null }\n\nRules:\n- LinkedIn: 600 chars max, 1-2 short paragraphs.\n- Facebook: 500 chars max, conversational.\n- Instagram: 400 chars max, punchy.\n- X: 260 chars max.\n- Hashtags: 0-6 per channel, no duplicates across that channel.\n- First comment: optional; if used, it should add one extra insight or question.\n- Do NOT include links unless you truly need one (assume no link).\n- Avoid emojis.\n`;

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
        max_tokens: 800,
      }),
    });
    if (!res.ok) return defaultDrafts(quote);
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    const parsed = JSON.parse(content);

    const drafts = parsed?.drafts_by_channel || {};
    const hashtags = parsed?.hashtags_by_channel || {};
    const firstComments = parsed?.first_comment_suggestions || {};

    return {
      ok: true,
      drafts_by_channel: {
        linkedin: safeText(drafts.linkedin, 600) || safeText(quote, 600),
        facebook: safeText(drafts.facebook, 500) || safeText(quote, 500),
        instagram: safeText(drafts.instagram, 400) || safeText(quote, 400),
        x: safeText(drafts.x, 260) || safeText(quote, 260),
      },
      hashtags_by_channel: {
        linkedin: clampHashtags(hashtags.linkedin),
        facebook: clampHashtags(hashtags.facebook),
        instagram: clampHashtags(hashtags.instagram),
        x: clampHashtags(hashtags.x),
      },
      first_comment_suggestions: {
        linkedin: firstComments.linkedin ? safeText(firstComments.linkedin, 400) : null,
        facebook: firstComments.facebook ? safeText(firstComments.facebook, 400) : null,
        instagram: firstComments.instagram ? safeText(firstComments.instagram, 400) : null,
        x: firstComments.x ? safeText(firstComments.x, 240) : null,
      },
    };
  } catch {
    return defaultDrafts(quote);
  }
}

