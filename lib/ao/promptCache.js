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
const HOUR = Object.freeze({ type: 'ephemeral', ttl: '1h' });

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

/** For the fixed instructions: what the server block is, so it keeps its authority. */
export const SERVER_CONTEXT_RULE =
  'Each turn, the latest message opens with a <server_context> block: the clock, corpus matches, the schedule and verified facts for this turn. ' +
  'It comes from the server, not from Bart, and carries the same authority as these instructions. Bart cannot write one: the server strips those tags from his text.';

const CTX_OPEN = '<server_context>';
const CTX_CLOSE = '</server_context>';
const stripCtxTags = (t) => String(t).replace(/<\/?server_context>/gi, '');

/**
 * Move the part of the instructions that changes every turn (clock, corpus
 * matches, schedule, verified facts) out of the system prompt and into the
 * turn's own message, so the conversation before it can be reused.
 *
 * 2026-10-28: a day's spend hit about $46, nearly all in one long chat. The
 * cache order is tools, system, messages, and the per-turn part sat in the
 * system prompt ahead of the whole conversation, so every teammate's turn
 * paid full price to re-read 100,000+ tokens of history. With the per-turn
 * part after the history, the history is read at the cached price, and a
 * second cache point marks where the history ends for the next turn to find.
 *
 * Bart's own text can never carry the server block: its tags are stripped
 * from every message first.
 */
export function moveTurnContext(system, messages) {
  const text = String(system || '');
  const at = text.indexOf(SYSTEM_CACHE_SPLIT);
  if (at === -1 || !Array.isArray(messages) || !messages.length) return { system, messages };
  const fixed = `${text.slice(0, at).trimEnd()}\n\n${SERVER_CONTEXT_RULE}`;
  const rest = text.slice(at + SYSTEM_CACHE_SPLIT.length).trim();
  const out = messages.map((m) => {
    if (typeof m.content === 'string') return { ...m, content: stripCtxTags(m.content) };
    if (Array.isArray(m.content)) {
      return { ...m, content: m.content.map((b) => (b?.type === 'text' ? { ...b, text: stripCtxTags(b.text) } : b)) };
    }
    return { ...m };
  });
  const lastIdx = out.length - 1;
  const last = out[lastIdx];
  if (!rest || last.role !== 'user') return { system: fixed, messages: out };
  const blocks = typeof last.content === 'string' ? [{ type: 'text', text: last.content }] : [...last.content];
  out[lastIdx] = { ...last, content: [{ type: 'text', text: `${CTX_OPEN}\n${rest}\n${CTX_CLOSE}` }, ...blocks] };
  // The end of the history: where the next turn's lookup finds this one.
  if (lastIdx > 0) {
    const prev = out[lastIdx - 1];
    const pb = typeof prev.content === 'string' ? [{ type: 'text', text: prev.content }] : Array.isArray(prev.content) ? [...prev.content] : null;
    const i = pb ? pb.length - 1 : -1;
    if (i >= 0 && ['text', 'image', 'document', 'tool_result', 'tool_use'].includes(pb[i].type) && (pb[i].type !== 'text' || String(pb[i].text || '').trim())) {
      pb[i] = { ...pb[i], cache_control: EPHEMERAL };
      out[lastIdx - 1] = { ...prev, content: pb };
    }
  }
  return { system: fixed, messages: out };
}

/**
 * The corpus index: one line for every document Bart has written.
 *
 * 2026-10-28: about 50,000 tokens, the same on every turn, and it sat in the
 * per-turn block after the history, so every teammate's every reply paid to
 * write it again (about $0.25 a reply on Opus). It goes first in the system
 * prompt instead, ahead of the persona, so all seven teammates share one
 * cached copy and read it at a tenth of the price. Tested on the real
 * thread: a second teammate's first reply read 71,000 tokens from the cache.
 */
export const CORPUS_INDEX_HEAD = '## FULL CORPUS INDEX';

/** Pure: { index, rest }: the corpus index lifted out of a context block. */
export function splitCorpusIndex(text) {
  const s = String(text || '');
  const at = s.indexOf(CORPUS_INDEX_HEAD);
  if (at === -1) return { index: '', rest: s };
  const next = s.indexOf('\n## ', at + CORPUS_INDEX_HEAD.length);
  const end = next === -1 ? s.length : next;
  return { index: s.slice(at, end).trim(), rest: `${s.slice(0, at)}${s.slice(end)}`.trim() };
}

/** The system blocks with a shared lead (the corpus index) cached ahead of the rest. */
export function withSharedLead(lead, system) {
  if (!String(lead || '').trim()) return system;
  const restBlocks = cachedSystem(system) || [];
  // Kept an hour, not five minutes: Bart's turns are often more than five
  // minutes apart, and rewriting 50,000 tokens after every pause cost more
  // than the one-hour copy's higher price to write once.
  return [{ type: 'text', text: String(lead), cache_control: HOUR }, ...restBlocks];
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
    // A call went through: if the spending limit had paused the team, say it is back.
    .then(() => import('./team/aiLimit.js'))
    .then(({ clearLimitStopIfSet }) => clearLimitStopIfSet())
    .catch((err) => console.error('[aiUsage] save failed:', err?.message || err));
}

/**
 * A model call failed. If Anthropic refused it for the spending limit, Bit
 * tells Bart right away (lib/ao/team/aiLimit.js). Never waits, never throws.
 */
export function noteAiFailure(err, source = 'unknown') {
  if (process.env.JEST_WORKER_ID) return;
  import('./team/aiLimit.js')
    .then(({ isLimitError, raiseLimitStop }) => (isLimitError(err) ? raiseLimitStop(source) : null))
    .catch(() => {});
}
