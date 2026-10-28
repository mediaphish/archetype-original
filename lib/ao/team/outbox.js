/**
 * Emails the team writes for Bart. Each one waits for him in the Queue
 * (Bart, 2026-10-25: "Show me first for now, but I will want this automated as
 * we get going"). Approved emails are picked up by his own Gmail through the
 * Apps Script in notes/gmail-sync and sent from bart@archetypeoriginal.com, so
 * they sit in his Sent folder and replies come to his inbox.
 */
import { supabaseAdmin } from '../../supabase-admin.js';
import { AGENTS, normalizeAgent } from './agents.js';

const SITE = () => String(process.env.SITE_URL || 'https://www.archetypeoriginal.com').replace(/\/$/, '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nowIso() {
  return new Date().toISOString();
}

/** Pure: whether the opening of an email says plainly that an AI teammate wrote it. */
export function saysItIsAI(body) {
  const opening = String(body || '').slice(0, 400);
  return /\bBart'?s AI\b|\bAI (producer|publicist|writer|editor|designer|marketing director|teammate|assistant)\b/i.test(opening);
}

/** The display name the email goes out under, so the person knows who wrote it. */
export function senderName(agent) {
  // An email Bart wrote himself goes out under his own name (2026-10-28).
  if (String(agent || '').toLowerCase() === 'bart') return 'Bart Paden';
  const a = AGENTS[normalizeAgent(agent)];
  return `${a.name}, for Bart Paden`;
}

/** Their voice rules apply to what goes out under Bart's name too. */
function plain(t) {
  return String(t || '')
    .replace(/\s*—\s*/g, ', ')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .trim();
}

export async function draftEmail({ agent, toEmail, toName = '', subject, body, purpose = '', taskId = null, threadId = null }) {
  const to = String(toEmail || '').trim().toLowerCase();
  if (!EMAIL_RE.test(to)) return { ok: false, error: 'A valid to_email is required' };
  const s = plain(subject);
  const b = plain(body);
  if (!s) return { ok: false, error: 'subject is required' };
  if (!b) return { ok: false, error: 'body is required' };
  // Bart, 2026-10-28: "Cam needs to be honest and tell people she is my AI Producer."
  if (!saysItIsAI(b)) {
    return { ok: false, error: 'Say who you are in the first lines, honestly: your name and that you are Bart\'s AI teammate, e.g. "This is Cam, Bart\'s AI producer." Then draft_email again.' };
  }

  // The same email already waiting for Bart is not written twice
  // (2026-10-25: two identical drafts to Matt, one per pass).
  const { data: dup } = await supabaseAdmin
    .from('ao_team_outbox')
    .select('id')
    .eq('status', 'pending_review')
    .eq('to_email', to)
    .eq('subject', s)
    .limit(1);
  if (dup?.length) {
    return { ok: true, email_id: dup[0].id, status: 'already waiting for Bart', note: 'This email is already in the Queue under "Emails waiting on you". Nothing new was added.' };
  }

  // Accurate before autonomous (Bart, 2026-10-25: "We have to be accurate here
  // before we can go more autonomous"). The email is read against what is on
  // record about the person; anything unsupported goes back to the teammate.
  const accuracy = await checkAgainstRecord({ to, subject: s, body: b });
  if (accuracy.checked && accuracy.issues.length) {
    return {
      ok: false,
      error: 'The accuracy check found statements the record does not support. Rewrite the email without them, then call draft_email again.',
      issues: accuracy.issues,
    };
  }

  let isClient = false;
  try {
    const { clientAddresses } = await import('../../calendly/gmailSync.js');
    isClient = (await clientAddresses()).includes(to);
  } catch (_) {}

  const { data, error } = await supabaseAdmin
    .from('ao_team_outbox')
    .insert({
      agent: normalizeAgent(agent),
      task_id: taskId || null,
      thread_id: threadId || null,
      to_email: to,
      to_name: String(toName || '').trim() || null,
      subject: s,
      body: b,
      purpose: [String(purpose || '').trim(), isClient ? 'client' : ''].filter(Boolean).join(' · ') || null,
      accuracy,
    })
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };

  await tellBart(data);
  return {
    ok: true,
    email_id: data.id,
    status: 'waiting for Bart',
    note: 'It is in the Queue under "Emails waiting on you". Nothing is sent until Bart approves it.',
  };
}

