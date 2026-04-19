/**
 * Auto intent router — OpenAI classifies natural-language turns so quote-card flows
 * do not depend on brittle user-facing regex phrases. Heuristics in chat.js remain
 * as fast-paths; this layer interprets meaning.
 *
 * Env: AO_AUTO_INTENT_ROUTER_MODEL (default gpt-4o-mini), AO_AUTO_INTENT_ROUTER_DISABLED=1 to skip.
 */

import { getOpenAiKey } from '../openaiKey.js';
import { fetchAccountQuoteCardContext } from './autoQuoteCardRecall.js';
import { wantsUserSuppliedQuoteCards, parseUserSuppliedQuoteCards } from './userSuppliedQuoteCards.js';

const INTENTS = new Set([
  'paste_quote_batch',
  'continue_quote_series',
  'corpus_pull',
  'build_cards_from_pool',
  'publish_cards',
  'inspect_card_text',
  'general',
]);

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function threadSummaryForRouter(currentState) {
  const st = currentState && typeof currentState === 'object' ? currentState : {};
  const n = Array.isArray(st.corpus_pull_quotes) ? st.corpus_pull_quotes.length : 0;
  const pc = Array.isArray(st.publish_candidates) ? st.publish_candidates.length : 0;
  return {
    corpus_pull_quotes_count: n,
    publish_candidates_count: pc,
    quote_card_origin: st.quote_card_origin || null,
    has_publish_wizard: !!(st.publish_wizard && st.publish_wizard.step),
  };
}

/**
 * @param {object} opts
 * @param {string} opts.userMessage
 * @param {object} opts.currentState
 * @param {Array} opts.existingMessages - last messages for tone
 * @param {string} opts.nextMode
 * @returns {Promise<{
 *   intent: string,
 *   confidence: number,
 *   entities: { requested_count?: number|null, references_prior_work?: boolean, topic?: string|null },
 *   extracted_quotes: string[],
 *   model: boolean
 * } | null>}
 */
export async function routeAutoIntent({ userMessage, currentState, existingMessages, nextMode }) {
  const raw = String(userMessage || '').trim();
  if (!raw) return null;

  if (process.env.AO_AUTO_INTENT_ROUTER_DISABLED === '1' || process.env.AO_AUTO_INTENT_ROUTER_DISABLED === 'true') {
    return null;
  }

  const apiKey = getOpenAiKey();
  if (!apiKey) return null;

  // Fast path: existing heuristics already match user paste batch — skip extra call
  if (wantsUserSuppliedQuoteCards(raw)) {
    const parsed = parseUserSuppliedQuoteCards(raw);
    return {
      intent: 'paste_quote_batch',
      confidence: 1,
      entities: { references_prior_work: false },
      extracted_quotes: parsed.map((p) => p.quote).filter(Boolean),
      model: false,
    };
  }

  if (raw.length < 12 && !raw.includes('\n')) {
    return { intent: 'general', confidence: 0.4, entities: {}, extracted_quotes: [], model: false };
  }

  const recent = Array.isArray(existingMessages) ? existingMessages.slice(-6) : [];
  const recentBrief = recent.map((m) => ({
    role: m.role,
    preview: safeText(m.content, 400),
  }));

  const summary = threadSummaryForRouter(currentState);

  const system = `You are a routing classifier for AO Auto (single user: Bart). Classify the latest user message into exactly one intent.

Intents:
- paste_quote_batch: The user pasted or wrote multiple quote lines (numbered/bulleted) and wants square quote cards / captions from those lines—even if they did NOT say "make cards" or "generate".
- continue_quote_series: The user wants MORE new pull-quote lines in the SAME style/voice as before (e.g. "20 more", "same style", "like the published ones", "continue the series"). Not asking to render existing numbered picks only.
- corpus_pull: Search the published library/corpus for candidate pull-quote lines (research/pull).
- build_cards_from_pool: User is selecting numbers, asking for captions/cards/previews from quotes already listed in THIS thread.
- publish_cards: Schedule/publish/queue quote cards to social.
- inspect_card_text: Show text of card N, "what's on card 2", list all quotes in thread.
- general: Planning, discussion, questions, unrelated.

Return ONLY valid JSON:
{"intent":"one_of_the_above","confidence":0.0,"entities":{"requested_count":null,"references_prior_work":false,"topic":null},"extracted_quotes":[]}

Rules:
- extracted_quotes: ONLY for paste_quote_batch. Extract distinct quote lines (strip numbering like "1."). Max 24 strings. If the message is not mainly a quote list, use [].
- requested_count: if user says a number of NEW lines/cards wanted (e.g. 20), set it; else null.
- references_prior_work: true if they refer to earlier batch, published cards, "same as before", "we already did", etc.
- confidence: 0–1 how sure you are.`;

  const user = `Thread snapshot: ${JSON.stringify(summary)}
Current mode hint: ${JSON.stringify(nextMode || 'general')}
Recent messages (short): ${JSON.stringify(recentBrief)}
Latest user message:
${raw}`;

  const model = process.env.AO_AUTO_INTENT_ROUTER_MODEL || 'gpt-4o-mini';

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    const data = await res.json().catch(() => ({}));
    const content = data?.choices?.[0]?.message?.content;
    if (!res.ok || !content) return null;
    const parsed = JSON.parse(content);
    const intent = INTENTS.has(parsed.intent) ? parsed.intent : 'general';
    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5));
    const entities = parsed.entities && typeof parsed.entities === 'object' ? parsed.entities : {};
    const extracted_quotes = Array.isArray(parsed.extracted_quotes)
      ? parsed.extracted_quotes.map((x) => safeText(x, 2000)).filter(Boolean).slice(0, 24)
      : [];
    return {
      intent,
      confidence,
      entities: {
        requested_count: entities.requested_count != null ? Number(entities.requested_count) : null,
        references_prior_work: !!entities.references_prior_work,
        topic: entities.topic != null ? safeText(entities.topic, 200) : null,
      },
      extracted_quotes,
      model: true,
    };
  } catch {
    return null;
  }
}

