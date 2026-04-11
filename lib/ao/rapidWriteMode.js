/**
 * Rapid Write — recipe mode: structured seeds → short journal posts (Auto v1).
 * @see plan: rapid_write_mode_spec (Cursor plans)
 */

import { getOpenAiKey } from '../openaiKey.js';
import { getVoiceAnchors } from './voiceAnchors.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

/** First line activates; body is freeform seed list (interpreted by guardrails), not a required JSON shape. */
export function wantsRapidWriteActivation(text) {
  const raw = String(text || '').trim();
  if (!raw) return false;
  const first = raw.split('\n')[0].trim();
  return /^\s*rapid\s+write\b/i.test(first) || /^\s*rapid\s+write\s*:/i.test(first);
}

/** Everything after the first line (the Rapid Write trigger). */
export function stripRapidWriteHeader(text) {
  const raw = String(text || '');
  const lines = raw.split('\n');
  if (!lines.length) return '';
  if (/^\s*rapid\s+write\b/i.test(lines[0].trim())) {
    return lines.slice(1).join('\n').trim();
  }
  return raw.trim();
}

export function wantsExitRapidWrite(text) {
  const s = String(text || '').trim().toLowerCase();
  return /^(exit\s+rapid\s+write|end\s+rapid\s+write\s+mode)\b/.test(s) || /^end\s+rapid\s+write\s+mode\b/.test(s);
}

/** Spec: message starts with Agent Training or Agent Training: */
export function wantsRapidWriteAgentTraining(text) {
  const raw = String(text || '').trim();
  if (!raw) return false;
  const first = raw.split('\n')[0].trim();
  return /^agent\s+training\s*$/i.test(first) || /^agent\s+training\s*:/i.test(first);
}

export function extractAgentTrainingBody(text) {
  const raw = String(text || '').trim();
  const lines = raw.split('\n');
  if (lines.length < 2 && !/^agent\s+training\s*:/i.test(lines[0] || '')) return '';
  if (/^agent\s+training\s*$/i.test(lines[0]?.trim() || '')) {
    return lines.slice(1).join('\n').trim();
  }
  if (/^agent\s+training\s*:/i.test(lines[0] || '')) {
    return lines[0].replace(/^agent\s+training\s*:\s*/i, '').trim() + (lines.length > 1 ? `\n${lines.slice(1).join('\n')}` : '');
  }
  return '';
}

function normalizeSeedObject(o, index) {
  const id = safeText(o.id, 80) || `rw-${index + 1}`;
  const core_idea = safeText(o.core_idea, 4000);
  const leadership_category = safeText(o.leadership_category, 200);
  const psychological_outcome = safeText(o.psychological_outcome, 200);
  const real_world_context = safeText(o.real_world_context, 4000);
  const research_notes = safeText(o.research_notes, 8000);
  const insight_anchor = safeText(o.insight_anchor, 2000);
  const new_angle = safeText(o.new_angle, 2000);
  if (!core_idea || !leadership_category || !psychological_outcome) return null;
  return {
    id,
    core_idea,
    leadership_category,
    psychological_outcome,
    real_world_context,
    research_notes,
    insight_anchor,
    new_angle,
  };
}

/**
 * Optional: parse JSON array from fenced block or `[...]` in text (power users / tooling).
 */
export function parseRapidWriteSeedsJson(text) {
  const raw = String(text || '');
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : raw;
  let jsonStr = candidate;
  const arrStart = candidate.indexOf('[');
  const arrEnd = candidate.lastIndexOf(']');
  if (arrStart >= 0 && arrEnd > arrStart) jsonStr = candidate.slice(arrStart, arrEnd + 1);
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return { ok: false, seeds: [], error: 'Expected a JSON array of seed objects.' };
    const seeds = [];
    for (let i = 0; i < parsed.length; i += 1) {
      const o = parsed[i];
      if (!o || typeof o !== 'object') continue;
      const n = normalizeSeedObject(o, i);
      if (!n) {
        return {
          ok: false,
          seeds: [],
          error: `Seed ${safeText(o.id, 80) || i + 1}: core_idea, leadership_category, and psychological_outcome are required.`,
        };
      }
      seeds.push(n);
    }
    if (!seeds.length) return { ok: false, seeds: [], error: 'No valid seed objects in the JSON array.' };
    return { ok: true, seeds, error: '' };
  } catch (e) {
    return { ok: false, seeds: [], error: `Could not parse JSON: ${e.message || e}` };
  }
}

