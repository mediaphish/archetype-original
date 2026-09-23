/**
 * Every text call in this platform goes through here, and it is Claude.
 *
 * Bart's rule, 2026-08-20: "Auto does need a connection to Open AI for image
 * generation." Image generation, and nothing else. Restated 2026-09-23 after a
 * handoff found roughly twenty text call sites still on gpt-4o-mini: "The only
 * thing we leave with OpenAI is image creation. Period."
 *
 * How they survived: each call site did its own raw fetch to OpenAI with its own
 * `process.env.SOME_MODEL || 'gpt-4o-mini'` fallback. No model variable is set
 * in Vercel, so every fallback was the live value, and the writing that went out
 * under Bart's name was produced by a model his voice guardrails never saw.
 *
 * Two rules here:
 *   1. One place decides the model. A call site names a task, not a model.
 *   2. A model variable that names anything but a Claude model throws. Silently
 *      changing vendor is the fault underneath the whole episode; falling over
 *      loudly is the only safe failure.
 *
 * Image generation still calls OpenAI directly (gpt-image-1) and does not come
 * through here.
 */
import Anthropic from '@anthropic-ai/sdk';

/**
 * Task to model and thinking effort.
 *
 * Bart, 2026-09-23: "I want the best outcome, so cheaper isn't the biggest
 * concern. But I don't want to over engineer it for the task. Choose the models
 * that are most efficient for the tasks I am asking of them."
 *
 * So the split is by what the work actually demands, not by price:
 *
 *   voice     prose published under his name. The strongest model, thinking
 *             hard. Voice fidelity is the exact thing that failed here.
 *   draft     long-form writing and rewriting, including rewriting someone
 *             else's words carefully (story neutralization). Same tier.
 *   analysis  judgement with reasoning: is this candidate worth chasing, what
 *             does this ALI data mean. Sonnet is strong enough and quicker.
 *   extract   pulling structure out of prose Bart pasted. Needs real reading
 *             comprehension, so Sonnet rather than the small model; a hundred
 *             seeds read off a freeform paste is not a trivial task.
 *   classify  a label or a yes/no from a short input. Haiku, low effort. Using
 *             anything bigger here is the over-engineering he means.
 */
const TASK_DEFAULTS = Object.freeze({
  voice: { model: 'claude-opus-5', effort: 'high' },
  draft: { model: 'claude-opus-5', effort: 'high' },
  analysis: { model: 'claude-sonnet-5', effort: 'medium' },
  extract: { model: 'claude-sonnet-5', effort: 'low' },
  classify: { model: 'claude-haiku-4-5', effort: 'low' },
});

const TASK_MODELS = Object.freeze(
  Object.fromEntries(Object.entries(TASK_DEFAULTS).map(([task, cfg]) => [task, cfg.model]))
);

/** The thinking effort a task gets unless the call site says otherwise. */
export function defaultEffortFor(task = 'analysis') {
  return (TASK_DEFAULTS[task] || TASK_DEFAULTS.analysis).effort;
}

const CLAUDE_MODEL = /^claude-/i;

let cachedClient = null;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cachedClient;
}

/** True when a text model can be reached at all. */
export function textModelConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * The model for a task, honouring an override only when it names a Claude model.
 * @throws when an override names another vendor's model.
 */
export function resolveTextModel(task = 'analysis', { overrideEnv = null } = {}) {
  const override = overrideEnv ? String(process.env[overrideEnv] || '').trim() : '';
  if (override) {
    if (!CLAUDE_MODEL.test(override)) {
      throw new Error(
        `${overrideEnv}="${override}" is not a Claude model. Text generation is Claude only; ` +
          'OpenAI is for image creation. Unset the variable or set a claude-* model.'
      );
    }
    return override;
  }
  return TASK_MODELS[task] || TASK_MODELS.analysis;
}

