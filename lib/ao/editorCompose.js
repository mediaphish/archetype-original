import { AO_VOICE_MANIFESTO } from './voiceManifesto.js';
import { getVoiceAnchors } from './voiceAnchors.js';
import { getOpenAiKey } from '../openaiKey.js';
import { parseLooseJson } from './parseLooseJson.js';

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function clampTags(arr, max = 6) {
  const raw = Array.isArray(arr) ? arr : [];
  const out = [];
  const seen = new Set();
  for (const x of raw) {
    const t = String(x || '').trim();
    if (!t) continue;
    const tag = t.startsWith('#') ? t : `#${t.replace(/^#+/, '')}`;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag.slice(0, 40));
  }
  return out.slice(0, max);
}

async function openAiJson(prompt) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;
  const model = process.env.AO_EDITOR_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1400,
    }),
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const content = json.choices?.[0]?.message?.content?.trim() || '';
  if (!content) return null;
  return parseLooseJson(content);
}

function defaultDrafts({ pullQuote, url, sourceName }) {
  const q = safeText(pullQuote, 220);
  const src = [sourceName, url].filter(Boolean).join(' — ');
  return {
    ok: true,
    drafts_by_channel: {
      linkedin: `${q}\n\nHere’s the leadership question: what are you rewarding—results, or stability?\n\nSource: ${src}`.slice(0, 600),
      facebook: `${q}\n\nWhat have you seen work when teams start drifting like this?\n\nSource: ${src}`.slice(0, 500),
      instagram: `${q}\n\nSource: ${src}`.slice(0, 400),
      x: `${q}\n\nWhat would you change first?\n\nSource: ${src}`.slice(0, 260),
    },
    hashtags_by_channel: {
      linkedin: [],
      facebook: [],
      instagram: ['#leadership', '#culture'],
      x: [],
    },
    first_comment_suggestions: { linkedin: null, facebook: null, instagram: null, x: null },
  };
}

/**
 * Editor: generate channel-unique drafts, hashtags, optional first comment.
 *
 * @param {any} candidateRow
 * @param {any} decision Output of analystDecision
 */
export async function editorCompose(candidateRow, decision) {
  const url = safeText(candidateRow?.source_url || candidateRow?.source_slug_or_url, 800);
  const sourceName = safeText(candidateRow?.source_name, 120);
  const title = safeText(candidateRow?.source_title, 300);
  const author = safeText(candidateRow?.source_author, 140);
  const pullQuote = safeText(decision?.pull_quote || candidateRow?.pull_quote || candidateRow?.quote_text, 260);
  const why = safeText(decision?.why_it_matters || candidateRow?.why_it_matters, 900);
  const summary = safeText(decision?.summary_interpretation || candidateRow?.summary_interpretation, 2600);
  const bestMove = safeText(decision?.best_move || candidateRow?.best_move, 40);
  const objectives = decision?.objectives_by_channel || candidateRow?.objectives_by_channel || {};

  const anchorQuery = [pullQuote, why, title].filter(Boolean).join(' ');
  const anchors = await getVoiceAnchors({ queryText: anchorQuery, limit: 3 });

  if (!getOpenAiKey()) {
    return defaultDrafts({ pullQuote, url, sourceName });
  }

  const manifesto = AO_VOICE_MANIFESTO.map((x) => `- ${x}`).join('\n');
  const anchorBlock = anchors.length
    ? anchors.map((a) => `- ${a.title}${a.url ? ` (${a.url})` : ''}: "${a.excerpt}"`).join('\n')
    : '- (no anchors found)';

  const prompt = `You are the AO Editor bot.

Write in Bart/AO voice (use this manifesto):
${manifesto}

Voice anchors from AO corpus (match tone, not content):
${anchorBlock}

Hard rules:
- No rage bait. No dunking. No politics.
- Do not overclaim. If unsure, say so.
- Strict citation: include link + attribution; keep quoting minimal (pull quote is provided).
- Drafts must be meaningfully different per channel (structure, emphasis, cadence).
- Avoid generic inspiration.

Input:
- best_move: ${JSON.stringify(bestMove)}
- title: ${JSON.stringify(title)}
- author: ${JSON.stringify(author)}
- source_name: ${JSON.stringify(sourceName)}
- url: ${JSON.stringify(url)}
- pull_quote (already selected): ${JSON.stringify(pullQuote)}
- why_it_matters: ${JSON.stringify(why)}
- summary_interpretation: ${JSON.stringify(summary)}
- objectives_by_channel: ${JSON.stringify(objectives)}

Output requirements:
Return ONLY JSON with keys:
- drafts_by_channel: { linkedin, facebook, instagram, x }
- hashtags_by_channel: { linkedin, facebook, instagram, x } (0-6 each)
- first_comment_suggestions: { linkedin, facebook, instagram, x } (string|null)

Channel constraints:
- LinkedIn: <=600 chars, structured, executive.
- Facebook: <=500 chars, conversational, invites comments.
- Instagram: <=400 chars, optimized for reach; tight and shareable.
- X: <=260 chars, one strong point + one question.

Citations:
- End each draft with: "Source: <publication/author> — <url>" OR "Source: <url>"
- Do not quote more than the provided pull quote.
`;

  try {
    const parsed = await openAiJson(prompt);
    if (!parsed || typeof parsed !== 'object') return defaultDrafts({ pullQuote, url, sourceName });

    const drafts = parsed.drafts_by_channel || {};
    const tags = parsed.hashtags_by_channel || {};
    const fc = parsed.first_comment_suggestions || {};

    return {
      ok: true,
      drafts_by_channel: {
        linkedin: safeText(drafts.linkedin, 600),
        facebook: safeText(drafts.facebook, 500),
        instagram: safeText(drafts.instagram, 400),
        x: safeText(drafts.x, 260),
      },
      hashtags_by_channel: {
        linkedin: clampTags(tags.linkedin),
        facebook: clampTags(tags.facebook),
        instagram: clampTags(tags.instagram),
        x: clampTags(tags.x),
      },
      first_comment_suggestions: {
        linkedin: fc.linkedin ? safeText(fc.linkedin, 400) : null,
        facebook: fc.facebook ? safeText(fc.facebook, 400) : null,
        instagram: fc.instagram ? safeText(fc.instagram, 400) : null,
        x: fc.x ? safeText(fc.x, 240) : null,
      },
    };
  } catch {
    return defaultDrafts({ pullQuote, url, sourceName });
  }
}

