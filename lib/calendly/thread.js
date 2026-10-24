/**
 * The thread: Auto's running, private read on each person, rebuilt after every
 * conversation. And the web watch: a monthly look for real news about them.
 *
 * Bart, 2026-10-24: "These conversations are historical record, but they also
 * will be fully connected. There will be a thread. Who this person is. How
 * they handle things I say. Are they holding themselves accountable? Are they
 * listening to me? Am I giving them good advice. There are 2 sides to every
 * transcript."
 * And: "Make sure their bio information gives me ways to add or have Auto add
 * personal details about them that we pick up from conversations. Birthdays,
 * anniversaries, big decisions made even personally."
 *
 * Personal details Auto finds arrive as suggestions; nothing is added to the
 * person's profile until Bart confirms it. All of this is private to Bart.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../supabase-admin.js';
import { completeJson } from '../ao/textModel.js';
import { upsertClientRecord, getClientRecord, normEmail } from './clientRecords.js';
import { emailDomain } from './researchBrief.js';

const LATEST_TRANSCRIPT_CHARS = 120000;
const DETAIL_KINDS = new Set(['birthday', 'anniversary', 'family', 'decision', 'milestone', 'health', 'interest', 'other']);

export async function transcriptsFor(email) {
  const { data, error } = await supabaseAdmin
    .from('ao_client_transcripts')
    .select('id, inquiry_id, transcript, analysis, created_at')
    .eq('client_email', normEmail(email))
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) throw new Error(error.message);
  return data || [];
}

export function threadPrompt(name, previous, transcripts) {
  const history = transcripts
    .slice(0, -1)
    .map((t, i) => {
      const a = t.analysis || {};
      return `Conversation ${i + 1} (${String(t.created_at).slice(0, 10)})
Summary: ${a.summary || ''}
Their action items: ${(a.action_items?.theirs || []).join(' | ') || 'none'}
Bart's action items: ${(a.action_items?.bart || []).join(' | ') || 'none'}`;
    })
    .join('\n\n');
  const latest = transcripts[transcripts.length - 1];
  return `You keep Bart Paden's private, running read on ${name}, someone he advises. Bart is a business owner and leadership advisor with 34 years of building companies. Be honest with him, including about his own advice.

${previous?.who_they_are ? `Your read before this conversation:\n${JSON.stringify(previous)}\n` : ''}
${history ? `Earlier conversations:\n${history}\n` : ''}
The latest conversation (${String(latest.created_at).slice(0, 10)}), full transcript:
${String(latest.transcript).slice(0, LATEST_TRANSCRIPT_CHARS)}

Return JSON with exactly these fields:
{
  "who_they_are": "Four to six sentences. Their work, their life outside work as far as they have shared it, what drives them, what weighs on them.",
  "how_they_take_advice": "Two to four sentences. How they receive what Bart says: do they push back, agree too fast, go quiet, test it, act on it.",
  "follow_through": {
    "assessment": "One or two sentences on whether they are holding themselves accountable.",
    "items": [ { "item": "Something they committed to in an earlier conversation", "status": "done | partly | not_done | unknown", "evidence": "What in the latest conversation shows it" } ]
  },
  "momentum": { "direction": "improving | steady | slipping | unknown", "reason": "One sentence." },
  "patterns": ["Patterns across conversations worth Bart knowing, two to four."],
  "coaching_reflection": {
    "what_landed": "Which of Bart's advice is working, and how you can tell.",
    "where_it_may_have_missed": "Where Bart's advice may not fit them, or what he may be missing. Be direct.",
    "next_time": "What Bart might do differently or ask next time."
  },
  "life_details": [ { "kind": "birthday | anniversary | family | decision | milestone | health | interest | other", "label": "Short, e.g. 'Wife Sarah, recently had their second child'", "date": "YYYY-MM-DD or MM-DD only if a date was actually stated, else empty", "note": "Why it matters to the relationship" } ],
  "open_questions": ["Things Bart does not know yet and might gently learn."]
}

Rules:
- Only use what was actually said. Do not invent dates, names or events.
- follow_through items come from earlier conversations' commitments. If this is the first conversation, return an empty items list and say so in the assessment.
- life_details are about their life, not their business: family and relationships, health, birthdays, anniversaries, personal milestones, and big personal decisions (including career decisions that are personal, like leaving a job or selling the company). Never operational facts about their work (who manages what, schedules, numbers, locations). If nothing personal came up, return an empty list. Handle health and family matters with discretion and respect.
- No em dashes.`;
}

function clean(v) {
  return String(v ?? '').replace(/—/g, ',').trim();
}

export function normalizeThread(raw) {
  const a = raw && typeof raw === 'object' ? raw : {};
  const list = (v) => (Array.isArray(v) ? v.map(clean).filter(Boolean) : []);
  return {
    who_they_are: clean(a.who_they_are),
    how_they_take_advice: clean(a.how_they_take_advice),
    follow_through: {
      assessment: clean(a.follow_through?.assessment),
      items: (Array.isArray(a.follow_through?.items) ? a.follow_through.items : [])
        .map((x) => ({
          item: clean(x?.item),
          status: ['done', 'partly', 'not_done', 'unknown'].includes(x?.status) ? x.status : 'unknown',
          evidence: clean(x?.evidence),
        }))
        .filter((x) => x.item),
    },
    momentum: {
      direction: ['improving', 'steady', 'slipping', 'unknown'].includes(a.momentum?.direction) ? a.momentum.direction : 'unknown',
      reason: clean(a.momentum?.reason),
    },
    patterns: list(a.patterns),
    coaching_reflection: {
      what_landed: clean(a.coaching_reflection?.what_landed),
      where_it_may_have_missed: clean(a.coaching_reflection?.where_it_may_have_missed),
      next_time: clean(a.coaching_reflection?.next_time),
    },
    life_details: (Array.isArray(a.life_details) ? a.life_details : [])
      .map((d) => ({
        kind: DETAIL_KINDS.has(d?.kind) ? d.kind : 'other',
        label: clean(d?.label),
        date: /^(\d{4}-)?\d{2}-\d{2}$/.test(String(d?.date || '')) ? String(d.date) : '',
        note: clean(d?.note),
      }))
      .filter((d) => d.label),
    open_questions: list(a.open_questions),
  };
}

/** Add Auto's finds as suggestions, skipping anything already on the profile. */
export function mergeSuggestedDetails(existing, found, now = new Date().toISOString()) {
  const have = new Set((existing || []).map((d) => clean(d.label).toLowerCase()));
  const added = found
    .filter((d) => !have.has(d.label.toLowerCase()))
    .map((d, i) => ({ id: `s${Date.parse(now)}${i}`, ...d, source: 'conversation', status: 'suggested', added_at: now }));
  return [...(existing || []), ...added];
}

