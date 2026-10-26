/**
 * Ask, on the CRM screen: questions about the people Bart works with, answered
 * by Auto from the record (notes/PLAN-crm.md).
 *
 * Bart, 2026-10-25: "open the page, know what to do, or have an AI I can ask
 * about it quickly."
 *
 * This is the same full Auto turn the chat uses (runChatTurn), in one standing
 * conversation kept for the CRM, so anything asked here can be picked up in
 * the Auto chat later. Nothing reaches anyone from here: emails Auto drafts
 * wait in the Queue for Bart.
 *
 * GET              the CRM conversation so far
 * POST { question } one question; waits for the answer
 */
import { requireOwnerSession } from '../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../lib/supabase-admin.js';

const HOW =
  'Bart is asking from the CRM screen, most likely on his phone. Answer from the CRM: use crm_today, crm_people and crm_person before saying anything about a person, what is owed, or what to do. ' +
  'Lead with the answer in a few short lines, name the people, and say where something is not on record instead of guessing. ' +
  'If he asks for an email, draft it with draft_email so it waits in the Queue for him.';

/** The one conversation the CRM keeps, made the first time it is needed. */
async function crmThread(owner) {
  const { data: found } = await supabaseAdmin
    .from('ao_auto_threads')
    .select('id')
    .eq('created_by_email', owner)
    .contains('state', { crm_ask: true })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (found?.id) return found.id;
  const stamp = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('ao_auto_threads')
    .insert({
      created_by_email: owner,
      title: 'CRM: Ask',
      current_mode: 'plan',
      status: 'archived',
      state: { crm_ask: true, user_archived: false },
      created_at: stamp,
      updated_at: stamp,
      last_message_at: stamp,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/** What Bart sees: his questions as he typed them, and the answers. */
async function history(threadId) {
  const { data } = await supabaseAdmin
    .from('ao_auto_messages')
    .select('id, role, content, created_at')
    .eq('thread_id', threadId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: false })
    .limit(30);
  return (data || [])
    .reverse()
    .map((m) => ({
      id: m.id,
      role: m.role,
      text: m.role === 'user' ? String(m.content || '').split('\n\n[CRM ASK]')[0] : String(m.content || ''),
      at: m.created_at,
    }))
    .filter((m) => m.text.trim());
}

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;
  const owner = String(auth.email || '').toLowerCase();
  try {
    const threadId = await crmThread(owner);
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, thread_id: threadId, messages: await history(threadId) });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    const question = String(req.body?.question || '').trim().slice(0, 4000);
    if (!question) return res.status(400).json({ ok: false, error: 'Ask a question' });

    const { runChatTurn } = await import('./auto/chat.js');
    let done = null;
    let failure = null;
    await runChatTurn({
      email: owner,
      body: { message: `${question}\n\n[CRM ASK] ${HOW}`, thread_id: threadId, agent: 'auto', message_meta: { crm_ask: true } },
      sendEvent: (event, data) => {
        if (event === 'done') done = data;
        if (event === 'error') failure = data?.error || 'Auto ran into a problem';
      },
    });
    if (!done) {
      console.warn('[crm-ask]', failure);
      return res.status(200).json({ ok: false, error: 'Auto could not answer that just now. Try again in a moment.', thread_id: threadId, messages: await history(threadId) });
    }
    return res.status(200).json({ ok: true, thread_id: threadId, answer: done.assistant_message, messages: await history(threadId) });
  } catch (err) {
    console.error('[crm-ask]', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Auto could not answer that just now. Try again in a moment.' });
  }
}
