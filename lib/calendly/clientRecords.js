/**
 * One record per client, and the timeline of everything that happened with them.
 *
 * Bart, 2026-10-23: "So the CRM lives inside Auto." A booking
 * (engagement_inquiries) is one conversation; ao_clients is the person across
 * all of them, keyed by email; ao_client_events is their timeline (form sent,
 * form returned, transcript added, thank-you sent, check-ins, replies).
 *
 * All three tables are server-only (row level security on, no public grants).
 * Conversations and transcripts never go anywhere public.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';

const SITE = process.env.SITE_URL || 'https://www.archetypeoriginal.com';

export function normEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * The exact permission wording a client agreed to, stored with each answer so
 * there is never a question later about what they said yes to.
 * Bart-approved 2026-10-23.
 */
export const CONSENT_TEXT = Object.freeze({
  record:
    'Recording our conversations. I record so I can listen to you instead of taking notes. Recordings stay private and are never made public.',
  archy:
    'A private Archy for you. Archy is the AI trained on my writing. With your OK, your Archy can also use our conversations, so you can ask it questions between sessions. Only you can see it, and I can review what it tells you.',
  checkins: 'Check-ins by email after we talk, based on what we discussed.',
});

// ---------------------------------------------------------------- signed links

function linkKey() {
  return String(process.env.CALENDLY_WEBHOOK_SIGNING_KEY || process.env.CRON_SECRET || '').trim();
}

export function signPrep(inquiryId, key = linkKey()) {
  return createHmac('sha256', key).update(`prep:${inquiryId}`).digest('hex').slice(0, 32);
}

export function verifyPrep(inquiryId, sig, key = linkKey()) {
  if (!key || !inquiryId || !sig) return false;
  const a = Buffer.from(signPrep(inquiryId, key));
  const b = Buffer.from(String(sig));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The Before we talk page for one booking; also the "change what you are comfortable with" link. */
export function prepUrl(inquiryId) {
  return `${SITE}/before-we-talk?b=${encodeURIComponent(inquiryId)}&s=${signPrep(inquiryId)}`;
}

// ---------------------------------------------------------------- records

export async function getClientRecord(email) {
  const { data, error } = await supabaseAdmin.from('ao_clients').select('*').eq('email', normEmail(email)).maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

export async function upsertClientRecord(email, fields = {}) {
  const row = { email: normEmail(email), ...fields, updated_at: new Date().toISOString() };
  const { data, error } = await supabaseAdmin.from('ao_clients').upsert(row, { onConflict: 'email' }).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listClientRecords() {
  const { data, error } = await supabaseAdmin.from('ao_clients').select('*').limit(1000);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addEvent({ email, inquiryId = null, kind, subject = null, body = null, meta = {}, at = null }) {
  const { error } = await supabaseAdmin.from('ao_client_events').insert({
    client_email: normEmail(email),
    inquiry_id: inquiryId,
    kind,
    subject,
    body,
    meta,
    ...(at ? { at } : {}),
  });
  if (error) console.error('[clientRecords] event not saved:', error.message);
  return { ok: !error, error: error?.message || null };
}

/**
 * A conversation Bart had somewhere the CRM cannot see: Messenger, a text, a
 * call, in person (2026-10-28: "there is no way for me to manually add a
 * conversation to the CRM for a person. For example, I messaged Keri in
 * Facebook Messenger today asking about setting up her episode.").
 */
export const CONVERSATION_CHANNELS = Object.freeze({
  messenger: 'Facebook Messenger',
  text: 'Text',
  phone: 'Phone call',
  in_person: 'In person',
  linkedin: 'LinkedIn message',
  instagram: 'Instagram message',
  email: 'Email',
  other: 'Other',
});

/** Pure: a clean conversation entry, or the reason it cannot be saved. */
export function conversationEntry({ channel, note, when = null }, now = Date.now()) {
  const ch = CONVERSATION_CHANNELS[channel] ? channel : 'other';
  const text = String(note || '').trim().slice(0, 8000);
  if (!text) return { ok: false, error: 'Say a few words about the conversation.' };
  let at = null;
  if (when) {
    const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(when) ? `${when}T12:00:00-06:00` : when);
    if (!Number.isFinite(t)) return { ok: false, error: 'That date did not read right.' };
    if (t > now + 3600000) return { ok: false, error: 'A logged conversation has already happened, so the date cannot be in the future.' };
    at = new Date(t).toISOString();
  }
  return { ok: true, channel: ch, label: CONVERSATION_CHANNELS[ch], note: text, at };
}

export async function logConversation({ email, channel, note, when = null, by = 'bart' }) {
  const entry = conversationEntry({ channel, note, when });
  if (!entry.ok) return entry;
  const saved = await addEvent({ email, kind: 'conversation', subject: entry.label, body: entry.note, meta: { channel: entry.channel, by }, at: entry.at });
  return saved.ok ? { ok: true, channel: entry.label } : saved;
}

export async function listEvents(email) {
  const { data, error } = await supabaseAdmin
    .from('ao_client_events')
    .select('id, inquiry_id, kind, subject, body, meta, at')
    .eq('client_email', normEmail(email))
    .order('at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data || [];
}

/** What a client has agreed to: 'yes', 'no', or null when they have not said. */
export function consentOf(record, key) {
  const v = record?.consent?.[key]?.answer;
  return v === 'yes' || v === 'no' ? v : null;
}
