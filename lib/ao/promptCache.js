/**
 * Prompt caching for the team's model calls, and a record of what each call used.
 *
 * Bart, 2026-10-28: API spend was running about $100 a day. Anthropic had
 * flagged a low cache hit rate. Nothing in the platform asked for caching, and
 * the team's instructions opened with the clock to the second, so every call
 * (and every step of every tool loop) paid full price for the same 30,000-plus
 * tokens of instructions and tool definitions.
 *
 * Two cache points per call:
 *   1. The end of the instructions that do not change: everything before
 *      SYSTEM_CACHE_SPLIT (the persona and the rules), plus the tools ahead of it.
 *   2. The end of the conversation so far, so each step of a tool loop rereads
 *      the earlier steps at the cached price.
 */

/** buildSystemPrompt puts this between the fixed rules and the per-turn context. */
export const SYSTEM_CACHE_SPLIT = '\n<!-- cache: fixed rules above, this turn below -->\n';

const EPHEMERAL = Object.freeze({ type: 'ephemeral' });

/** The system prompt as blocks, with a cache point at the end of the fixed part. */
export function cachedSystem(system) {
  if (Array.isArray(system) || !system) return system;
  const text = String(system);
  const at = text.indexOf(SYSTEM_CACHE_SPLIT);
  if (at === -1) return [{ type: 'text', text, cache_control: EPHEMERAL }];
  const fixed = text.slice(0, at).trimEnd();
  const rest = text.slice(at + SYSTEM_CACHE_SPLIT.length).trim();
  const blocks = [{ type: 'text', text: fixed, cache_control: EPHEMERAL }];
  if (rest) blocks.push({ type: 'text', text: rest });
  return blocks;
}

/** A copy of the messages with a cache point on the last block of the last one. */
export function withCachedTail(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return messages;
  const out = messages.map((m) => ({ ...m }));
  const last = out[out.length - 1];
  const blocks = typeof last.content === 'string'
    ? [{ type: 'text', text: last.content }]
    : Array.isArray(last.content) ? last.content.map((b) => ({ ...b })) : null;
  if (!blocks || blocks.length === 0) return out;
  const i = blocks.length - 1;
  const b = blocks[i];
  if (b.type === 'text' && !String(b.text || '').trim()) return out;
  // A cache point is only allowed on content blocks the API accepts it on.
  if (!['text', 'image', 'document', 'tool_result', 'tool_use'].includes(b.type)) return out;
  blocks[i] = { ...b, cache_control: EPHEMERAL };
  last.content = blocks;
  return out;
}

/** Request params with both cache points added. */
export function withPromptCache(params = {}) {
  return {
    ...params,
    ...(params.system ? { system: cachedSystem(params.system) } : {}),
    messages: withCachedTail(params.messages),
  };
}

/** The token counts a reply reports, flattened for the usage log. */
export function usageRow({ source, model, usage, threadId = null }) {
  const u = usage || {};
  return {
    source: String(source || 'unknown').slice(0, 80),
    model: String(model || '').slice(0, 80),
    input_tokens: u.input_tokens || 0,
    output_tokens: u.output_tokens || 0,
    cache_read_tokens: u.cache_read_input_tokens || 0,
    cache_write_tokens: u.cache_creation_input_tokens || 0,
    thread_id: threadId || null,
  };
}

/**
 * Save what one call used (table ao_ai_usage), so spend can be read by
 * teammate and by kind of work. Never waits and never throws: a log must not
 * slow or break a reply.
 */
export function recordUsage(args) {
  if (process.env.JEST_WORKER_ID || !args?.usage) return;
  const row = usageRow(args);
  import('../supabase-admin.js')
    .then(({ supabaseAdmin }) => supabaseAdmin.from('ao_ai_usage').insert(row))
    .then((r) => {
      if (r?.error) console.error('[aiUsage] save failed:', r.error.message);
    })
    .catch((err) => console.error('[aiUsage] save failed:', err?.message || err));
}