export async function updateThread(email) {
  const transcripts = await transcriptsFor(email);
  if (!transcripts.length) return { ok: false, error: 'no transcripts' };
  const record = await getClientRecord(email);
  const name = record?.name || email;
  const raw = await completeJson({
    prompt: threadPrompt(name, record?.thread, transcripts),
    system: 'You are a careful, candid assistant to a leadership advisor. Private notes only.',
    task: 'draft',
    maxTokens: 6000,
  });
  if (!raw) return { ok: false, error: 'The thread could not be updated this time.' };
  const thread = { ...normalizeThread(raw), updated_at: new Date().toISOString(), conversations: transcripts.length };
  const details = mergeSuggestedDetails(record?.details || [], thread.life_details);
  delete thread.life_details;
  await upsertClientRecord(email, { thread, details });
  return { ok: true, thread };
}

export function threadIsStale(record, latestTranscriptAt) {
  if (!latestTranscriptAt) return false;
  const updated = Date.parse(record?.thread?.updated_at || '');
  return !Number.isFinite(updated) || updated < Date.parse(latestTranscriptAt);
}

// ---------------------------------------------------------------- web watch

export function webWatchPrompt(person, sinceIso) {
  const domain = emailDomain(person.email);
  return `Check for real news about ${person.name}${person.company ? `, of ${person.company}` : ''}${domain ? ` (company domain ${domain})` : ''}, since ${String(sinceIso).slice(0, 10)}. Bart Paden advises them and wants to know what is going on in their professional world between conversations.

Only report notable, public, professional or company events: a new role, a launch, an expansion or closing, funding or acquisition, layoffs, press coverage, awards, a public talk or article, regulatory or legal news about the company. Nothing about family, health, home or personal finances. Many people share names: only report something if you are confident it is this person or their company, and say why.

Return JSON: { "found": true or false, "items": [ { "headline": "...", "date": "YYYY-MM-DD if known", "why_it_matters": "One sentence for Bart.", "url": "source" } ] }
If nothing notable, return { "found": false, "items": [] }. No em dashes.`;
}

export async function runWebWatch(person, { client = null } = {}) {
  if (!process.env.ANTHROPIC_API_KEY && !client) return { ok: false, error: 'not configured' };
  const anthropic = client || new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const since = person.web_watch?.checked_at || new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
  try {
    const response = await anthropic.messages.create({
      model: process.env.AUTO_ANTHROPIC_MODEL || 'claude-opus-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: webWatchPrompt(person, since) }],
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 4 }],
    });
    const text = (response.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const m = text.match(/\{[\s\S]*\}/);
    let parsed = { found: false, items: [] };
    try {
      parsed = m ? JSON.parse(m[0]) : parsed;
    } catch {
      /* keep empty */
    }
    const items = (Array.isArray(parsed.items) ? parsed.items : [])
      .map((x) => ({ headline: clean(x.headline), date: clean(x.date), why_it_matters: clean(x.why_it_matters), url: clean(x.url) }))
      .filter((x) => x.headline);
    const prior = Array.isArray(person.web_watch?.items) ? person.web_watch.items : [];
    const fresh = items.filter((x) => !prior.some((p) => p.headline === x.headline));
    const web_watch = {
      checked_at: new Date().toISOString(),
      items: [...fresh.map((x) => ({ ...x, found_at: new Date().toISOString() })), ...prior].slice(0, 30),
      unseen: fresh.length > 0 || Boolean(person.web_watch?.unseen),
    };
    await upsertClientRecord(person.email, { web_watch });
    return { ok: true, fresh, web_watch };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}