/**
 * Turn freeform pasted list (bullets, numbers, paragraphs) into structured seeds — **system responsibility**, not user formatting rules.
 */
export async function extractRapidWriteSeedsFromFreeform(paste) {
  const apiKey = getOpenAiKey();
  const body = String(paste || '').trim();
  if (!body) return { ok: false, seeds: [], error: 'Add your seed list below the first line (Rapid Write).' };
  if (!apiKey) {
    return {
      ok: false,
      seeds: [],
      error:
        'Freeform seed lists need the AI interpreter on the server. If you see this often, ask your technical owner to confirm the AI key for Auto.',
    };
  }

  const user = `The owner pasted a list of content seeds for short "Psychological Cost of Leadership" style posts (30–60 second reads). Infer one seed per distinct idea. The paste may be bullets, numbers, paragraphs, or messy notes — do not require a specific format.

Paste:
---
${body.slice(0, 48000)}
---

Return JSON only:
{"seeds":[{"id":"rw-1","core_idea":"string","leadership_category":"string","psychological_outcome":"string","real_world_context":"string","research_notes":"string","insight_anchor":"string","new_angle":"string"}]}

Rules:
- core_idea: the main claim or angle for that post.
- leadership_category: e.g. Inconsistent Leadership, Avoidant Leadership, Transactional Leadership, Overcontrol — or a short label that fits the paste.
- psychological_outcome: e.g. Anxiety, Burnout, Resentment — or a short label that fits.
- real_world_context, research_notes: use "" if unknown; infer lightly from context when obvious.
- insight_anchor: what is new or differentiated vs repeating old ground (required string; use best guess).
- new_angle: optional extra line if helpful.
- id: rw-1, rw-2, … in order.
- Maximum 100 seeds; if more ideas, take the clearest distinct items first.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.AO_AUTO_RAPID_WRITE_EXTRACT_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You extract structured Rapid Write seeds from unstructured paste. JSON only. Archetype Original — servant leadership, diagnostic tone.',
          },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) return { ok: false, seeds: [], error: 'Could not interpret seeds (request failed).' };
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    const parsed = JSON.parse(content);
    const arr = Array.isArray(parsed.seeds) ? parsed.seeds : [];
    const seeds = [];
    for (let i = 0; i < arr.length; i += 1) {
      const n = normalizeSeedObject(arr[i], i);
      if (n) seeds.push(n);
    }
    if (!seeds.length) return { ok: false, seeds: [], error: 'Could not infer any seeds from that paste. Try adding clearer one-idea-per-block spacing.' };
    return { ok: true, seeds, error: '' };
  } catch (e) {
    return { ok: false, seeds: [], error: `Could not interpret seeds: ${e.message || e}` };
  }
}

/**
 * Prefer JSON if present; otherwise interpret freeform paste (guardrails).
 */
export async function parseOrExtractRapidWriteSeeds(fullMessage) {
  const stripped = stripRapidWriteHeader(fullMessage);
  const tryText = stripped || fullMessage;

  const jsonFromStripped = parseRapidWriteSeedsJson(tryText);
  if (jsonFromStripped.ok && jsonFromStripped.seeds.length) {
    return { ...jsonFromStripped, source: 'json' };
  }

  const jsonFromFull = parseRapidWriteSeedsJson(fullMessage);
  if (jsonFromFull.ok && jsonFromFull.seeds.length) {
    return { ...jsonFromFull, source: 'json' };
  }

  return { ...(await extractRapidWriteSeedsFromFreeform(tryText)), source: 'freeform' };
}

export function wantsRunAllSeeds(text) {
  const s = String(text || '').trim().toLowerCase();
  return /\b(run all seeds|generate all|write all|process all seeds)\b/.test(s);
}

export function wantsNextSeed(text) {
  const s = String(text || '').trim().toLowerCase();
  return /^(next seed|next|write next)\b/.test(s) || /^\s*next\s*$/i.test(String(text || '').trim());
}

/** Owner override — proceed despite flags. */
export function wantsDoItAnyway(text) {
  const s = String(text || '').trim().toLowerCase();
  return /\bdo it anyway\b/.test(s) || /\bproceed anyway\b/.test(s) || /\boverride\b.*\bflag/.test(s);
}

/** Keep corpus links stable across revisions — strip from markdown for the writer; re-append after body. */
export function extractRelatedCorpusBlock(markdown) {
  const m = String(markdown || '');
  const idx = m.indexOf('**Related (corpus)**');
  if (idx < 0) return '';
  return m.slice(idx).trim();
}

/**
 * Same assembly as writeRapidWritePost return path. relatedBlock is optional tail from extractRelatedCorpusBlock.
 */
export function buildRapidWriteMarkdownFromParts(title, body, reflectionQuestion, relatedBlock = '') {
  const lines = [
    `## ${safeText(title, 200)}`,
    '',
    safeText(body, 12000),
    '',
    `*${safeText(reflectionQuestion, 400)}*`,
  ];
  const rel = String(relatedBlock || '').trim();
  if (rel) lines.push('', rel);
  return lines.join('\n');
}

