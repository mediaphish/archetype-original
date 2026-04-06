import { supabaseAdmin } from '../supabase-admin.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

export function detectAutoMode(text, fallback = 'general') {
  const s = safeText(text, 1000).toLowerCase();
  if (!s) return fallback;
  if (/\btraining mode\b|\bswitch to training\b|\blet'?s train\b/.test(s)) return 'training';
  if (/\bready to post\b|\bready to publish\b|\bschedule this\b|\bpublish this\b|\bsend it out\b/.test(s)) return 'publish';
  if (/\blet'?s write\b|\bwrite this\b|\bdraft this\b|\bbuild this post\b/.test(s)) return 'write';
  if (
    /^plan\b|\blet'?s plan\b|\bplan this\b|\bhelp me plan\b|\bneed to plan\b|\bplanning (?:a |the )?(?:series|campaign|pull)\b/.test(s)
  ) {
    return 'plan';
  }
  if (
    /\bpackage\b|\bready to go out\b|\bpost ready to go\b|\bready to package\b|\bpackag(?:e|ing) (?:this|my post)\b|\bi have a post\b|\bi have a post ready\b|\bpaste(?:d)? (?:my )?finished\b|\bdon'?t refine\b|\bdo not refine\b|\bno more edits\b|\bnot refining\b|\bfinished (?:my )?(?:post|draft)\b|\bthis is (?:my )?final\b/.test(s)
  ) {
    return 'package';
  }
  if (/\bdidn'?t we have something like this before\b|\bhave we done this already\b|\bremember this\b|\bask the librarian\b/.test(s)) return 'recall';
  return fallback;
}

export async function ensureAutoThread(email, threadId = '') {
  const owner = safeText(email, 200).toLowerCase();
  if (!owner) throw new Error('email required');

  if (threadId) {
    const existing = await supabaseAdmin
      .from('ao_auto_threads')
      .select('*')
      .eq('id', threadId)
      .eq('created_by_email', owner)
      .single();
    if (!existing.error && existing.data) return existing.data;
  }

  const latest = await supabaseAdmin
    .from('ao_auto_threads')
    .select('*')
    .eq('created_by_email', owner)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest.error && latest.data) return latest.data;

  const created = await supabaseAdmin
    .from('ao_auto_threads')
    .insert({
      created_by_email: owner,
      title: 'Auto',
      current_mode: 'plan',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (created.error) throw created.error;
  return created.data;
}

/** List archived Auto threads (drafts) for the owner, newest first. Includes preview from last message when present. */
export async function listArchivedAutoThreads(email, { limit = 50 } = {}) {
  const owner = safeText(email, 200).toLowerCase();
  if (!owner) throw new Error('email required');

  const threadsOut = await supabaseAdmin
    .from('ao_auto_threads')
    .select('id, title, status, current_mode, created_at, updated_at, last_message_at')
    .eq('created_by_email', owner)
    .eq('status', 'archived')
    .order('updated_at', { ascending: false })
    .limit(Math.min(Number(limit) || 50, 80));

  if (threadsOut.error) throw threadsOut.error;
  const threads = Array.isArray(threadsOut.data) ? threadsOut.data : [];
  if (!threads.length) return [];

  const ids = threads.map((t) => t.id);
  const msgsOut = await supabaseAdmin
    .from('ao_auto_messages')
    .select('thread_id, content, role, created_at')
    .in('thread_id', ids)
    .order('created_at', { ascending: false })
    .limit(400);

  if (msgsOut.error) throw msgsOut.error;
  const rows = Array.isArray(msgsOut.data) ? msgsOut.data : [];
  const lastByThread = new Map();
  for (const m of rows) {
    const tid = m.thread_id;
    if (!tid || lastByThread.has(tid)) continue;
    lastByThread.set(tid, m);
  }

  return threads
    .filter((t) => lastByThread.has(t.id))
    .map((t) => {
      const last = lastByThread.get(t.id);
      const preview = safeText(last?.content, 160);
      return {
        ...t,
        preview,
        last_message_role: last?.role || null,
      };
    });
}

/** Set an archived thread active; archive any other active thread for this owner. */
export async function resumeAutoThread(email, threadId) {
  const owner = safeText(email, 200).toLowerCase();
  const id = safeText(threadId, 80);
  if (!owner || !id) throw new Error('email and thread id required');

  const existing = await supabaseAdmin
    .from('ao_auto_threads')
    .select('*')
    .eq('id', id)
    .eq('created_by_email', owner)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) throw new Error('Draft not found');

  const now = new Date().toISOString();
  const archived = await supabaseAdmin
    .from('ao_auto_threads')
    .update({ status: 'archived', updated_at: now })
    .eq('created_by_email', owner)
    .eq('status', 'active');
  if (archived.error) throw archived.error;

  const activated = await supabaseAdmin
    .from('ao_auto_threads')
    .update({
      status: 'active',
      updated_at: now,
      last_message_at: existing.data.last_message_at || now,
    })
    .eq('id', id)
    .eq('created_by_email', owner)
    .select('*')
    .single();
  if (activated.error) throw activated.error;
  return activated.data;
}

/** Delete one Auto thread (owner only). Prefer archived drafts; blocks deleting the only active thread if you want safety — here we allow delete for archived only. */
export async function deleteAutoThread(email, threadId) {
  const owner = safeText(email, 200).toLowerCase();
  const id = safeText(threadId, 80);
  if (!owner || !id) throw new Error('email and thread id required');

  const existing = await supabaseAdmin
    .from('ao_auto_threads')
    .select('id, status')
    .eq('id', id)
    .eq('created_by_email', owner)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) throw new Error('Draft not found');
  if (existing.data.status === 'active') {
    throw new Error('Cannot delete the active conversation. Save it as a draft or start a new chat first.');
  }

  const del = await supabaseAdmin.from('ao_auto_threads').delete().eq('id', id).eq('created_by_email', owner);
  if (del.error) throw del.error;
  return { ok: true };
}

/**
 * Park the current conversation as a draft (optional title), then start a fresh active thread.
 * Updates the current thread title from the first user line when title is still generic.
 */
export async function saveDraftAndStartFresh(email, { title: explicitTitle = '' } = {}) {
  const owner = safeText(email, 200).toLowerCase();
  if (!owner) throw new Error('email required');

  const active = await ensureAutoThread(owner);
  const now = new Date().toISOString();
  let titleToSet = safeText(explicitTitle, 200);

  if (!titleToSet) {
    const firstUser = await supabaseAdmin
      .from('ao_auto_messages')
      .select('content')
      .eq('thread_id', active.id)
      .eq('role', 'user')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    const line = firstUser.error ? '' : safeText(firstUser.data?.content, 120);
    if (line) titleToSet = line;
  }

  const currentTitle = safeText(active.title, 200);
  if (titleToSet && (currentTitle === 'Auto' || !currentTitle)) {
    const upd = await supabaseAdmin
      .from('ao_auto_threads')
      .update({ title: titleToSet.slice(0, 200), updated_at: now })
      .eq('id', active.id)
      .eq('created_by_email', owner);
    if (upd.error) throw upd.error;
  }

  return startNewAutoThread(owner);
}

/** Archive all active Auto threads for this owner, then create a new active thread (fresh conversation). */
export async function startNewAutoThread(email) {
  const owner = safeText(email, 200).toLowerCase();
  if (!owner) throw new Error('email required');

  const now = new Date().toISOString();
  const archived = await supabaseAdmin
    .from('ao_auto_threads')
    .update({ status: 'archived', updated_at: now })
    .eq('created_by_email', owner)
    .eq('status', 'active');
  if (archived.error) throw archived.error;

  const created = await supabaseAdmin
    .from('ao_auto_threads')
    .insert({
      created_by_email: owner,
      title: 'Auto',
      current_mode: 'plan',
      status: 'active',
      created_at: now,
      updated_at: now,
      last_message_at: now,
    })
    .select('*')
    .single();
  if (created.error) throw created.error;
  return created.data;
}

export async function getAutoThreadState(email, threadId = '') {
  const thread = await ensureAutoThread(email, threadId);

  const [messagesOut, attachmentsOut] = await Promise.all([
    supabaseAdmin
      .from('ao_auto_messages')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })
      .limit(200),
    supabaseAdmin
      .from('ao_auto_attachments')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })
      .limit(100),
  ]);

  if (messagesOut.error) throw messagesOut.error;
  if (attachmentsOut.error) throw attachmentsOut.error;

  return {
    thread,
    messages: messagesOut.data || [],
    attachments: attachmentsOut.data || [],
  };
}

