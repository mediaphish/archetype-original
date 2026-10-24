/**
 * What happens around a booked conversation, so Bart does not have to chase it.
 *
 * Bart, 2026-10-22: "Make sure you are building all the automations for follow
 * up as well." Three pieces, all driven by the bookings the Calendly webhook
 * saves to engagement_inquiries (lib/calendly/bookingRecord.js):
 *
 *   1. Brief. As soon as someone books, a researched brief on the person and
 *      their organization (lib/calendly/researchBrief.js) is ready in Auto
 *      next to what they wrote.
 *   2. After the call, a thank-you drafted in his voice waits in Auto to edit
 *      and send, or, if they never showed, a short re-invite instead.
 *   Since 2026-10-23 all of it lives in Auto > Clients (api/ao/clients.js);
 *   email is a one-line heads-up linking there.
 *   3. Nothing reaches the client unless Bart presses send. His rule: show the
 *      wording and wait for his OK.
 *
 * State lives on the inquiry row's answers (brief_sent_at, followup_drafted_at,
 * thank_you_sent_at, reinvite_sent_at), so every run is safe to repeat.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { Resend } from 'resend';
import { supabaseAdmin } from '../supabase-admin.js';
import { contactFormRecipient } from '../contact-form-inbox.js';
import { completeText } from '../ao/textModel.js';
import { AO_VOICE_MANIFESTO } from '../ao/voiceManifesto.js';
import { detectVoiceViolations } from '../ao/voiceGuardrails.js';
import { TIMEZONE } from './conversationHours.js';
import { researchBooking } from './researchBrief.js';
import { prepUrl, addEvent, getClientRecord, consentOf } from './clientRecords.js';
import { letterHtml, noticeHtml } from './emailLayout.js';

const SITE = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
/** Same page as src/lib/booking.js; kept here so server code does not reach into src/. */
const CALENDLY_CONVERSATION_URL =
  process.env.CALENDLY_SCHEDULING_URL || 'https://calendly.com/bartpaden/a-conversation-with-bart';
const HOUR = 60 * 60 * 1000;

/** The after-call note to Bart waits until the call should be over. */
export const AFTER_CALL_MS = 2 * HOUR;
/** Past this, a missed after-call note is stale and is not sent. */
const AFTER_CALL_GIVE_UP_MS = 4 * 24 * HOUR;

export function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'there';
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function whenText(iso) {
  if (!iso) return 'time not set';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));
}

// ---------------------------------------------------------------- signed links

function linkKey() {
  return String(process.env.CALENDLY_WEBHOOK_SIGNING_KEY || process.env.CRON_SECRET || '').trim();
}

export function signAction(id, action, key = linkKey()) {
  return createHmac('sha256', key).update(`${id}:${action}`).digest('hex');
}

