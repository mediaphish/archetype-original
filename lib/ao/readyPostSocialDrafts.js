import { AO_VOICE_MANIFESTO } from './voiceManifesto.js';
import { getOpenAiKey } from '../openaiKey.js';

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function cleanChannels(arr) {
  const allowed = new Set(['linkedin', 'facebook', 'instagram', 'x']);
  const out = [];
  for (const x of Array.isArray(arr) ? arr : []) {
    const s = String(x || '').trim().toLowerCase();
    if (!allowed.has(s)) continue;
    if (!out.includes(s)) out.push(s);
  }
  return out.length ? out : ['linkedin', 'facebook', 'instagram', 'x'];
}

async function openAiJson(prompt) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;
  const model = process.env.AO_IDEAS_MODEL || 'gpt-4o-mini';
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
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(content.slice(start, end + 1));
    return null;
  }
}

export async function generateReadyPostDrafts({ markdown, title, channels } = {}) {
  const text = safeText(markdown, 9000);
  if (!text) return { ok: false, error: 'markdown_required' };
  const chan = cleanChannels(channels);
  const voice = (AO_VOICE_MANIFESTO || []).map((x) => `- ${x}`).join('\n');

  if (!getOpenAiKey()) {
    // Fallback: simple, not-smart. Better than blocking.
    const base = safeText(title, 120) ? `${safeText(title, 120)}\n\n${text}` : text;
    const drafts = {};
    for (const c of chan) drafts[c] = safeText(base, c === 'x' ? 240 : 1800);
    return {
      ok: true,
      drafts_by_channel: drafts,
      hashtags_by_channel: {},
      first_comment_suggestions: {},
    };
  }

  const prompt = `You are AO Ready Posts — a senior editor adapting a finished post for each social channel.\n\nVoice manifesto:\n${voice}\n\nHard rules:\n- Each channel draft must be meaningfully different (not just minor rewrites).\n- No politics. No rage bait. No dunking. No fake claims.\n- Keep it grounded, practical, and written like Bart.\n\nInputs:\n- title: ${JSON.stringify(safeText(title, 160))}\n- finished_markdown: ${JSON.stringify(text)}\n- channels: ${JSON.stringify(chan)}\n\nReturn ONLY JSON with exactly these keys:\n- drafts_by_channel: { linkedin, facebook, instagram, x } (only include requested channels)\n- hashtags_by_channel: { linkedin, facebook, instagram, x } (0-6 each)\n- first_comment_suggestions: { linkedin, facebook, instagram, x } (string|null each)\n\nChannel guidance:\n- linkedin: authority + insight, often ends with a question.\n- facebook: conversational, invites discussion.\n- instagram: reach; punchy caption; fewer words.\n- x: engagement; point + question; very concise.\n`;

  const parsed = await openAiJson(prompt);
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'draft_generation_failed' };

  const drafts = parsed.drafts_by_channel && typeof parsed.drafts_by_channel === 'object' ? parsed.drafts_by_channel : {};
  const hashtags = parsed.hashtags_by_channel && typeof parsed.hashtags_by_channel === 'object' ? parsed.hashtags_by_channel : {};
  const first = parsed.first_comment_suggestions && typeof parsed.first_comment_suggestions === 'object' ? parsed.first_comment_suggestions : {};

  const outDrafts = {};
  for (const c of chan) {
    if (!drafts[c]) continue;
    outDrafts[c] = safeText(drafts[c], c === 'x' ? 320 : 2200);
  }

  return {
    ok: true,
    drafts_by_channel: outDrafts,
    hashtags_by_channel: hashtags,
    first_comment_suggestions: first,
  };
}