/** Count lines that look like `1. …` / `2) …` (used to avoid duplicating a full user paste in synthetic messages). */
function countNumberedLines(text) {
  if (!text) return 0;
  let n = 0;
  for (const line of String(text).split(/\r?\n/)) {
    if (/^\s*\d+[.)]\s+/.test(line)) n += 1;
  }
  return n;
}

/**
 * Build a message body that satisfies existing paste + build-intent heuristics.
 */
export function buildSyntheticPasteMessage(extractedQuotes, originalMessage = '') {
  const lines = Array.isArray(extractedQuotes) ? extractedQuotes.filter(Boolean) : [];
  if (lines.length < 2) return null;
  const numbered = lines.map((q, i) => `${i + 1}. ${q}`).join('\n');
  const tail = safeText(originalMessage, 4000);
  const numberedInTail = countNumberedLines(tail);
  // Appending the full original often repeats the same numbered list already in `numbered`, which doubles parse results (e.g. 20 → 40 cards).
  const tailWouldDuplicateBatch = numberedInTail >= lines.length;
  const hint =
    tail &&
    !numbered.includes(tail.slice(0, 80)) &&
    !tailWouldDuplicateBatch
      ? `\n\n---\nUser note: ${tail}`
      : '';
  return `${numbered}\n\nPlease generate minimal branded square quote cards from these pull-quote lines.${hint}`;
}

/**
 * Generate new quote lines in the same style as prior account work (continuation).
 */
export async function generateContinuationQuoteLines({ userMessage, email, requestedCount, intentRoute }) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;

  const n = Math.min(50, Math.max(1, Number(requestedCount) || 10));
  let seeds = [];
  try {
    const ctx = await fetchAccountQuoteCardContext(email, { cap: 14 });
    seeds = Array.isArray(ctx.items) ? ctx.items.map((x) => safeText(x.quote_snippet || x.quote, 280)).filter(Boolean) : [];
  } catch {
    seeds = [];
  }

  const system = `You write stand-alone pull-quote lines for Bart's leadership content. Same voice as the seed examples: short, punchy, one line each, no numbering in the line text. Output JSON only: {"lines":["line1","line2",...]}
${seeds.length ? `Seed examples (style only):\n${seeds.slice(0, 10).map((s) => `- ${s}`).join('\n')}` : 'No prior seeds — use a professional leadership tone consistent with servant leadership and accountability themes.'}
Produce exactly ${n} lines. No duplicates of the seed text.`;

  const user = `User request:\n${safeText(userMessage, 4000)}`;

  const model = process.env.AO_AUTO_CONTINUATION_MODEL || process.env.AO_AUTO_INTENT_ROUTER_MODEL || 'gpt-4o-mini';

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    const data = await res.json().catch(() => ({}));
    const content = data?.choices?.[0]?.message?.content;
    if (!res.ok || !content) return null;
    const parsed = JSON.parse(content);
    const lines = Array.isArray(parsed.lines) ? parsed.lines.map((x) => safeText(x, 500)).filter(Boolean) : [];
    if (lines.length < 2) return null;
    return { lines: lines.slice(0, n), model: true };
  } catch {
    return null;
  }
}

/**
 * Apply router + continuation to produce the message used for quote-card branch detection.
 */
export async function resolveQuoteRoutingMessage(userMessage, { currentState, existingMessages, nextMode, email }) {
  const raw = String(userMessage || '').trim();
  let msg = raw;
  const route = await routeAutoIntent({ userMessage: raw, currentState, existingMessages, nextMode });
  if (!route) return { msgForQuoteRouting: msg, intentRoute: null };

  let intentRoute = route;

  if (
    route.intent === 'continue_quote_series' &&
    route.confidence >= 0.5 &&
    email
  ) {
    const n = route.entities?.requested_count && route.entities.requested_count > 0 ? route.entities.requested_count : 10;
    const gen = await generateContinuationQuoteLines({
      userMessage: raw,
      email,
      requestedCount: n,
      intentRoute: route,
    });
    if (gen?.lines?.length >= 2) {
      const synthetic = buildSyntheticPasteMessage(gen.lines, raw);
      if (synthetic) {
        msg = synthetic;
        intentRoute = { ...route, continuationGenerated: true, generatedLineCount: gen.lines.length };
      }
    }
  } else if (
    route.intent === 'paste_quote_batch' &&
    route.confidence >= 0.55 &&
    route.extracted_quotes.length >= 2 &&
    route.model
  ) {
    // Fast path (wantsUserSuppliedQuoteCards) sets model:false — keep the user’s exact message; synthetic would duplicate lines.
    const synthetic = buildSyntheticPasteMessage(route.extracted_quotes, raw);
    if (synthetic) msg = synthetic;
  }

  return { msgForQuoteRouting: msg, intentRoute };
}