/**
 * @param {object} w - writeRapidWritePost success object
 * @param {string|null} corpusDraftId
 */
export function normalizeRapidWriteDraftState(w, corpusDraftId = null) {
  if (!w || !w.markdown || !w.seed_id) return null;
  return {
    title: safeText(w.title, 200),
    slug: safeText(w.slug, 240),
    markdown: safeText(w.markdown, 50000),
    body: safeText(w.body, 12000),
    reflection_question: safeText(w.reflection_question, 400),
    seed_id: safeText(w.seed_id, 80),
    corpus_draft_id: corpusDraftId ? String(corpusDraftId) : null,
    updated_at: new Date().toISOString(),
  };
}

const INTENT_MODEL = () => process.env.AO_AUTO_RAPID_WRITE_INTENT_MODEL || 'gpt-4o-mini';

/**
 * Classify message: revise existing draft text vs discuss-only. seed_ids must be valid draft keys when intent is revise_draft.
 */
export async function parseRapidWriteDraftOrDiscussIntent(userMessage, { seeds = [], drafts_by_seed_id = {} }) {
  const apiKey = getOpenAiKey();
  const draftKeys = Object.keys(drafts_by_seed_id || {});
  if (!draftKeys.length) return { intent: 'discuss', seed_ids: [], instruction: '' };
  if (!apiKey) return { intent: 'discuss', seed_ids: [], instruction: '' };

  const seedList = (Array.isArray(seeds) ? seeds : []).map((s) => `${s.id}: ${safeText(s.core_idea, 120)}`).join('\n');

  const user = `Bart is in Rapid Write mode. He may have drafts keyed by seed id.

Known seed ids (drafts may exist for some): ${draftKeys.join(', ')}

Seed summary:
${seedList || '(none)'}

His message:
---
${String(userMessage || '').slice(0, 8000)}
---

Return JSON only:
{"intent":"revise_draft"|"discuss","seed_ids":["rw-1"],"instruction":"string"}

Rules:
- intent "revise_draft" ONLY if he wants the draft TEXT changed (shorten, sharpen, merge ideas, fix tone, rewrite opening, align with overlap, etc.).
- intent "discuss" for strategy questions, "what should I do?", understanding flags, or chit-chat without editing text.
- seed_ids: which draft(s) to edit — must be subset of [${draftKeys.map((k) => JSON.stringify(k)).join(', ')}]. Empty if discuss.
- If he names one seed (e.g. rw-4) and asks for edits, include that id.
- If he says "all drafts" with one instruction, include all relevant draft ids.
- instruction: the editing request in his words; empty if discuss.

If ambiguous, prefer "discuss".`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: INTENT_MODEL(),
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You classify Rapid Write owner messages. JSON only. Be conservative: revise_draft only when he clearly wants draft text changed.',
          },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) return { intent: 'discuss', seed_ids: [], instruction: '' };
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    const parsed = JSON.parse(content);
    const intent = parsed.intent === 'revise_draft' ? 'revise_draft' : 'discuss';
    const rawIds = Array.isArray(parsed.seed_ids) ? parsed.seed_ids : [];
    const allowed = new Set(draftKeys);
    const seed_ids = rawIds.map((x) => safeText(x, 80)).filter((id) => allowed.has(id));
    let instruction = safeText(parsed.instruction, 4000);
    let outIds = seed_ids;
    if (intent === 'revise_draft' && !outIds.length) {
      const found = new Set();
      const re = /\brw-[\w-]+\b/gi;
      let m;
      const msg = String(userMessage || '');
      while ((m = re.exec(msg))) {
        const id = m[0];
        if (allowed.has(id)) found.add(id);
      }
      outIds = [...found];
    }
    if (intent === 'revise_draft' && outIds.length && !instruction) {
      instruction = safeText(userMessage, 4000);
    }
    return { intent, seed_ids: outIds, instruction };
  } catch {
    return { intent: 'discuss', seed_ids: [], instruction: '' };
  }
}