function textOf(response) {
  return (response?.content || [])
    .filter((b) => b?.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

/**
 * One completion. Returns '' rather than throwing on an API failure, because
 * every call site here already has a fallback for "the model said nothing".
 *
 * @param {{ prompt: string, system?: string, task?: string, maxTokens?: number,
 *           effort?: 'low'|'medium'|'high', overrideEnv?: string|null }} args
 */
export async function completeText({
  prompt,
  system = '',
  task = 'analysis',
  maxTokens = 1024,
  effort = null,
  timeoutMs = null,
  overrideEnv = null,
} = {}) {
  const client = getClient();
  if (!client) return '';
  const body = String(prompt || '').trim();
  if (!body) return '';

  // Several call sites ran the old fetch inside an AbortController with their
  // own time budget (the analyst, the scout pass, external sources). Passing
  // timeoutMs keeps that budget and actually cancels the request, rather than
  // leaving it running while nothing waits for it.
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await client.messages.create(
      {
        model: resolveTextModel(task, { overrideEnv }),
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: [{ role: 'user', content: body }],
        output_config: { effort: effort || defaultEffortFor(task) },
      },
      controller ? { signal: controller.signal } : undefined
    );
    if (response.stop_reason === 'refusal') return '';
    return textOf(response);
  } catch (err) {
    const aborted = err?.name === 'AbortError' || /abort/i.test(String(err?.message || ''));
    if (!aborted) console.error('[textModel] completion failed:', err?.message || err);
    return '';
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * A multi-turn completion, for the chat endpoints that carry a history and
 * enforce their own timeout (the analyst and quote-studio chats).
 *
 * Returns the outcome rather than throwing, because those endpoints tell the
 * user apart "the assistant did not respond in time" from "the request failed",
 * and collapsing the two would make their messages wrong.
 *
 * @param {{ messages: Array<{role:string, content:string}>, system?: string,
 *           task?: string, maxTokens?: number, effort?: string,
 *           timeoutMs?: number|null, overrideEnv?: string|null }} args
 * @returns {Promise<{ text: string, timedOut: boolean, error: string|null }>}
 */
export async function completeChat({
  messages = [],
  system = '',
  task = 'analysis',
  maxTokens = 1500,
  effort = null,
  timeoutMs = null,
  overrideEnv = null,
} = {}) {
  const client = getClient();
  if (!client) return { text: '', timedOut: false, error: 'ANTHROPIC_API_KEY is not configured' };

  // Anthropic takes the system prompt as a top-level field, and the first
  // message must be from the user.
  const turns = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && m.role !== 'system' && String(m.content || '').trim())
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length) return { text: '', timedOut: false, error: 'no messages to send' };

  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await client.messages.create(
      {
        model: resolveTextModel(task, { overrideEnv }),
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: turns,
        output_config: { effort: effort || defaultEffortFor(task) },
      },
      controller ? { signal: controller.signal } : undefined
    );
    if (response.stop_reason === 'refusal') return { text: '', timedOut: false, error: 'refusal' };
    return { text: textOf(response), timedOut: false, error: null };
  } catch (err) {
    const aborted = err?.name === 'AbortError' || /abort/i.test(String(err?.message || ''));
    if (!aborted) console.error('[textModel] chat completion failed:', err?.message || err);
    return { text: '', timedOut: aborted, error: aborted ? 'timeout' : err?.message || 'request failed' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** The first JSON object in a reply, tolerating prose or code fences around it. */
export function extractJson(raw) {
  const text = String(raw || '');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const match = candidate.match(/[{[][\s\S]*[}\]]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * A completion parsed as JSON, or null. The call sites that used to do
 * `JSON.parse(openaiResponse.choices[0].message.content)` use this.
 */
export async function completeJson(args = {}) {
  const system = args.system
    ? `${args.system}\n\nReply with only the JSON object requested. No prose, no code fences.`
    : 'Reply with only the JSON object requested. No prose, no code fences.';
  return extractJson(await completeText({ ...args, system }));
}
