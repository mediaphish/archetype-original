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

/** The display name the email goes out under, so the person knows who wrote it. */
export function senderName(agent) {
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
    const name = AGENTS[row.agent]?.name || 'Auto';
    await sendToBart({
      subject: `${name} wrote an email for you to approve: ${row.subject}`,
      html: noticeHtml({
        title: `${name} has an email ready`,
        lines: [`To ${row.to_name ? `${row.to_name} (${row.to_email})` : row.to_email}`, `Subject: ${row.subject}`, 'It waits in the Queue until you approve it.'],
        cta: { label: 'Review it in the Queue', url: `${SITE()}/ao/library/review-queue#emails` },
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
      await supabaseAdmin
        .from('ao_team_outbox')
        .update({ status: 'sent', sent_at: nowIso(), gmail_message_id: r.message_id || null, gmail_thread_id: r.thread_id || null, updated_at: nowIso() })
        .eq('id', r.id);
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