/**
 * Per-seed validation: overlap (Librarian-style) + lightweight falsity check.
 * @returns {Promise<Array<{ id: string, flags: Array<{ type: string, detail: string }>, anchors: Array }>>}
 */
export async function validateRapidWriteSeeds(seeds, _email) {
  const apiKey = getOpenAiKey();
  const out = [];
  for (const seed of seeds) {
    const flags = [];
    const query = [seed.core_idea, seed.real_world_context, seed.insight_anchor].filter(Boolean).join(' ');
    const anchors = await getVoiceAnchors({ queryText: query, limit: 3 });
    const insightLen = (seed.insight_anchor || '').length;
    const newAngleLen = (seed.new_angle || '').length;
    if (anchors.length >= 2 && insightLen < 50 && newAngleLen < 30) {
      flags.push({
        type: 'overlap',
        detail: `Similar angles may already exist in the corpus (${anchors.map((a) => a.title).join('; ')}). Your insight_anchor is short—confirm this adds a new angle or say "do it anyway".`,
      });
    }

    if (apiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: process.env.AO_AUTO_RAPID_WRITE_VALIDATE_MODEL || 'gpt-4o-mini',
            temperature: 0.1,
            max_tokens: 200,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  'You flag only OBJECTIVELY FALSE or absurd claims in a content seed for Archetype Original (servant leadership). Reply JSON: {"likely_false":boolean,"reason":string}. If the seed is plausible or opinion, likely_false false.',
              },
              {
                role: 'user',
                content: `Seed core idea: ${seed.core_idea}\nResearch notes: ${seed.research_notes || '(none)'}`,
              },
            ],
          }),
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          const content = json.choices?.[0]?.message?.content?.trim() || '';
          const parsed = JSON.parse(content);
          if (parsed.likely_false === true) {
            flags.push({
              type: 'falsity',
              detail: safeText(parsed.reason, 500) || 'Flagged as potentially false or absurd; review or say "do it anyway".',
            });
          }
        }
      } catch {
        /* skip falsity if API fails */
      }
    }

    out.push({ id: seed.id, flags, anchors });
  }
  return out;
}

/**
 * Writer: one canonical short post per seed (markdown-friendly).
 */
export async function writeRapidWritePost(seed, { seriesSlugPrefix = 'psychological-cost', agentTrainingNotes = [] } = {}) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return { ok: false, error: 'OpenAI not configured' };

  const anchors = await getVoiceAnchors({
    queryText: [seed.core_idea, seed.leadership_category].join(' '),
    limit: 3,
  });
  const anchorHint = anchors.length
    ? `Closest corpus titles for voice alignment (do not cite as bibliography in body): ${anchors.map((a) => a.title).join('; ')}.`
    : '';

  const trainingBlock =
    Array.isArray(agentTrainingNotes) && agentTrainingNotes.length
      ? `\nOwner mode instructions (highest priority for tone):\n${agentTrainingNotes.slice(-6).join('\n')}\n`
      : '';

  const user = `Write ONE short journal post (30–60 second read) for Archetype Original.

Seed (do not change core meaning, category, or outcome):
- Core idea: ${seed.core_idea}
- Leadership category: ${seed.leadership_category}
- Psychological outcome: ${seed.psychological_outcome}
- Real-world context: ${seed.real_world_context || '(none)'}
- Insight anchor (what is new): ${seed.insight_anchor || '(none)'}

${anchorHint}
${trainingBlock}

Output JSON only:
{
  "title": "short grounded title, no hype",
  "slug_suffix": "kebab-case short topic fragment",
  "tags": ["${seed.leadership_category}", "${seed.psychological_outcome}"],
  "body": "narrative only — opening observation, pattern, psychological insight, grounded AO-aligned reality check, closing tension not resolution. No section labels. No emojis.",
  "reflection_question": "one specific question"
}

Rules: AO Living Voice — human, direct, observational. Not marketer, therapist, or academic. No clichés. Do not moralize. Do not mention tags or system in body. No em dashes as a stylistic crutch.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.AO_AUTO_RAPID_WRITE_MODEL || process.env.AO_AUTO_MODEL || 'gpt-4o-mini',
        temperature: 0.35,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are the Writer for Archetype Original Rapid Write. JSON only.',
          },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) return { ok: false, error: 'Writer request failed' };
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    const parsed = JSON.parse(content);
    const slug = `${seriesSlugPrefix}-${safeText(parsed.slug_suffix, 80).replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').toLowerCase()}`;
    const internal_links = anchors
      .filter((a) => a.url)
      .map((a) => `- [${a.title}](${a.url})`)
      .join('\n');

    const markdown = [
      `## ${safeText(parsed.title, 200)}`,
      '',
      safeText(parsed.body, 12000),
      '',
      `*${safeText(parsed.reflection_question, 400)}*`,
      '',
      internal_links ? '**Related (corpus)**\n' + internal_links : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      ok: true,
      title: safeText(parsed.title, 200),
      slug,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [seed.leadership_category, seed.psychological_outcome],
      body: safeText(parsed.body, 12000),
      reflection_question: safeText(parsed.reflection_question, 400),
      markdown,
      seed_id: seed.id,
    };
  } catch (e) {
    return { ok: false, error: e.message || 'Writer failed' };
  }
}