async function tellBart(row) {
  try {
    const [{ sendToBart }, { noticeHtml }] = await Promise.all([
      import('../../calendly/followups.js'),
      import('../../calendly/emailLayout.js'),
    ]);
    const name = AGENTS[row.agent]?.name || 'Ada';
    await sendToBart({
      subject: `${name} wrote an email for you to approve: ${row.subject}`,
      html: noticeHtml({
        title: `${name} has an email ready`,
        lines: [`To ${row.to_name ? `${row.to_name} (${row.to_email})` : row.to_email}`, `Subject: ${row.subject}`, 'It waits in the Queue until you approve it.'],
        cta: { label: 'Review it in #queue', url: `${SITE()}/ao/analyst?queue=1` },
        eyebrow: 'Auto · Team',
      }),
    });
  } catch (err) {
    console.warn('[outbox] could not tell Bart:', err?.message || err);
  }
}

export async function listOutbox() {
  const { data, error } = await supabaseAdmin
    .from('ao_team_outbox')
    .select('*')
    .in('status', ['pending_review', 'approved', 'sending', 'sent', 'failed'])
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) return { ok: false, error: error.message };
  const rows = (data || []).map((r) => ({ ...r, agent_name: AGENTS[r.agent]?.name || r.agent }));
  return {
    ok: true,
    waiting: rows.filter((r) => r.status === 'pending_review'),
    on_the_way: rows.filter((r) => r.status === 'approved' || r.status === 'sending'),
    recent: rows.filter((r) => r.status === 'sent' || r.status === 'failed').slice(0, 10),
  };
}

export async function countWaiting() {
  const { count } = await supabaseAdmin
    .from('ao_team_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending_review');
  return count || 0;
}

/** Bart approves, optionally with his own edits. */
export async function approveEmail(id, { subject, body } = {}) {
  const patch = { status: 'approved', approved_at: nowIso(), updated_at: nowIso() };
  if (typeof subject === 'string' && subject.trim()) patch.subject = subject.trim();
  if (typeof body === 'string' && body.trim()) patch.body = body.trim();
  const { data, error } = await supabaseAdmin
    .from('ao_team_outbox')
    .update(patch)
    .eq('id', id)
    .eq('status', 'pending_review')
    .select('*')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'That email is no longer waiting.' };
  return { ok: true, email: data };
}