export function verifyAction(id, action, sig, key = linkKey()) {
  if (!key || !id || !sig) return false;
  const a = Buffer.from(signAction(id, action, key));
  const b = Buffer.from(String(sig));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function actionUrl(id, action) {
  return `${SITE}/api/calendly/followup?id=${encodeURIComponent(id)}&action=${action}&sig=${signAction(id, action)}`;
}

// ---------------------------------------------------------------- wording

/** Fixed re-invite, for when someone did not show (wording shown to Bart before use). */
export function reinviteEmail(row) {
  const first = firstName(row.name);
  return {
    cta: { label: 'Pick a new time', url: CALENDLY_CONVERSATION_URL },
    subject: 'Sorry we missed each other',
    text: [
      `Hi ${first},`,
      '',
      'It looks like we missed each other. No problem at all. Things come up.',
      '',
      `If you still want to talk, you can pick a new time here: ${CALENDLY_CONVERSATION_URL}`,
      '',
      'Bart',
    ].join('\n'),
  };
}

/** Sent automatically right after each booking (wording Bart-approved 2026-10-23). */
export function prepEmail(row) {
  const first = firstName(row.name);
  const url = prepUrl(row.id);
  return {
    cta: { label: 'Fill out Before we talk', url },
    subject: 'Before we talk',
    text: [
      `Hi ${first},`,
      '',
      "Thank you for booking a conversation. I'm looking forward to it.",
      '',
      `Before we meet, there's a short form here: ${url}. It takes about five minutes, and you only fill it out once. It helps me come prepared and tells me what you're comfortable with, including whether it's OK to record.`,
      '',
      `See you ${whenText(row.answers?.scheduled_for)}.`,
      '',
      'Bart',
    ].join('\n'),
  };
}

/** Used when the drafting model is unavailable or its draft fails the voice check. */
export function fallbackThankYou(row) {
  const first = firstName(row.name);
  return [
    `Hi ${first},`,
    '',
    'Thank you for the time today. I enjoyed the conversation.',
    '',
    'If anything we talked about keeps working on you, reply to this email. I read every one myself.',
    '',
    'Bart',
  ].join('\n');
}

export function thankYouPrompt(row) {
  const a = row.answers || {};
  return [
    `Write a short thank-you email from Bart Paden to ${row.name || 'the person'} after a free first conversation (up to ninety minutes).`,
    '',
    'What they wrote when they booked (use it only to make the note feel personal; you do not know what was said in the call):',
    `- What led them to reach out: ${a.reach_out_now || 'not given'}`,
    `- Clarity they were looking for: ${a.clarity_sought || 'not given'}`,
    `- Role: ${row.role || 'not given'}`,
    '',
    'Rules:',
    `- Start with "Hi ${firstName(row.name)}," and end with "Bart" on its own line.`,
    '- Under 90 words. Plain, warm, direct. Complete sentences.',
    '- Do not describe or invent anything from the conversation itself. Do not quote them back to themselves.',
    '- No selling, no prices, no offers, no "next steps" pitch. The only invitation is to reply if something keeps working on them.',
    '- No em dashes. No exclamation marks. No "journey", "space", "unpack", "sit with", "resonate".',
    '- Output only the email body.',
  ].join('\n');
}

export async function draftThankYou(row) {
  const system = ['You write short emails in Bart Paden’s voice.', ...AO_VOICE_MANIFESTO].join('\n');
  const draft = String(
    (await completeText({ prompt: thankYouPrompt(row), system, task: 'voice', maxTokens: 400 })) || ''
  ).trim();
  const bad = !draft || /—/.test(draft) || detectVoiceViolations(draft).length > 0 || draft.split(/\s+/).length > 140;
  return bad ? fallbackThankYou(row) : draft;
}

/** The researched brief as simple HTML: section names in bold, paragraphs kept. */
export function researchHtml(text) {
  const SECTIONS = /^(WHO THEY ARE|THEIR ORGANIZATION|WHAT THEY ARE CARRYING|WORTH ASKING|WHAT I COULD NOT CONFIRM|SOURCES)\s*:?\s*$/;
  return String(text || '')
    .split(/\n{2,}|\n(?=[A-Z][A-Z ]{6,}$)/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split('\n');
      const head = SECTIONS.test(lines[0].trim()) ? lines.shift().trim().replace(/:$/, '') : null;
      const body = lines
        .map((l) => escapeHtml(l).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>'))
        .join('<br>');
      return `${head ? `<p style="margin:22px 0 6px;font-size:13px;letter-spacing:.08em;color:#888">${escapeHtml(head)}</p>` : ''}${body ? `<p style="margin:0 0 12px">${body}</p>` : ''}`;
    })
    .join('');
}

export function briefEmail(row, research = null) {
  const a = row.answers || {};
  const qa = Array.isArray(a.questions_and_answers) ? a.questions_and_answers : [];
  const joining =
    a.location_type === 'outbound_call'
      ? `Phone. You call them${row.phone ? ` at ${row.phone}` : ''}.`
      : a.join_url
        ? `Zoom: ${a.join_url}`
        : 'Zoom (link in your calendar invite)';
  const rows = qa
    .filter((x) => String(x.answer || '').trim())
    .map((x) => `<p style="margin:0 0 14px"><strong>${escapeHtml(x.question)}</strong><br>${escapeHtml(x.answer).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return {
    subject: `Brief: ${row.name}, ${whenText(a.scheduled_for)}`,
    html: `
      <div style="font-family:Georgia,serif;font-size:16px;line-height:1.55;color:#1a1a1a;max-width:620px">
        <p style="margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#888">Conversation brief</p>
        <h2 style="margin:0 0 4px;font-weight:normal">${escapeHtml(row.name)}</h2>
        <p style="margin:0 0 18px;color:#555">${escapeHtml(whenText(a.scheduled_for))}<br>
          ${escapeHtml(joining)}<br>
          <a href="mailto:${escapeHtml(row.email)}">${escapeHtml(row.email)}</a>${row.role ? ` · ${escapeHtml(row.role)}` : ''}${row.org_size ? ` · ${escapeHtml(row.org_size)} people` : ''}</p>
        <p style="margin:24px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#888">What they wrote</p>
        ${rows || '<p>They did not add anything beyond the booking.</p>'}
        <p style="margin:28px 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#888">Research</p>
        ${research?.ok ? researchHtml(research.brief) : `<p>The research did not come through this time${research?.error ? ` (${escapeHtml(research.error)})` : ''}. Everything above is from their booking.</p>`}
        <p style="margin:24px 0 0;font-size:13px;color:#888">After the call you will get a thank-you to send, drafted in your voice.</p>
      </div>`,
  };
}

export function afterCallEmail(row, draft) {
  const thanks = actionUrl(row.id, 'thank_you');
  const reinvite = actionUrl(row.id, 'reinvite');
  const btn = (href, label, bg) =>
    `<a href="${href}" style="display:inline-block;margin:0 10px 10px 0;padding:12px 20px;background:${bg};color:#fff;text-decoration:none;border-radius:3px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold">${label}</a>`;
  return {
    subject: `Thank-you ready for ${row.name}`,
    html: `
      <div style="font-family:Georgia,serif;font-size:16px;line-height:1.55;color:#1a1a1a;max-width:620px">
        <p>Your conversation with ${escapeHtml(row.name)} was ${escapeHtml(whenText(row.answers?.scheduled_for))}. Here is a thank-you, drafted in your voice. Nothing goes to them until you press send, and you can edit it first.</p>
        <div style="margin:18px 0;padding:16px 18px;border-left:3px solid #DB0812;background:#f7f5f2;white-space:pre-wrap">${escapeHtml(draft)}</div>
        ${btn(thanks, 'Review and send the thank-you', '#DB0812')}
        ${btn(reinvite, 'They did not show: send a re-invite', '#444')}
      </div>`,
  };
}

// ---------------------------------------------------------------- sending

function resend() {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}

/** The site's verified sender address, shown as coming from Bart. */
function fromBart() {
  const raw = String(process.env.CONTACT_FROM || '').trim();
  const addr = (raw.match(/<([^>]+)>/) || [null, raw])[1];
  return addr ? `Bart Paden <${addr}>` : null;
}

function fromSite() {
  return String(process.env.CONTACT_FROM || '').trim() || null;
}

export async function sendToBart({ subject, html }) {
  const client = resend();
  if (!client || !fromSite()) return { ok: false, error: 'email not configured' };
  const r = await client.emails.send({ from: fromSite(), to: contactFormRecipient(), subject, html });
  return r?.error ? { ok: false, error: String(r.error.message || r.error) } : { ok: true };
}

/**
 * To the client, from Bart, replies to Bart, with Bart copied for his records.
 * Every one carries the link to change their permissions, as the Before we
 * talk form promises ("Every email from me has a link"), and lands on their
 * timeline in Auto.
 */
export async function sendToClient(row, { subject, text, cta = null }, { kind = 'email', footer = true, meta = {} } = {}) {
  const client = resend();
  if (!client || !fromBart()) return { ok: false, error: 'email not configured' };
  const permissionsUrl = footer ? prepUrl(row.id) : null;
  const body = permissionsUrl ? `${text}\n\n\nChange what you are comfortable with: ${permissionsUrl}` : text;
  const r = await client.emails.send({
    from: fromBart(),
    to: row.email,
    bcc: contactFormRecipient(),
    reply_to: contactFormRecipient(),
    subject,
    text: body,
    html: letterHtml(text, { cta, permissionsUrl }),
    // The Gmail sync skips Bart's copy of these: they are already on the timeline.
    headers: { 'X-AO-Client-System': '1' },
  });
  if (r?.error) return { ok: false, error: String(r.error.message || r.error) };
  await addEvent({ email: row.email, inquiryId: row.id, kind, subject, body: text, meta });
  return { ok: true };
}

export async function markRow(row, patch) {
  const answers = { ...(row.answers || {}), ...patch };
  const { error } = await supabaseAdmin.from('engagement_inquiries').update({ answers }).eq('id', row.id);
  if (error) throw new Error(error.message);
  row.answers = answers;
}

export async function getBooking(id) {
  const { data, error } = await supabaseAdmin.from('engagement_inquiries').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------- the hourly job

/**
 * What a row needs right now: 'research' (as soon as it is booked, so the
 * brief is ready in Auto the moment Bart looks), 'after_call', or null.
 * Pure, for tests.
 */
export function dueFor(row, now = Date.now()) {
  const a = row?.answers || {};
  if (a.source !== 'calendly' || a.cancelled_at || !a.scheduled_for) return null;
  const start = Date.parse(a.scheduled_for);
  if (!Number.isFinite(start)) return null;
  if (!a.prep_email_sent_at && now < start) return 'prep_email';
  if (!a.research_at && now < start) return 'research';
  if (!a.followup_drafted_at && now >= start + AFTER_CALL_MS && now < start + AFTER_CALL_GIVE_UP_MS) return 'after_call';
  return null;
}

/** Research a booking and keep the result on the row. Used by the job and by "Research again" in Auto. */
export async function researchAndStore(row, now = Date.now()) {
  const research = await researchBooking(row);
  await markRow(row, {
    research_at: new Date(now).toISOString(),
    research_brief: research.ok ? research.brief : null,
    research_sources: research.ok ? research.sources : null,
    research_error: research.ok ? null : research.error,
  });
  return research;
}

/** Draft the thank-you and keep it on the row. */
export async function draftAndStore(row, now = Date.now()) {
  const draft = await draftThankYou(row);
  await markRow(row, { followup_drafted_at: new Date(now).toISOString(), thank_you_draft: draft });
  return draft;
}

const AUTO_CLIENTS_URL = `${SITE}/ao/clients`;

/**
 * Bart, 2026-10-23: "I'm not sure I want to run it all out of my email."
 * Everything lives in Auto (Clients). Email is one line pointing there.
 */
export function headsUpEmail(kind, row) {
  const when = whenText(row.answers?.scheduled_for);
  const subject =
    kind === 'research'
      ? `Brief ready for ${row.name}, ${when}.`
      : `${row.name}: add the transcript for the follow-up.`;
  const html =
    kind === 'research'
      ? noticeHtml({
          title: `Brief ready for ${row.name}`,
          lines: [when, row.role ? `${row.role}${row.org_size ? `, ${row.org_size} people` : ''}` : null],
          cta: { label: 'Open the brief in Auto', url: AUTO_CLIENTS_URL },
        })
      : noticeHtml({
          title: `Your conversation with ${row.name} is done`,
          lines: [when],
          note: 'Add the transcript and Auto will draft the follow-up from the real conversation: summary, action items, and the check-in plan.',
          cta: { label: 'Add the transcript', url: AUTO_CLIENTS_URL },
        });
  return { subject, html };
}

export async function runFollowups(now = Date.now()) {
  const since = new Date(now - 90 * 24 * HOUR).toISOString();
  const { data, error } = await supabaseAdmin
    .from('engagement_inquiries')
    .select('*')
    .eq('answers->>source', 'calendly')
    .gte('created_at', since)
    .limit(500);
  if (error) throw new Error(error.message);

  const done = [];
  for (const row of data || []) {
    const due = dueFor(row, now);
    if (!due) continue;
    try {
      if (due === 'prep_email') {
        // Once is enough: a returning client who already filled it out is not asked again.
        const record = await getClientRecord(row.email).catch(() => null);
        if (record?.prep?.submitted_at) {
          await markRow(row, { prep_email_sent_at: 'not needed', prep_email_skipped: 'already submitted' });
          done.push({ id: row.id, due, ok: true, skipped: true });
          continue;
        }
        const r = await sendToClient(row, prepEmail(row), { kind: 'prep_email_sent', footer: false });
        if (r.ok) await markRow(row, { prep_email_sent_at: new Date(now).toISOString() });
        done.push({ id: row.id, due, ...r });
        continue;
      }
      if (due === 'research') {
        const research = await researchAndStore(row, now);
        const r = await sendToBart(headsUpEmail('research', row));
        done.push({ id: row.id, due, researched: research.ok, ...r });
      } else {
        // No thank-you is drafted without the transcript (Bart, 2026-10-24: a
        // generic note that pulls out one fact "is surface level"). Bart is
        // told the call is done; the thank-you comes from the real conversation.
        await markRow(row, { followup_drafted_at: new Date(now).toISOString(), awaiting_transcript: true });
        const r = await sendToBart(headsUpEmail('after_call', row));
        done.push({ id: row.id, due, ...r });
      }
    } catch (err) {
      done.push({ id: row.id, due, ok: false, error: err?.message || String(err) });
    }
  }
  // Check-ins Bart approved, on their dates. Never one he has not approved,
  // never after he stops them or the person says no to check-ins.
  for (const row of data || []) {
    const due = dueCheckins(row, now);
    if (!due.length) continue;
    const record = await getClientRecord(row.email).catch(() => null);
    if (consentOf(record, 'checkins') === 'no') continue;
    for (const item of due) {
      try {
        const r = await sendToClient(row, { subject: item.subject || 'Checking in', text: item.text }, { kind: 'checkin_sent', meta: { item_id: item.id, reason: item.reason } });
        if (r.ok) {
          const plan = (row.answers.checkin_plan || []).map((x) => (x.id === item.id ? { ...x, status: 'sent', sent_at: new Date(now).toISOString() } : x));
          await markRow(row, { checkin_plan: plan });
        }
        done.push({ id: row.id, due: `checkin ${item.id}`, ...r });
      } catch (err) {
        done.push({ id: row.id, due: `checkin ${item.id}`, ok: false, error: err?.message || String(err) });
      }
    }
  }
  // Person-level work: the thread after each new transcript, gone-quiet
  // alerts, and the monthly web watch. Capped per run so the job stays quick;
  // whatever is left runs fifteen minutes later.
  // Transcripts that arrived on their own (Zoom), one per run. Reading one
  // takes minutes, so the person jobs wait for the next run when it happens.
  let readOne = false;
  try {
    const { processIncoming } = await import('./transcriptIntake.js');
    const incoming = await processIncoming();
    readOne = incoming.some((x) => x.read || x.error);
    done.push(...incoming);
  } catch (err) {
    done.push({ due: 'incoming transcript', ok: false, error: err?.message || String(err) });
  }
  try {
    if (!readOne) done.push(...(await runPersonJobs(now)));
  } catch (err) {
    done.push({ due: 'person jobs', ok: false, error: err?.message || String(err) });
  }
  return { ok: done.every((d) => d.ok), checked: (data || []).length, done };
}

const PER_RUN = { thread: 2, web: 2, links: 2 };
const WEB_WATCH_EVERY_DAYS = 30;

export async function runPersonJobs(now = Date.now()) {
  const { listPeople } = await import('./people.js');
  const { updateThread, threadIsStale, runWebWatch } = await import('./thread.js');
  const { upsertClientRecord } = await import('./clientRecords.js');
  const people = await listPeople(now);
  const out = [];
  let threads = 0;
  let webs = 0;
  let links = 0;
  for (const p of people) {
    for (const row of p.rows || []) {
      if (links >= PER_RUN.links || !needsWritingLinks(row)) continue;
      links += 1;
      const r = await attachWritingLinks(row);
      out.push({ person: p.email, due: 'writing links', ...r });
    }
    const latestTranscript = p.sessions.map((s) => s.transcript_at).filter(Boolean).sort().pop();
    if (threads < PER_RUN.thread && threadIsStale(p.record, latestTranscript)) {
      threads += 1;
      const r = await updateThread(p.email);
      out.push({ person: p.email, due: 'thread', ok: r.ok, error: r.error });
    }
    if (p.quiet && p.record?.flags?.quiet_notified_for !== p.quiet.since && !p.test) {
      const r = await sendToBart({
        subject: `${p.name} has gone quiet: ${p.quiet.days} days.`,
        html: noticeHtml({
          title: `${p.name} has gone quiet`,
          lines: [
            `${p.quiet.days} days since you were last in touch. The line for their tier is ${p.quiet.limit}.`,
            p.thread?.momentum?.reason ? `Last read: ${p.thread.momentum.reason}` : null,
          ],
          cta: { label: 'Open their page in Auto', url: `${SITE}/ao/clients?c=${encodeURIComponent(p.email)}` },
        }),
      });
      if (r.ok) await upsertClientRecord(p.email, { flags: { ...(p.record?.flags || {}), quiet_notified_for: p.quiet.since } });
      out.push({ person: p.email, due: 'quiet notice', ...r });
    }
    const checked = Date.parse(p.web_watch?.checked_at || '');
    const dueWeb = !p.test && ['met', 'season', 'ongoing'].includes(p.stage) && (!Number.isFinite(checked) || now - checked > WEB_WATCH_EVERY_DAYS * 24 * 3600 * 1000);
    if (webs < PER_RUN.web && dueWeb) {
      webs += 1;
      const r = await runWebWatch(p);
      if (r.ok && r.fresh?.length) {
        await sendToBart({
          subject: `News about ${p.name}.`,
          html: noticeHtml({
            title: `Something new about ${p.name}`,
            lines: r.fresh.map((x) => `${x.headline}${x.why_it_matters ? `. ${x.why_it_matters}` : ''}`),
            cta: { label: 'Open their page in Auto', url: `${SITE}/ao/clients?c=${encodeURIComponent(p.email)}` },
          }),
        });
      }
      out.push({ person: p.email, due: 'web watch', ok: r.ok, error: r.error, found: r.fresh?.length || 0 });
    }
  }
  return out;
}

/** A read transcript with promises of Bart's that have not been matched to his writing yet. */
export function needsWritingLinks(row) {
  const a = row?.answers || {};
  return Boolean(a.transcript_analysis?.action_items?.bart?.length) && !a.transcript_analysis?.bart_links_at;
}

/** Match Bart's action items to his published writing and keep the links on the conversation. */
export async function attachWritingLinks(row) {
  const { linkBartItems } = await import('./writingLinks.js');
  const analysis = row.answers?.transcript_analysis || {};
  try {
    const bart_links = await linkBartItems(analysis.action_items?.bart || []);
    await markRow(row, { transcript_analysis: { ...analysis, bart_links, bart_links_at: new Date().toISOString() } });
    return { ok: true, linked: bart_links.filter((x) => x.links.length).length };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Approved check-ins whose date has come. Pure, for tests. */
export function dueCheckins(row, now = Date.now()) {
  const a = row?.answers || {};
  if (a.cancelled_at || a.checkins_stopped_at || !Array.isArray(a.checkin_plan)) return [];
  return a.checkin_plan.filter((x) => x.status === 'approved' && Date.parse(x.send_at || '') <= now && String(x.text || '').trim());
}