export async function addAutoMessage({
  threadId,
  role,
  mode = null,
  content,
  meta = null,
}) {
  const inserted = await supabaseAdmin
    .from('ao_auto_messages')
    .insert({
      thread_id: threadId,
      role,
      mode,
      content: String(content || ''),
      meta: meta && typeof meta === 'object' ? meta : null,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (inserted.error) throw inserted.error;

  await supabaseAdmin
    .from('ao_auto_threads')
    .update({
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      ...(mode ? { current_mode: mode } : {}),
    })
    .eq('id', threadId);

  return inserted.data;
}

export async function listGuardrails(email) {
  const out = await supabaseAdmin
    .from('ao_auto_guardrails')
    .select('*')
    .eq('created_by_email', String(email || '').toLowerCase())
    .order('updated_at', { ascending: false });
  if (out.error) throw out.error;
  return out.data || [];
}

/** Load one bundle by id when it belongs to this owner (e.g. thread’s active bundle not in recent list). */
export async function fetchBundleByIdForOwner(email, bundleId) {
  const owner = String(email || '').toLowerCase().trim();
  const id = String(bundleId || '').trim();
  if (!owner || !id) return null;
  const out = await supabaseAdmin
    .from('ao_auto_bundles')
    .select('*')
    .eq('id', id)
    .eq('created_by_email', owner)
    .maybeSingle();
  if (out.error || !out.data) return null;
  return out.data;
}

export async function searchBundles(email, queryText = '') {
  const owner = String(email || '').toLowerCase().trim();
  const q = safeText(queryText, 160);
  let req = supabaseAdmin
    .from('ao_auto_bundles')
    .select('*')
    .eq('created_by_email', owner)
    .order('updated_at', { ascending: false })
    .limit(12);
  if (q) {
    const pat = `%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
    req = req.or(`title.ilike.${pat},summary.ilike.${pat},series_name.ilike.${pat},original_input.ilike.${pat}`);
  }
  const out = await req;
  if (out.error) throw out.error;
  return out.data || [];
}