const REVISE_MODEL = () => process.env.AO_AUTO_RAPID_WRITE_REVISE_MODEL || process.env.AO_AUTO_RAPID_WRITE_MODEL || process.env.AO_AUTO_MODEL || 'gpt-4o-mini';

/**
 * Apply owner instruction to an existing Rapid Write draft; preserves **Related (corpus)** block when present.
 */
export async function reviseRapidWriteDraft(
  seed,
  currentDraft,
  instruction,
  { agentTrainingNotes = [], overlapHint = '' } = {}
) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return { ok: false, error: 'OpenAI not configured' };
  const inst = String(instruction || '').trim();
  if (!inst) return { ok: false, error: 'No instruction for revision.' };
  if (!seed || !currentDraft || !String(currentDraft.markdown || '').trim()) {
    return { ok: false, error: 'Missing seed or draft.' };
  }

  const relatedPreserved = extractRelatedCorpusBlock(currentDraft.markdown);
  const trainingBlock =
    Array.isArray(agentTrainingNotes) && agentTrainingNotes.length
      ? `\nOwner mode instructions (highest priority):\n${agentTrainingNotes.slice(-6).join('\n')}\n`
      : '';
  const overlapBlock = overlapHint ? `\nContext (corpus overlap note): ${overlapHint}\n` : '';

  const user = `Revise this Archetype Original Rapid Write draft per the owner's instruction. Keep the same psychological DNA as the seed; do not contradict core idea, leadership category, or outcome.

Seed (reference — do not abandon):
- Core idea: ${seed.core_idea}
- Leadership category: ${seed.leadership_category}
- Psychological outcome: ${seed.psychological_outcome}

Current draft body (narrative only, no title line):
${safeText(currentDraft.body, 12000)}

Current title: ${safeText(currentDraft.title, 200)}
Current reflection question: ${safeText(currentDraft.reflection_question, 400)}

Owner instruction:
${inst.slice(0, 6000)}
${trainingBlock}${overlapBlock}

Output JSON only:
{
  "title": "string",
  "slug_suffix": "kebab-case fragment or empty to keep tone-derived",
  "body": "revised narrative only — same voice rules as Rapid Write",
  "reflection_question": "one specific question"
}

Rules: AO Living Voice. No emojis. No section labels in body. The Related (corpus) links will be re-appended by the system — do not include them in body.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: REVISE_MODEL(),
        temperature: 0.35,
        max_tokens: 1400,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You revise Rapid Write drafts for Archetype Original. JSON only.',
          },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) return { ok: false, error: 'Revision request failed' };
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    const parsed = JSON.parse(content);
    const seriesSlugPrefix = 'psychological-cost';
    const slugSuffix = safeText(parsed.slug_suffix, 80);
    const baseSlug = safeText(currentDraft.slug, 240) || `${seriesSlugPrefix}-draft`;
    const slug =
      slugSuffix && slugSuffix.length > 1
        ? `${seriesSlugPrefix}-${slugSuffix.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').toLowerCase()}`
        : baseSlug;

    const title = safeText(parsed.title, 200) || safeText(currentDraft.title, 200);
    const body = safeText(parsed.body, 12000);
    const reflection_question = safeText(parsed.reflection_question, 400) || safeText(currentDraft.reflection_question, 400);
    if (!body) return { ok: false, error: 'Revision produced empty body.' };

    const markdown = buildRapidWriteMarkdownFromParts(title, body, reflection_question, relatedPreserved);

    return {
      ok: true,
      title,
      slug,
      tags: [seed.leadership_category, seed.psychological_outcome],
      body,
      reflection_question,
      markdown,
      seed_id: seed.id,
    };
  } catch (e) {
    return { ok: false, error: e.message || 'Revision failed' };
  }
}
