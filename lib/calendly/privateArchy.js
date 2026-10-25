/**
 * A private Archy for each client who said yes.
 *
 * What the client agreed to, word for word (CONSENT_TEXT.archy, 2026-10-23):
 *   "A private Archy for you. Archy is the AI trained on my writing. With your
 *    OK, your Archy can also use our conversations, so you can ask it
 *    questions between sessions. Only you can see it, and I can review what it
 *    tells you."
 *
 * So Archy gets Bart's published writing and what was said in their
 * conversations together: the key points, both sides' action items, the
 * thank-you Bart sent, and the client's own Before we talk answers. It never
 * gets Bart's private notes: not the summary marked "just for you", not the
 * thread, not his read on how they take advice. Nothing here touches the
 * public corpus or public Archy.
 *
 * When a question needs Bart himself, Archy hands it to him. Bart,
 * 2026-10-24, on how fast he answers: "Ongoing within a day, a season within
 * two days, rising leaders within five days." Everything Archy says is kept
 * so Bart can review it in Auto.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';
import { getClientRecord, upsertClientRecord, consentOf, normEmail, addEvent } from './clientRecords.js';
import { searchCorpusChunks } from '../ao/corpusChunks.js';
import { archyComplete } from '../ao/archyModel.js';
import { stripProseDashes, ARCHY_DASH_RULE } from '../ao/archyVoice.js';
import { tierOf } from './intelligence.js';

const SITE = process.env.SITE_BASE_URL || 'https://www.archetypeoriginal.com';
const DAY = 24 * 60 * 60 * 1000;

/** Bart's answer windows by tier. Anyone not on a tier yet gets the season window. */
export const ANSWER_DAYS = { ongoing: 1, season: 2, rising: 5 };
export function answerDays(tier) {
  return ANSWER_DAYS[tier] || ANSWER_DAYS.season;
}
export function answerWindowLabel(tier) {
  const d = answerDays(tier);
  return d === 1 ? 'within a day' : `within ${d === 2 ? 'two' : d === 5 ? 'five' : d} days`;
}

// ---------------------------------------------------------------- the private link

function linkKey() {
  return String(process.env.CALENDLY_WEBHOOK_SIGNING_KEY || process.env.CRON_SECRET || '').trim();
}

/** Signed per person and per version, so Bart can turn a link off by issuing a new one. */
export function signArchy(email, version = 1, key = linkKey()) {
  return createHmac('sha256', key).update(`archy:${normEmail(email)}:${version}`).digest('hex').slice(0, 32);
}

