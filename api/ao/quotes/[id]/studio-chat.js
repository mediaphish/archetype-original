/**
 * AO Automation — Studio chat (Chat + Outputs)
 * GET/POST /api/ao/quotes/[id]/studio-chat
 *
 * - GET: load (or create) session messages
 * - POST: append user message, generate assistant reply + optional output patch suggestion
 *
 * Note: This endpoint does NOT write drafts back to the quote item.
 * It only suggests patches; the UI controls what is actually saved/published.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { AO_VOICE_MANIFESTO } from '../../../../lib/ao/voiceManifesto.js';
import { getVoiceAnchors } from '../../../../lib/ao/voiceAnchors.js';
import { parseLooseJson } from '../../../../lib/ao/parseLooseJson.js';
import { getOpenAiKey } from '../../../../lib/openaiKey.js';

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function safeArr(v, max = 8, maxLen = 60) {
  const raw = Array.isArray(v) ? v : [];
  const out = [];
  const seen = new Set();
  for (const x of raw) {
    const t = safeText(x, maxLen);
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function cleanOutputsPatch(patch) {
  const p = patch && typeof patch === 'object' ? patch : null;
  if (!p) return null;

  const out = {};

  if (p.drafts_by_channel && typeof p.drafts_by_channel === 'object') {
    const d = p.drafts_by_channel;
    out.drafts_by_channel = {
      linkedin: d.linkedin == null ? undefined : safeText(d.linkedin, 600),
      facebook: d.facebook == null ? undefined : safeText(d.facebook, 500),
      instagram: d.instagram == null ? undefined : safeText(d.instagram, 400),
      x: d.x == null ? undefined : safeText(d.x, 260),
    };
  }

  if (p.hashtags_by_channel && typeof p.hashtags_by_channel === 'object') {
    const h = p.hashtags_by_channel;
    out.hashtags_by_channel = {
      linkedin: Array.isArray(h.linkedin) ? safeArr(h.linkedin, 8, 40) : undefined,
      facebook: Array.isArray(h.facebook) ? safeArr(h.facebook, 8, 40) : undefined,
      instagram: Array.isArray(h.instagram) ? safeArr(h.instagram, 8, 40) : undefined,
      x: Array.isArray(h.x) ? safeArr(h.x, 8, 40) : undefined,
    };
  }

  if (p.first_comment_suggestions && typeof p.first_comment_suggestions === 'object') {
    const f = p.first_comment_suggestions;
    out.first_comment_suggestions = {
      linkedin: f.linkedin == null ? undefined : safeText(f.linkedin, 400) || null,
      facebook: f.facebook == null ? undefined : safeText(f.facebook, 400) || null,
      instagram: f.instagram == null ? undefined : safeText(f.instagram, 400) || null,
      x: f.x == null ? undefined : safeText(f.x, 240) || null,
    };
  }

  if (Object.prototype.hasOwnProperty.call(p, 'quote_card_caption')) {
    out.quote_card_caption = p.quote_card_caption == null ? null : safeText(p.quote_card_caption, 500) || null;
  }

  // Remove empty shells
  if (out.drafts_by_channel && Object.values(out.drafts_by_channel).every((v) => v === undefined)) delete out.drafts_by_channel;
  if (out.hashtags_by_channel && Object.values(out.hashtags_by_channel).every((v) => v === undefined)) delete out.hashtags_by_channel;
  if (out.first_comment_suggestions && Object.values(out.first_comment_suggestions).every((v) => v === undefined)) delete out.first_comment_suggestions;

  if (!Object.keys(out).length) return null;
  return out;
}

async function getOrCreateSession({ quoteId, email }) {
  // Read existing session
  const existing = await supabaseAdmin
    .from('ao_studio_sessions')
    .select('*')
    .eq('quote_id', quoteId)
    .single();

  if (!existing.error && existing.data) return existing.data;

  // Missing table / schema
  if (existing.error && String(existing.error.message || '').includes('ao_studio_sessions')) {
    throw new Error('Studio chat is not set up yet. Run database/ao_studio_sessions.sql in Supabase.');
  }

  // Not found → create
  if (existing.error && existing.error.code === 'PGRST116') {
    const ins = await supabaseAdmin
      .from('ao_studio_sessions')
      .insert({
        quote_id: quoteId,
        messages: [],
        created_by_email: email || null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  // Any other error
  if (existing.error) throw existing.error;

  return null;
}

async function openAiJson({ messages, model, timeoutMs = 12000 }) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return { ok: false, error: 'AI is not configured (missing OPEN_API_KEY).' };

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, error: 'AI request failed' };
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    if (!content) return { ok: false, error: 'AI returned an empty response' };
    const parsed = parseLooseJson(content);
    return { ok: true, parsed, raw: content };
  } catch (e) {
    const msg = String(e?.name || e?.message || e || '');
    if (msg.toLowerCase().includes('abort')) return { ok: false, error: 'AI did not respond in time. Try again.' };
    return { ok: false, error: 'AI request failed' };
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'Quote ID required' });

  try {
    const { data: row, error: readErr } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('*')
      .eq('id', id)
      .single();
    if (readErr) {
      if (readErr.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Quote not found' });
      return res.status(500).json({ ok: false, error: readErr.message });
    }

    const session = await getOrCreateSession({ quoteId: id, email: auth.email });
    const existingMessages = Array.isArray(session?.messages) ? session.messages : [];
    const playbook = row?.studio_playbook && typeof row.studio_playbook === 'object' ? row.studio_playbook : null;
    const pullQuoteSeed = safeText(row.pull_quote || row.quote_text, 320);

    // If this is a fresh session, seed it with a helpful opening message (no AI call).
    if (existingMessages.length === 0) {
      const goal = safeText(playbook?.goal, 20) || '';
      const goalWhy = safeText(playbook?.goal_rationale, 240) || '';
      const primaryFormat = safeText(playbook?.primary_format, 120) || '';
      const angles = Array.isArray(playbook?.angles) ? playbook.angles.map((x) => safeText(x, 140)).filter(Boolean).slice(0, 3) : [];

      const opening = [
        `Here’s what we’re working with.`,
        pullQuoteSeed ? `Pull quote: “${pullQuoteSeed}”` : '',
        primaryFormat ? `Suggested format: ${primaryFormat}` : '',
        goal ? `Primary goal: ${goal}${goalWhy ? ` — ${goalWhy}` : ''}` : '',
        angles.length ? `Angles we can take:\n- ${angles.join('\n- ')}` : '',
        '',
        `What do you want to make first (caption, quote card, or channel drafts)?`,
      ].filter(Boolean).join('\n');

      try {
        const seeded = [{ role: 'assistant', content: opening, at: new Date().toISOString() }];
        const updSeed = await supabaseAdmin
          .from('ao_studio_sessions')
          .update({ messages: seeded, updated_at: new Date().toISOString() })
          .eq('id', session.id)
          .select('id,quote_id,messages')
          .single();
        if (!updSeed.error && updSeed.data) {
          session.messages = updSeed.data.messages;
        }
      } catch (_) {}
    }

    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        session: {
          id: session.id,
          quote_id: session.quote_id,
          messages: (Array.isArray(session?.messages) ? session.messages : existingMessages).slice(-40),
        },
      });
    }

    const userMessage = safeText(req.body?.message, 2000);
    if (!userMessage) return res.status(400).json({ ok: false, error: 'Message required' });

    const pullQuote = safeText(row.pull_quote || row.quote_text, 320);
    const why = safeText(row.why_it_matters, 1200);
    const summary = safeText(row.summary_interpretation, 2600);
    const url = safeText(row.source_url || row.source_slug_or_url, 900);
    const sourceName = safeText(row.source_name || row.source_title, 140);
    const lane = safeText(row.ao_lane, 60);
    const tags = safeArr(row.topic_tags, 10, 40);
    const bestMove = safeText(row.best_move, 60);
    const risks = safeArr(row.risk_flags, 8, 60);

    const outputsNow = {
      drafts_by_channel: row.drafts_by_channel || null,
      hashtags_by_channel: row.hashtags_by_channel || null,
      first_comment_suggestions: row.first_comment_suggestions || null,
      quote_card_caption: row.quote_card_caption || null,
      has_quote_card: !!row.quote_card_svg,
    };

    const anchorQuery = [pullQuote, why, row.source_title].filter(Boolean).join(' ');
    const anchors = await getVoiceAnchors({ queryText: anchorQuery, limit: 3 });

    const manifesto = AO_VOICE_MANIFESTO.map((x) => `- ${x}`).join('\n');
    const anchorBlock = anchors.length
      ? anchors.map((a) => `- ${a.title}${a.url ? ` (${a.url})` : ''}: "${a.excerpt}"`).join('\n')
      : '- (no anchors found)';

    const system = `You are Studio, an assistant that helps turn one approved item into ready-to-publish outputs.

Write in Bart/AO voice using this manifesto:
${manifesto}

Voice anchors from AO corpus (match tone, not content):
${anchorBlock}

Guardrails:
- You can suggest edits, but you MUST NOT claim anything is saved or published.
- Be specific, practical, and non-generic.
- No politics. No dunking. No rage bait.
- If the user asks to cite or reference a source, use the provided source_name/url only.
- Keep outputs channel-appropriate and meaningfully different.

Truth panel (do not rewrite these facts):
- source_name: ${JSON.stringify(sourceName)}
- url: ${JSON.stringify(url)}
- pull_quote: ${JSON.stringify(pullQuote)}
- why_it_matters: ${JSON.stringify(why)}
- summary_interpretation: ${JSON.stringify(summary)}
- best_move: ${JSON.stringify(bestMove)}
- ao_lane: ${JSON.stringify(lane)}
- topic_tags: ${JSON.stringify(tags)}
- risk_flags: ${JSON.stringify(risks)}
- studio_playbook: ${JSON.stringify(playbook || null)}

Current outputs (you may suggest patches to improve these):
${JSON.stringify(outputsNow)}

Response format:
Return ONLY JSON (no markdown, no code fences) with keys:
- assistant_message: string
- outputs_patch: object|null  (may include drafts_by_channel, hashtags_by_channel, first_comment_suggestions, quote_card_caption)
- suggested_actions: object|null (optional: { regenerate_drafts: boolean, regenerate_quote_card: boolean })`;

    const newMessages = [
      ...existingMessages,
      { role: 'user', content: userMessage, at: new Date().toISOString() },
    ].slice(-40);

    const model = process.env.AO_STUDIO_MODEL || 'gpt-4o-mini';
    const ai = await openAiJson({
      model,
      messages: [
        { role: 'system', content: system },
        ...newMessages
          .slice(-16)
          .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: safeText(m.content, 2000) })),
      ],
      timeoutMs: 14000,
    });

    let assistantMessage = '';
    let outputsPatch = null;
    let suggestedActions = null;

    if (!ai.ok) {
      assistantMessage = safeText(ai.error || 'Could not generate a response.', 600);
    } else {
      const parsed = ai.parsed && typeof ai.parsed === 'object' ? ai.parsed : null;
      assistantMessage = safeText(parsed?.assistant_message || '', 2200) || safeText(ai.raw, 2200);
      outputsPatch = cleanOutputsPatch(parsed?.outputs_patch);
      suggestedActions = parsed?.suggested_actions && typeof parsed.suggested_actions === 'object' ? parsed.suggested_actions : null;
    }

    const assistantRecord = {
      role: 'assistant',
      content: assistantMessage,
      at: new Date().toISOString(),
      ...(outputsPatch ? { outputs_patch: outputsPatch } : {}),
      ...(suggestedActions ? { suggested_actions: suggestedActions } : {}),
    };

    const updatedMessages = [...newMessages, assistantRecord].slice(-60);
    const upd = await supabaseAdmin
      .from('ao_studio_sessions')
      .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
      .eq('id', session.id)
      .select('id,quote_id,messages')
      .single();
    if (upd.error) throw upd.error;

    return res.status(200).json({
      ok: true,
      assistant_message: assistantMessage,
      outputs_patch: outputsPatch,
      suggested_actions: suggestedActions,
      session: {
        id: upd.data.id,
        quote_id: upd.data.quote_id,
        messages: Array.isArray(upd.data.messages) ? upd.data.messages.slice(-40) : [],
      },
    });
  } catch (e) {
    console.error('[ao/quotes/studio-chat]', e);
    return res.status(500).json({ ok: false, error: String(e?.message || e || 'Server error') });
  }
}

