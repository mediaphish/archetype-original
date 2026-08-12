/**
 * Cross-thread stated preferences for Auto (Phase 2).
 *
 * Stored as ao_editorial_memory_items rows with kind = 'stated_preference'.
 * Active rows have extra.superseded_by = null (or missing).
 * Conservative extraction: miss a preference rather than invent one.
 */

import crypto from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';

export const STATED_PREFERENCE_KIND = 'stated_preference';
export const STATED_PREFERENCE_CATEGORIES = ['voice', 'visual', 'process', 'other'];
export const STATED_PREFERENCE_PROMPT_CAP = 30;

const DURABLE_MARKERS =
  /\b(always|never|from now on|going forward|standing|prefer|preference|remember(?:\s+that)?|don['’]?t\s+ever|do\s+not\s+ever|make\s+sure\s+(?:you|to)|rule\s+for\s+(?:me|us)|my\s+(?:rule|standard|convention)|use\s+my\s+full\s+name|sign\s+off\s+with|byline|stock\s+photos?|only\s+real\s+photos?)\b/i;

const ONE_OFF_MARKERS =
  /\b(this\s+(?:post|draft|one|caption|image|message)|can\s+you\s+(?:make|shorten|edit|fix|update)\s+this|for\s+this\s+(?:post|draft|one)|just\s+(?:this|once)|today\s+only)\b/i;

/**
 * Stable slug key for upsert uniqueness (created_by_email, kind, source_url_or_slug).
 */
export function preferenceSourceKey(fact) {
  const norm = String(fact || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
  const hash = crypto.createHash('sha256').update(norm).digest('hex').slice(0, 24);
  return `pref:${hash}`;
}

/**
 * Conservative heuristic: durable standing instruction vs one-off request.
 * Bias toward NOT storing when ambiguous.
 * @returns {{ store: boolean, fact: string|null, category: string, reason: string }}
 */
export function classifyPreferenceHeuristically(userMessage) {
  const text = String(userMessage || '').replace(/\s+/g, ' ').trim();
  if (text.length < 12) {
    return { store: false, fact: null, category: 'other', reason: 'too_short' };
  }
  if (ONE_OFF_MARKERS.test(text) && !DURABLE_MARKERS.test(text)) {
    return { store: false, fact: null, category: 'other', reason: 'one_off' };
  }
  if (!DURABLE_MARKERS.test(text)) {
    return { store: false, fact: null, category: 'other', reason: 'no_durable_marker' };
  }

  // Still require an imperative / standing flavor beyond a single keyword in a question.
  const looksStanding =
    /\b(always|never|from now on|going forward|remember|don['’]?t ever|do not ever|prefer that you|my (?:rule|standard|convention)|sign off with|use my full name|never use stock|only (?:use )?real photos?)\b/i.test(
      text
    );
  if (!looksStanding) {
    return { store: false, fact: null, category: 'other', reason: 'ambiguous' };
  }

  let category = 'other';
  if (/\b(name|byline|sign\s*off|voice|tone|wording|initials)\b/i.test(text)) category = 'voice';
  else if (/\b(photo|image|stock|visual|header|graphic)\b/i.test(text)) category = 'visual';
  else if (/\b(process|workflow|schedule|publish|draft|approve|format)\b/i.test(text))
    category = 'process';

  const fact = text.length > 280 ? `${text.slice(0, 277)}...` : text;
  return { store: true, fact, category, reason: 'durable_heuristic' };
}

/**
 * Optional LLM classifier. Returns same shape as heuristic. On failure → no store.
 */
export async function classifyPreferenceWithModel(userMessage, { anthropicClient = null } = {}) {
  const heuristic = classifyPreferenceHeuristically(userMessage);
  // Clear yes from heuristic → store without spending a model call.
  // Clear no → never store.
  // Only ambiguous cases get a conservative model second look.
  if (heuristic.store) return heuristic;
  if (heuristic.reason !== 'ambiguous') return heuristic;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicClient && !apiKey) {
    return heuristic.store ? heuristic : { ...heuristic, store: false, reason: 'no_model_ambiguous' };
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = anthropicClient || new Anthropic({ apiKey });
    const prompt =
      `You classify whether a message from Bart (site owner) states a DURABLE preference, ` +
      `standing instruction, or fact Auto should remember across future chat threads.\n\n` +
      `STORE only explicit standing rules (naming, visuals, process, recurring facts).\n` +
      `Do NOT store one-off requests scoped to this conversation (e.g. "make this post shorter").\n` +
      `When ambiguous, answer store=false.\n\n` +
      `Message:\n"""${String(userMessage || '').slice(0, 1500)}"""\n\n` +
      `Reply with ONLY JSON: {"store":boolean,"fact":string|null,"category":"voice"|"visual"|"process"|"other"}`;

    const resp = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = String(resp?.content?.[0]?.text || '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { store: false, fact: null, category: 'other', reason: 'model_unparseable' };
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed?.store) {
      return { store: false, fact: null, category: 'other', reason: 'model_no' };
    }
    const fact = String(parsed.fact || '').trim();
    if (!fact || fact.length < 8) {
      return { store: false, fact: null, category: 'other', reason: 'model_empty_fact' };
    }
    const category = STATED_PREFERENCE_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : 'other';
    return { store: true, fact: fact.slice(0, 400), category, reason: 'model_yes' };
  } catch (err) {
    console.warn('[statedPreferences] model classify failed:', err?.message || err);
    // Conservatism: do not store on model failure unless heuristic was clearly yes.
    return heuristic.store
      ? heuristic
      : { store: false, fact: null, category: 'other', reason: 'model_error' };
  }
}

/**
 * Upsert a stated preference for an owner.
 */
export async function upsertStatedPreference({
  email,
  fact,
  category = 'other',
  sourceThreadId = null,
  sourceMessageId = null,
  statedAt = null,
}) {
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  const factText = String(fact || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!emailNorm) return { ok: false, error: 'email is required' };
  if (!factText) return { ok: false, error: 'fact is required' };

  const cat = STATED_PREFERENCE_CATEGORIES.includes(category) ? category : 'other';
  const when = statedAt || new Date().toISOString();
  const key = preferenceSourceKey(factText);
  const extra = {
    fact: factText,
    category: cat,
    source_thread_id: sourceThreadId || null,
    source_message_id: sourceMessageId || null,
    stated_at: when,
    superseded_by: null,
  };

  const { data, error } = await supabaseAdmin
    .from('ao_editorial_memory_items')
    .upsert(
      {
        created_by_email: emailNorm,
        kind: STATED_PREFERENCE_KIND,
        source_url_or_slug: key,
        title: `${cat}: ${factText.slice(0, 80)}`,
        body_text: factText,
        published_at: when,
        topic_tags: [cat, 'stated-preference'],
        extra,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'created_by_email,kind,source_url_or_slug',
        ignoreDuplicates: false,
      }
    )
    .select('id, body_text, extra, published_at, source_url_or_slug')
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, preference: rowToPreference(data) };
}

function rowToPreference(row) {
  if (!row) return null;
  const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
  return {
    id: row.id,
    fact: String(extra.fact || row.body_text || '').trim(),
    category: STATED_PREFERENCE_CATEGORIES.includes(extra.category) ? extra.category : 'other',
    source_thread_id: extra.source_thread_id || null,
    source_message_id: extra.source_message_id || null,
    stated_at: extra.stated_at || row.published_at || null,
    superseded_by: extra.superseded_by || null,
    source_key: row.source_url_or_slug || null,
  };
}

function isActivePreference(row) {
  const extra = row?.extra && typeof row.extra === 'object' ? row.extra : {};
  return extra.superseded_by == null || extra.superseded_by === '';
}

/**
 * List active stated preferences for an owner (most recent first).
 */
export async function listActiveStatedPreferences(email, { limit = STATED_PREFERENCE_PROMPT_CAP } = {}) {
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  if (!emailNorm) return { ok: false, error: 'email is required', preferences: [] };

  const cap = Math.min(Math.max(Number(limit) || STATED_PREFERENCE_PROMPT_CAP, 1), 100);
  const { data, error } = await supabaseAdmin
    .from('ao_editorial_memory_items')
    .select('id, body_text, extra, published_at, source_url_or_slug')
    .eq('created_by_email', emailNorm)
    .eq('kind', STATED_PREFERENCE_KIND)
    .order('published_at', { ascending: false })
    .limit(Math.max(cap * 3, 60));

  if (error) return { ok: false, error: error.message, preferences: [] };

  const active = (data || [])
    .filter(isActivePreference)
    .map(rowToPreference)
    .filter((p) => p?.fact)
    .slice(0, cap);

  return { ok: true, preferences: active };
}

/**
 * Mark a preference superseded (forgotten). Match by id or exact/near fact text.
 */
export async function supersedeStatedPreference({
  email,
  preferenceId = null,
  factContains = null,
  supersededBy = 'forgotten',
} = {}) {
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  if (!emailNorm) return { ok: false, error: 'email is required' };

  const listed = await listActiveStatedPreferences(emailNorm, { limit: 100 });
  if (!listed.ok) return listed;

  let target = null;
  if (preferenceId) {
    target = listed.preferences.find((p) => p.id === preferenceId) || null;
  }
  if (!target && factContains) {
    const needle = String(factContains).toLowerCase().trim();
    target =
      listed.preferences.find((p) => p.fact.toLowerCase().includes(needle)) || null;
  }
  if (!target) return { ok: false, error: 'No matching active preference found' };

  const { data: row, error: loadErr } = await supabaseAdmin
    .from('ao_editorial_memory_items')
    .select('id, extra')
    .eq('id', target.id)
    .eq('created_by_email', emailNorm)
    .maybeSingle();
  if (loadErr) return { ok: false, error: loadErr.message };
  if (!row) return { ok: false, error: 'Preference row not found' };

  const extra = { ...(row.extra && typeof row.extra === 'object' ? row.extra : {}) };
  extra.superseded_by = supersededBy || 'forgotten';
  extra.superseded_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('ao_editorial_memory_items')
    .update({ extra, updated_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('created_by_email', emailNorm);

  if (error) return { ok: false, error: error.message };
  return { ok: true, preference_id: row.id, fact: target.fact };
}

/**
 * Format active preferences for Auto's system prompt.
 */
export function formatStatedPreferencesForPrompt(preferences = []) {
  const list = Array.isArray(preferences) ? preferences.filter((p) => p?.fact && !p.superseded_by) : [];
  if (!list.length) return '';

  const byCat = { voice: [], visual: [], process: [], other: [] };
  for (const p of list) {
    const cat = STATED_PREFERENCE_CATEGORIES.includes(p.category) ? p.category : 'other';
    byCat[cat].push(`- ${p.fact}`);
  }

  const sections = [];
  for (const cat of STATED_PREFERENCE_CATEGORIES) {
    if (!byCat[cat].length) continue;
    sections.push(`${cat}:\n${byCat[cat].join('\n')}`);
  }

  return (
    `## STANDING PREFERENCES (cross-thread — honor these unless Bart explicitly overrides this turn)\n\n` +
    `These were stated by Bart in prior conversations. Treat them as standing instructions.\n\n` +
    `${sections.join('\n\n')}`
  );
}

/**
 * Load prompt block for an owner (always-on).
 */
export async function loadStatedPreferencesContext(email) {
  try {
    const { ok, preferences } = await listActiveStatedPreferences(email, {
      limit: STATED_PREFERENCE_PROMPT_CAP,
    });
    if (!ok || !preferences.length) return '';
    return formatStatedPreferencesForPrompt(preferences);
  } catch (err) {
    console.error('[statedPreferences] load context failed:', err?.message || err);
    return '';
  }
}

/**
 * Extract + store from a user message after a turn. Conservative; no-ops often.
 */
export async function maybeCaptureStatedPreferenceFromMessage({
  email,
  userMessage,
  threadId = null,
  messageId = null,
  classifier = null,
} = {}) {
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  const text = String(userMessage || '').trim();
  if (!emailNorm || !text) return { ok: true, stored: false, reason: 'empty' };

  const classify =
    typeof classifier === 'function'
      ? classifier
      : (msg) => classifyPreferenceWithModel(msg);

  let decision;
  try {
    decision = await classify(text);
  } catch (err) {
    return { ok: false, stored: false, error: err?.message || String(err) };
  }

  if (!decision?.store || !decision?.fact) {
    return { ok: true, stored: false, reason: decision?.reason || 'no_store' };
  }

  const saved = await upsertStatedPreference({
    email: emailNorm,
    fact: decision.fact,
    category: decision.category || 'other',
    sourceThreadId: threadId,
    sourceMessageId: messageId,
  });

  if (!saved.ok) return { ok: false, stored: false, error: saved.error };
  return {
    ok: true,
    stored: true,
    preference: saved.preference,
    reason: decision.reason || 'stored',
  };
}