export async function discardEmail(id) {
  const { error } = await supabaseAdmin
    .from('ao_team_outbox')
    .update({ status: 'discarded', updated_at: nowIso() })
    .eq('id', id)
    .in('status', ['pending_review', 'failed']);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** For Bart's Gmail: approved emails, marked as on their way so none goes twice. */
export async function takeApprovedForSending(limit = 10) {
  const { data } = await supabaseAdmin
    .from('ao_team_outbox')
    .select('id, agent, to_email, to_name, subject, body')
    .eq('status', 'approved')
    .order('approved_at', { ascending: true })
    .limit(limit);
  const out = [];
  for (const r of data || []) {
    const { data: claimed } = await supabaseAdmin
      .from('ao_team_outbox')
      .update({ status: 'sending', updated_at: nowIso() })
      .eq('id', r.id)
      .eq('status', 'approved')
      .select('id')
      .maybeSingle();
    if (claimed) out.push({ ...r, from_name: senderName(r.agent) });
  }
  return out;
}

/** Bart's Gmail reports back what it sent. */
export async function recordSent(results = []) {
  let sent = 0;
  for (const r of results.slice(0, 50)) {
    if (!r?.id) continue;
    if (r.ok) {
      const { data: row } = await supabaseAdmin
        .from('ao_team_outbox')
        .update({ status: 'sent', sent_at: nowIso(), gmail_message_id: r.message_id || null, gmail_thread_id: r.thread_id || null, updated_at: nowIso() })
        .eq('id', r.id)
        .select('agent, to_email, subject, body')
        .maybeSingle();
      // On the person's timeline in the CRM, under the same Gmail id the sync
      // uses, so it is never filed twice.
      if (row) {
        await supabaseAdmin.from('ao_client_events').insert({
          client_email: String(row.to_email).toLowerCase(),
          kind: 'email_out',
          subject: row.subject,
          body: row.body,
          meta: { gmail_id: r.message_id || null, thread_id: r.thread_id || null, source: 'team', agent: row.agent, outbox_id: r.id },
          at: nowIso(),
        });
      }
      sent += 1;
    } else {
      await supabaseAdmin
        .from('ao_team_outbox')
        .update({ status: 'failed', error: String(r.error || 'Gmail could not send it').slice(0, 500), updated_at: nowIso() })
        .eq('id', r.id);
    }
  }
  return { ok: true, sent };
}

/** Anything stuck "on its way" for half an hour goes back to approved for another try. */
export async function releaseStuckSending() {
  const before = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  await supabaseAdmin.from('ao_team_outbox').update({ status: 'approved', updated_at: nowIso() }).eq('status', 'sending').lt('updated_at', before);
}

/** Everything on record about a person, for checking an email to them. */
async function recordFor(email) {
  const parts = [];
  const { data: guest } = await supabaseAdmin
    .from('ao_podcast_guests')
    .select('name, company, session_type, bio_md, question_1, question_2, question_3, question_4, question_5, mentor_situation, mentor_tried, mentor_role, mentor_org_size, mentor_honest_answer, mentor_stakes, schedule_preferred_days, schedule_preferred_time, research_brief, producer_brief')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();
  if (guest) parts.push(`PODCAST RECORD:\n${JSON.stringify(guest).slice(0, 14000)}`);
  const { data: client } = await supabaseAdmin.from('ao_clients').select('name, stage, tier, prep, notes, details').eq('email', email).maybeSingle();
  if (client) parts.push(`CLIENT RECORD:\n${JSON.stringify(client).slice(0, 6000)}`);
  const { data: events } = await supabaseAdmin
    .from('ao_client_events')
    .select('kind, subject, body, at')
    .eq('client_email', email)
    .order('at', { ascending: false })
    .limit(15);
  if (events?.length) parts.push(`HISTORY:\n${JSON.stringify(events).slice(0, 6000)}`);
  return parts.join('\n\n');
}

/**
 * Read an email against the record. Returns { checked, issues: [{ quote, why }] }.
 * If the check itself cannot run, the email still goes to Bart, marked unchecked.
 */
export async function checkAgainstRecord({ to, subject, body }) {
  try {
    const record = await recordFor(to);
    const { completeJson } = await import('../textModel.js');
    const out = await completeJson({
      task: 'analysis',
      maxTokens: 6000,
      timeoutMs: 90000,
      prompt: `An email is about to go out from Bart Paden's account, written by his AI team. Check it for accuracy against what is on record. Be strict and literal.

Flag any sentence that:
1. states a fact about the recipient that the record does not support, or gets their own account wrong (who did what, when, in what order);
2. says what Bart has read, thinks, feels, wants, plans or is interested in, unless the record shows Bart said it;
3. promises something nobody has agreed to.
Do not flag the sender introducing itself, a booking link, an offer to find a time, or a question that asks the recipient about something they themselves wrote.

RECORD:
${record || '(nothing on record for this address)'}

EMAIL:
Subject: ${subject}
${body}

Return {"issues":[{"quote":"the exact words","why":"one plain sentence"}]}. Return {"issues":[]} if nothing is wrong.`,
    });
    const issues = Array.isArray(out?.issues) ? out.issues.filter((i) => i && i.quote).slice(0, 8) : null;
    if (!issues) return { checked: false, issues: [], note: 'The accuracy check did not return a result.' };
    return { checked: true, issues, had_record: Boolean(record), at: new Date().toISOString() };
  } catch (err) {
    return { checked: false, issues: [], note: `The accuracy check could not run: ${String(err?.message || err).slice(0, 200)}` };
  }
}
