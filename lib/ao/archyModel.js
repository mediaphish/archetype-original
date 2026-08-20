/**
 * Archy's model calls.
 *
 * Archy ran on OpenAI `gpt-4`, which the API resolves to `gpt-4-0613` — a model
 * from June 2023, confirmed in production runtime logs on 2026-08-20. It now
 * runs on Claude Sonnet 5, matching the rest of the platform's Anthropic usage
 * and the ANTHROPIC_API_KEY already configured for Auto.
 *
 * Two things to know if you are porting more calls here:
 *
 *   - Sonnet 5 rejects `temperature` / `top_p` / `top_k` with a 400. The OpenAI
 *     calls this replaced passed temperature 0.7 / 0.3 / 0; those are dropped,
 *     and determinism for the classifiers comes from `effort: 'low'` plus a
 *     prompt that asks for JSON only.
 *   - Anthropic takes the system prompt as a top-level `system` field, not as a
 *     message with role 'system'. Any stray system-role entries in a client-
 *     supplied history are dropped rather than passed through.
 */

import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = () => process.env.ARCHY_ANTHROPIC_MODEL || 'claude-sonnet-5';

let cachedClient = null;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cachedClient;
}

export function archyModelConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Normalize a client-supplied history into Anthropic message shape.
 * Drops system-role entries, empty content, and any leading assistant turns
 * (the API requires the first message to be from the user).
 */
function normalizeHistory(history) {
  const cleaned = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({ role: m.role, content: String(m.content || '').trim() }))
    .filter((m) => m.content);

  while (cleaned.length > 0 && cleaned[0].role === 'assistant') cleaned.shift();
  return cleaned;
}

function textOf(response) {
  return (response?.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

/**
 * Conversational completion — Archy's main answer path.
 *
 * @returns {Promise<{ ok: boolean, text: string, usage: object|null, error: string|null }>}
 *          Never throws; callers fall back to their existing canned responses.
 */
export async function archyComplete({ system, history, message, maxTokens = 1024, effort = 'medium' }) {
  const client = getClient();
  if (!client) return { ok: false, text: '', usage: null, error: 'ANTHROPIC_API_KEY is not configured' };

  const messages = [...normalizeHistory(history), { role: 'user', content: String(message || '').trim() }];
  if (!messages[messages.length - 1].content) {
    return { ok: false, text: '', usage: null, error: 'empty message' };
  }

  try {
    const response = await client.messages.create({
      model: DEFAULT_MODEL(),
      max_tokens: maxTokens,
      system,
      messages,
      output_config: { effort },
    });

    if (response.stop_reason === 'refusal') {
      return { ok: false, text: '', usage: response.usage || null, error: 'refusal' };
    }
    return { ok: true, text: textOf(response), usage: response.usage || null, error: null };
  } catch (err) {
    console.error('[archyModel] completion failed:', err?.message || err);
    return { ok: false, text: '', usage: null, error: err?.message || String(err) };
  }
}

/** Pull the first JSON object out of a reply, tolerating prose or code fences around it. */
export function extractJson(raw) {
  const text = String(raw || '');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Single-shot classifier returning parsed JSON, for the yes/no and
 * categorization checks around the main answer.
 *
 * @returns {Promise<object|null>} null on any failure — callers already fall
 *          back to keyword heuristics when this returns nothing.
 */
export async function archyClassify({ prompt, maxTokens = 200 }) {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: DEFAULT_MODEL(),
      max_tokens: maxTokens,
      system: 'You are a classifier. Reply with only the JSON object requested — no prose, no code fences.',
      messages: [{ role: 'user', content: String(prompt || '') }],
      output_config: { effort: 'low' },
    });
    if (response.stop_reason === 'refusal') return null;
    return extractJson(textOf(response));
  } catch (err) {
    console.error('[archyModel] classify failed:', err?.message || err);
    return null;
  }
}

/**
 * Yes/no gate. Returns a boolean, or null when the call could not be made —
 * callers must distinguish "no" from "could not tell".
 */
export async function archyYesNo({ prompt, maxTokens = 8 }) {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: DEFAULT_MODEL(),
      max_tokens: maxTokens,
      system: 'Answer with exactly one word: yes or no.',
      messages: [{ role: 'user', content: String(prompt || '') }],
      output_config: { effort: 'low' },
    });
    if (response.stop_reason === 'refusal') return null;
    return textOf(response).toLowerCase().includes('yes');
  } catch (err) {
    console.error('[archyModel] yes/no failed:', err?.message || err);
    return null;
  }
}
