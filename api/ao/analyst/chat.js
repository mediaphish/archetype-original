/**
 * AO Automation — Analyst Workroom chat
 * POST /api/ao/analyst/chat
 *
 * Body:
 * - thread_kind: 'quote' | 'idea'
 * - thread_id: string
 * - messages: [{ role: 'user'|'assistant', content: string }]
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getOpenAiKey } from '../../../lib/openaiKey.js';
import { parseLooseJson } from '../../../lib/ao/parseLooseJson.js';

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function normRole(r) {
  const x = String(r || '').toLowerCase().trim();
  return x === 'assistant' ? 'assistant' : 'user';
}

function clampMessages(arr, max = 12) {
  const xs = Array.isArray(arr) ? arr : [];
  const out = [];
  for (const m of xs) {
    const role = normRole(m?.role);
    const content = safeText(m?.content, 1800);
    if (!content) continue;
    out.push({ role, content });
  }
  return out.slice(-max);
}

async function openAiJson({ system, user }) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;
  const model = process.env.AO_ANALYST_MODEL || 'gpt-4o-mini';
  const controller = new AbortController();
  const timeoutMs = Math.max(1500, Math.min(12000, Number(process.env.AO_ANALYST_TIMEOUT_MS || 6500)));
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: 900,
        temperature: 0.2,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    if (!content) return null;
    return parseLooseJson(content);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function normalizeGoActions(raw) {
  const xs = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const x of xs) {
    const action = safeText(x?.action, 40);
    const label = safeText(x?.label, 80);
    const payload = x?.payload && typeof x.payload === 'object' ? x.payload : {};
    if (!action || !label) continue;
    out.push({ action, label, payload });
    if (out.length >= 4) break;
  }
  return out;
}

function normalizeExecution(raw) {
  const x = raw && typeof raw === 'object' ? raw : {};
  const shouldExecuteNow = !!x.should_execute_now;
  const riskTierRaw = String(x.risk_tier || '').toLowerCase().trim();
  const riskTier = riskTierRaw === 'high' ? 'high' : riskTierRaw === 'low' ? 'low' : 'none';
  const why = safeText(x.why, 240);
  const actions = normalizeGoActions(x.actions);
  return { should_execute_now: shouldExecuteNow, risk_tier: riskTier, why, actions };
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const threadKind = String(req.body?.thread_kind || 'quote').toLowerCase().trim();
  const threadId = safeText(req.body?.thread_id, 120);
  const messages = clampMessages(req.body?.messages, 12);

  if (!threadId) return res.status(400).json({ ok: false, error: 'thread_id required' });
  if (!messages.length) return res.status(400).json({ ok: false, error: 'messages required' });

  let context = {};
  try {
    if (threadKind === 'idea') {
      const out = await supabaseAdmin
        .from('ao_ideas')
        .select('id,title,raw_input,markdown_content,source_url,status,created_at,updated_at')
        .eq('created_by_email', auth.email)
        .eq('id', threadId)
        .single();
      if (out.error) throw new Error(out.error.message);
      context = { kind: 'idea', idea: out.data || null };
    } else {
      const out = await supabaseAdmin
        .from('ao_quote_review_queue')
        .select('id,is_internal,source_name,source_title,source_url,source_slug_or_url,quote_text,pull_quote,why_it_matters,summary_interpretation,risk_flags,ao_lane,topic_tags,studio_playbook,alt_moves,similarity_notes')
        .eq('created_by_email', auth.email)
        .eq('id', threadId)
        .single();
      if (out.error) throw new Error(out.error.message);
      context = { kind: 'quote', quote: out.data || null };
    }
  } catch (e) {
    return res.status(404).json({ ok: false, error: e.message || 'Could not load thread context' });
  }

  const sys = [
    `You are AO Analyst — Bart’s decision-desk partner inside AO Automation.`,
    ``,
    `Your job is to help Bart decide what to do with one item or idea, through conversation.`,
    `Rules:`,
    `- Be concise and clear. No metadata dumps.`,
    `- Ask at most ONE clarifying question when needed.`,
    `- Keep it aligned to AO worldview: leadership, teams, culture, accountability, trust, execution. No politics, no rage bait.`,
    `- Prefer suggestions and reasoning; do not force hard paths.`,
    `- When Bart clearly asks you to do work, propose concrete actions and (when safe) mark them to execute now.`,
    ``,
    `Return ONLY JSON with exactly these keys:`,
    `- assistant_message (string)`,
    `- suggestions (string[], 0-6)`,
    `- go_actions (array of 0-4 objects: { label, action, payload })`,
    `- execution (object: { should_execute_now, risk_tier, why, actions })`,
    ``,
    `Allowed go_actions.action values:`,
    `- generate_studio_assets (payload: { only?: "quote_card" | "all" })`,
    `- approve_to_studio (payload: { studio_prompt })`,
    `- approve_to_publisher (payload: {})`,
    `- add_hunt_goal (payload: { topic, why })`,
    ``,
    `Execution rules:`,
    `- Decide whether the LATEST user message is asking you to DO WORK NOW (not just discuss).`,
    `- If yes: set execution.should_execute_now = true and include 1-3 actions in execution.actions.`,
    `- If no: set execution.should_execute_now = false and execution.actions = [].`,
    `- risk_tier is "low" for safe reversible steps (drafts, routing to Studio, adding a hunt goal).`,
    `- risk_tier is "high" only for public posting or irreversible steps (avoid those here).`,
    ``,
    `If unsure, return execution.should_execute_now=false and no actions.`,
  ].join('\n');

  const ctx = context?.kind === 'idea'
    ? {
      kind: 'idea',
      title: safeText(context?.idea?.title, 160),
      source_url: safeText(context?.idea?.source_url, 500),
      raw_input: safeText(context?.idea?.raw_input, 2000),
      markdown_content: safeText(context?.idea?.markdown_content, 2000),
      status: safeText(context?.idea?.status, 40),
    }
    : {
      kind: 'quote',
      is_internal: !!context?.quote?.is_internal,
      source_name: safeText(context?.quote?.source_name, 160),
      source_title: safeText(context?.quote?.source_title, 240),
      source_url: safeText(context?.quote?.source_url || context?.quote?.source_slug_or_url, 800),
      pull_quote: safeText(context?.quote?.pull_quote, 300),
      why_it_matters: safeText(context?.quote?.why_it_matters, 800),
      ao_lane: safeText(context?.quote?.ao_lane, 100),
      topic_tags: Array.isArray(context?.quote?.topic_tags) ? context.quote.topic_tags.slice(0, 8) : [],
      risk_flags: Array.isArray(context?.quote?.risk_flags) ? context.quote.risk_flags.slice(0, 8) : [],
      similarity_notes: context?.quote?.similarity_notes || null,
    };

  const user = [
    `Context JSON:`,
    JSON.stringify(ctx),
    ``,
    `Conversation (latest at bottom):`,
    JSON.stringify(messages),
  ].join('\n');

  const parsed = await openAiJson({ system: sys, user });
  if (!parsed || typeof parsed !== 'object') {
    return res.status(200).json({
      ok: true,
      assistant_message: getOpenAiKey()
        ? 'I could not generate a reply right now. Try again in a moment.'
        : 'AI is not configured on the server right now.',
      suggestions: [],
      go_actions: [],
    });
  }

  const assistantMessage = safeText(parsed.assistant_message, 5000);
  const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.map((s) => safeText(s, 220)).filter(Boolean).slice(0, 6) : [];
  const goActions = normalizeGoActions(parsed.go_actions);
  const execution = normalizeExecution(parsed.execution);

  return res.status(200).json({
    ok: true,
    assistant_message: assistantMessage || '—',
    suggestions,
    go_actions: goActions,
    execution,
  });
}