export function verifyArchy(email, sig, version = 1, key = linkKey()) {
  if (!key || !email || !sig) return false;
  const a = Buffer.from(signArchy(email, version, key));
  const b = Buffer.from(String(sig));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function archyUrl(email, version = 1) {
  return `${SITE}/archy/you?e=${encodeURIComponent(normEmail(email))}&s=${signArchy(email, version)}`;
}

/** Who this link belongs to, if it is valid and they still say yes to a private Archy. */
export async function openArchy(email, sig) {
  const e = normEmail(email);
  const record = await getClientRecord(e).catch(() => null);
  if (!record) return { ok: false, status: 404 };
  const version = Number(record.archy?.link_version) || 1;
  if (!verifyArchy(e, sig, version)) return { ok: false, status: 401 };
  if (consentOf(record, 'archy') !== 'yes') return { ok: false, status: 403, error: 'Your private Archy is turned off.' };
  return { ok: true, email: e, record };
}

// ---------------------------------------------------------------- what Archy knows

async function bookings(email) {
  const { data } = await supabaseAdmin.from('engagement_inquiries').select('id, name, answers').ilike('email', email);
  return (data || []).sort((a, b) => Date.parse(a.answers?.scheduled_for || 0) - Date.parse(b.answers?.scheduled_for || 0));
}

/** Pure: the shared record of their conversations, never Bart's private notes. */
export function sharedContext(rows, record) {
  const convo = (rows || [])
    .filter((r) => r.answers?.transcript_analysis || r.answers?.thank_you_text)
    .map((r, i) => {
      const a = r.answers;
      const an = a.transcript_analysis || {};
      const when = a.scheduled_for ? String(a.scheduled_for).slice(0, 10) : 'date unknown';
      return [
        `Conversation ${i + 1} (${when})`,
        an.key_points?.length ? `What came up: ${an.key_points.join(' | ')}` : null,
        an.action_items?.theirs?.length ? `What they said they would do: ${an.action_items.theirs.join(' | ')}` : null,
        an.action_items?.bart?.length ? `What Bart said he would do: ${an.action_items.bart.join(' | ')}` : null,
        a.thank_you_text ? `The note Bart sent them afterward:\n${a.thank_you_text}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
  const prep = record?.prep || {};
  const own = [
    prep.worth_it ? `What would make this worth it, in their words: ${prep.worth_it}` : null,
    prep.how_you_work ? `How they like to work: ${prep.how_you_work}` : null,
    prep.anything_else ? `Anything else they wanted Bart to know: ${prep.anything_else}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  return { conversations: convo, own };
}

export function privateSystemPrompt({ name, tier, conversations, own, passages }) {
  const first = String(name || '').trim().split(/\s+/)[0] || 'them';
  return `You are Archy, the AI trained on Bart Paden's writing, in a private space for ${name}, someone Bart advises. Only ${first} and Bart can see this conversation. Bart reviews what you say.

${ARCHY_DASH_RULE}

How to help:
- Help ${first} think between sessions with Bart: apply what they worked through together and Bart's published thinking to what they bring you.
- Ground what you say in the passages from Bart's writing below and in their conversations with Bart. Do not invent things Bart said.
- Hold them to what they said they would do, warmly and plainly, the way Bart would. Ask how it is going when it fits.
- Speak as Archy, not as Bart. When you refer to what Bart said, say "Bart".
- Be direct and human. No hype, no flattery. Short answers unless they want more.

When to hand it to Bart: if they ask for Bart himself, if it is a real decision about their situation that Bart should weigh in on, or if it is beyond what you can responsibly answer (legal, medical, financial specifics, a serious conflict with someone), answer what you can, tell them you are passing it to Bart, and end your reply with one last line exactly like this:
[[HANDOFF: one short sentence for Bart on what they need]]
Bart answers ${answerWindowLabel(tier)}. Do not promise anything faster.

If they say anything that suggests they may harm themselves or someone else, or are in danger, tell them clearly to call or text 988 (the Suicide and Crisis Lifeline in the US) or 911 now, and hand it to Bart.

Their conversations with Bart:
${conversations || 'None on record yet.'}

${own ? `In their own words, from before their first conversation:\n${own}\n` : ''}
Passages from Bart's writing that bear on this:
${passages || 'None found for this question.'}`;
}

/** Pure: the reply without the hand-off line, and the hand-off reason if there was one. */
export function splitHandoff(text) {
  const m = String(text || '').match(/\n?\s*\[\[HANDOFF:\s*([^\]]+)\]\]\s*$/);
  if (!m) return { reply: String(text || '').trim(), handoff: null };
  return { reply: String(text).slice(0, m.index).trim(), handoff: m[1].trim() };
}

export async function history(email, limit = 200) {
  const { data, error } = await supabaseAdmin
    .from('ao_client_archy')
    .select('id, role, content, handoff_reason, handoff_status, answer_by, answered_at, at')
    .eq('client_email', normEmail(email))
    .order('at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * One turn: their message in, Archy's answer out, both kept.
 * @returns {{ ok, reply, handoff, answer_by }}
 */
export async function askArchy(email, message, { record = null } = {}) {
  const e = normEmail(email);
  const text = String(message || '').trim().slice(0, 4000);
  if (!text) return { ok: false, error: 'empty' };
  const rec = record || (await getClientRecord(e));
  const rows = await bookings(e);
  const name = rec?.name || rows[rows.length - 1]?.name || e;
  const tier = tierOf({ record: rec, stage: rec?.stage });
  const { conversations, own } = sharedContext(rows, rec);
  const hits = await searchCorpusChunks(text, { maxResults: 8 });
  const passages = hits.map((h) => `From "${h.title}":\n${String(h.content || '').slice(0, 1600)}`).join('\n\n');
  const past = (await history(e, 40)).filter((m) => m.role !== 'bart').slice(-20).map((m) => ({ role: m.role, content: m.content }));

  const out = await archyComplete({
    system: privateSystemPrompt({ name, tier, conversations, own, passages }),
    history: past,
    message: text,
    maxTokens: 1500,
  });
  if (!out.ok || !out.text) return { ok: false, error: 'Archy could not answer just now. Try again in a minute.' };

  const { reply, handoff } = splitHandoff(stripProseDashes(out.text));
  const now = Date.now();
  const answerBy = handoff ? new Date(now + answerDays(tier) * DAY).toISOString() : null;
  const { error } = await supabaseAdmin.from('ao_client_archy').insert([
    { client_email: e, role: 'user', content: text, at: new Date(now).toISOString() },
    {
      client_email: e,
      role: 'assistant',
      content: reply,
      handoff_reason: handoff,
      handoff_status: handoff ? 'waiting' : null,
      answer_by: answerBy,
      at: new Date(now + 1).toISOString(),
    },
  ]);
  if (error) throw new Error(error.message);

  // One timeline entry a day is enough to show they are using it, and it counts as contact.
  const today = new Date(now).toISOString().slice(0, 10);
  if (rec?.archy?.last_logged !== today) {
    await addEvent({ email: e, kind: 'archy_message', subject: 'Used their private Archy' });
    await upsertClientRecord(e, { archy: { ...(rec?.archy || {}), last_logged: today } });
  }
  return { ok: true, reply, handoff, answer_by: answerBy, name, tier };
}

/** Every hand-off still waiting on Bart, across everyone. */
export async function waitingHandoffs() {
  const { data, error } = await supabaseAdmin
    .from('ao_client_archy')
    .select('id, client_email, handoff_reason, answer_by, at')
    .eq('handoff_status', 'waiting')
    .order('answer_by', { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  return data || [];
}

/** Bart's answer: kept in their Archy, and the hand-off closed. Sending the email is the caller's job. */
export async function recordBartAnswer(email, handoffId, text) {
  const e = normEmail(email);
  const now = new Date().toISOString();
  const { error: e1 } = await supabaseAdmin
    .from('ao_client_archy')
    .update({ handoff_status: 'answered', answered_at: now })
    .eq('id', handoffId)
    .eq('client_email', e);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabaseAdmin.from('ao_client_archy').insert({ client_email: e, role: 'bart', content: String(text).trim(), at: now });
  if (e2) throw new Error(e2.message);
}

/** A new link; the old one stops working. */
export async function newArchyLink(email) {
  const e = normEmail(email);
  const rec = await getClientRecord(e);
  const version = (Number(rec?.archy?.link_version) || 1) + (rec?.archy?.link_sent_at ? 1 : 0);
  await upsertClientRecord(e, { archy: { ...(rec?.archy || {}), link_version: version, link_sent_at: new Date().toISOString() } });
  return archyUrl(e, version);
}
