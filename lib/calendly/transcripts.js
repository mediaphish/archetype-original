/**
 * From a conversation transcript to the follow-up.
 *
 * Bart, 2026-10-23:
 *   "1. I upload the transcript
 *    2. AI processes it and then cues up a relevant thank you message. Include
 *       some key points from the conversation, especially action items.
 *    3. Once I approve it, then it sends the message. And it would mark the
 *       session complete."
 * And for the check-ins: "Not sales, but check ins based on our conversations."
 *
 * One Claude pass reads the transcript and returns a private summary for Bart,
 * the action items (theirs and his), a thank-you that names a few real points,
 * and a short check-in plan where every touch has a reason from the
 * conversation. Nothing here sends anything; Bart approves each message in Auto.
 *
 * The transcript stays in ao_client_transcripts (server-only). It is never added
 * to the public corpus, Archy's public index, or anything that trains on content.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { completeJson } from '../ao/textModel.js';
import { AO_VOICE_MANIFESTO } from '../ao/voiceManifesto.js';
import { detectVoiceViolations } from '../ao/voiceGuardrails.js';
import { firstName } from './followups.js';

/** Long enough for a ninety-minute call several times over. */
export const MAX_TRANSCRIPT_CHARS = 400000;

/** WebVTT and SRT carry timestamps and cue numbers; the words are what matter. */
export function cleanTranscript(raw) {
  return String(raw || '')
    .replace(/^﻿/, '')
    .replace(/^WEBVTT.*$/m, '')
    .replace(/^\d+\s*$/gm, '')
    .replace(/^\d{1,2}:\d{2}(:\d{2})?[.,]\d{3}\s*-->\s*\d{1,2}:\d{2}(:\d{2})?[.,]\d{3}.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TRANSCRIPT_CHARS);
}

export function analysisPrompt(row, transcript) {
  const first = firstName(row.name);
  return `This is the transcript of a conversation between Bart Paden and ${row.name}. Bart is a business owner and leadership advisor. Read all of it.

Return JSON with exactly these fields:
{
  "summary": "For Bart only. Six to ten sentences: who they are, what they are carrying at work and at home, what Bart offered, how they received it, and what changed by the end.",
  "key_points": ["Three to five specific things that came up, in plain words."],
  "action_items": { "theirs": ["What ${first} said they would do, with any date they named."], "bart": ["What Bart said he would do or send."] },
  "next_time": ["Two or three things worth asking about next time."],
  "thank_you": "The thank-you email body. Rules below.",
  "checkins": [ { "days_after": 7, "reason": "Why this touch, tied to something they said.", "text": "The email body." } ]
}

Thank-you rules (Bart, 2026-10-24: "I need depth. I'm not a superficial guy at all and my clients know that." Pulling out one fact and saying good job is not acceptable):
- From Bart to ${first}. Start with "Hi ${first}," and end with "Bart" on its own line.
- One plain line of thanks. No praise for being honest, brave, open or vulnerable. No "atta boy" of any kind.
- Then the substance: what you actually worked through together, in paragraphs, in ${first}'s own language. The situation as they described it, what Bart offered and why, the moments that shifted something. If something personal shaped the conversation (family, health, a hard season at home), name it with care, because it matters to the whole picture, and write it so it would still be fine if the email were forwarded.
- Then the action items as a short plain list, ${first}'s first with any dates they named, then anything Bart said he would do.
- 250 to 450 words. Depth over polish. Complete sentences.
- No selling, no prices, no offers. No em dashes. No exclamation marks. Never write "journey", "space", "unpack", "sit with", or "resonate".

Check-in rules:
- Two to four touches over the next six weeks. Fewer is better than filler.
- Every one must point at something specific they said: an action item, a decision date, a worry they named, or a piece of Bart's writing that speaks to it.
- The last one is a clean close: no reply needed, the door is open.
- Each under 90 words, same voice rules, start with "Hi ${first}," and end with "Bart".
- If an action item has a date, time the check-in for just after it.

Only use what is in the transcript. Do not invent anything that was not said.

TRANSCRIPT
${transcript}`;
}

function clean(text) {
  return String(text || '').replace(/—/g, ',').trim();
}

/** Keep only well-formed check-ins, in date order, capped at four. */
export function normalizeAnalysis(raw) {
  const a = raw && typeof raw === 'object' ? raw : {};
  const list = (v) => (Array.isArray(v) ? v.map((x) => clean(x)).filter(Boolean) : []);
  const checkins = (Array.isArray(a.checkins) ? a.checkins : [])
    .map((c) => ({
      days_after: Math.max(1, Math.min(60, Math.round(Number(c?.days_after) || 0))),
      reason: clean(c?.reason),
      text: clean(c?.text),
    }))
    .filter((c) => c.days_after && c.text && detectVoiceViolations(c.text).length === 0)
    .sort((x, y) => x.days_after - y.days_after)
    .slice(0, 4);
  return {
    summary: clean(a.summary),
    key_points: list(a.key_points),
    action_items: { theirs: list(a.action_items?.theirs), bart: list(a.action_items?.bart) },
    next_time: list(a.next_time),
    thank_you: clean(a.thank_you),
    checkins,
  };
}

/** Check-in plan items as stored on the booking: dated, each waiting for Bart's approval. */
export function planFrom(analysis, callStartIso) {
  const base = Date.parse(callStartIso || '') || Date.now();
  return analysis.checkins.map((c, i) => ({
    id: `c${i + 1}`,
    send_at: new Date(base + c.days_after * 24 * 60 * 60 * 1000).toISOString(),
    reason: c.reason,
    subject: i === analysis.checkins.length - 1 ? 'Checking in' : 'Following up',
    text: c.text,
    status: 'draft',
  }));
}

export async function analyzeTranscript(row, transcript) {
  const raw = await completeJson({
    prompt: analysisPrompt(row, transcript),
    system: ['You help Bart Paden follow up after conversations, in his voice.', ...AO_VOICE_MANIFESTO].join('\n'),
    task: 'voice',
    maxTokens: 8000,
  });
  if (!raw) return { ok: false, error: 'The transcript could not be read this time. Try again in a minute.' };
  const analysis = normalizeAnalysis(raw);
  if (!analysis.thank_you) return { ok: false, error: 'No thank-you came back. Try again in a minute.' };
  return { ok: true, analysis };
}

export async function saveTranscript(row, transcript, analysis) {
  const { error } = await supabaseAdmin.from('ao_client_transcripts').insert({
    inquiry_id: row.id,
    client_email: String(row.email || '').toLowerCase(),
    transcript,
    analysis,
  });
  if (error) throw new Error(error.message);
}
