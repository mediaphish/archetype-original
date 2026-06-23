import { supabaseAdmin } from '../supabase-admin.js';
import { messageIsInThreadQuoteWork } from './quoteWorkIntent.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

/**
 * User is trying to leave Training mode. Without this, detectAutoMode falls through to
 * fallback "training" and every message stays in training until a new chat.
 */
export function wantsExitTrainingMode(text) {
  const s = safeText(text, 2000).toLowerCase();
  if (!s) return false;
  if (/\b(switch|go)\s+to\s+training\b/.test(s) && !/\b(don'?t|not|never|no)\b/.test(s)) return false;
  return (
    /\b(exit|leave|end|quit)\s+(?:training|this\s+mode)\b/.test(s) ||
    /\bstop\s+training\b/.test(s) ||
    /\b(get|switch)\s+out\s+of\s+training\b/.test(s) ||
    /\bback\s+to\s+(?:planning|plan|normal|auto)\b/.test(s) ||
    /\bi\s+don'?t\s+want\s+(?:training|this\s+mode|you\s+in\s+training)\b/.test(s) ||
    /\bnot\s+in\s+training\b/.test(s) ||
    /\bturn\s+off\s+training\b/.test(s) ||
    /\bout\s+of\s+training\b/.test(s) ||
    /\bdone\s+with\s+training\b/.test(s) ||
    /\bcancel\s+training\b/.test(s) ||
    /\bno\s+more\s+training\b/.test(s) ||
    /\bget\s+out\s+of\s+training\b/.test(s)
  );
}

/** Narrow: explicit “librarian / list the last batch” style — maps to Recall mode in Auto. */
function recallModeFromMessage(text) {
  const s = safeText(text, 2000).toLowerCase();
  if (!s || /\btraining mode\b/.test(s)) return false;
  return (
    /\bdidn'?t we have something like this before\b|\bhave we done this already\b|\bremember this\b|\bask the librarian\b/.test(s) ||
    (/\b(pull|show|give|get)\s+(me\s+)?(the\s+)?(list|lines)\b/.test(s) && /\b(last|previous|before|earlier|last time)\b/.test(s)) ||
    (/\b(pull|show|give|get)\s+(me\s+)?(the\s+)?cards?\b/.test(s) && /\b(last|previous|before|earlier|last time)\b/.test(s)) ||
    (/\b(last time|previous batch|prior batch|earlier batch)\b/.test(s) && /\b(card|quote|pull|batch|made|generated|built)\b/.test(s)) ||
    (/\b(list|what were)\s+(the\s+)?(\d+|ten|10|twelve|12)\b/.test(s) && /\b(card|quote)\b/.test(s))
  );
}

/**
 * Broader: load saved quote-card context into the thread snapshot (Planning or Recall).
 * Includes “continue the series,” overlap avoidance, and “N more cards about [theme].”
 */
export function shouldLoadAccountQuoteCardContext(text) {
  const s = safeText(text, 2000).toLowerCase();
  if (!s || /\btraining mode\b/.test(s)) return false;
  if (recallModeFromMessage(text)) return true;
  return (
    (/\blast time\b|\bprevious batch\b|\bprior batch\b|\bearlier batch\b/.test(s) && /\b(card|quote|pull|batch|corpus)\b/.test(s)) ||
    /\bcards we (?:made|generated|built)\b/.test(s) ||
    /\bwe (?:made|generated|built)\s+\d+\s+cards?\b/.test(s) ||
    (/\b(without overlap|avoid overlap|don'?t repeat|no duplicate)\b/.test(s) && /\b(card|quote|pull)\b/.test(s)) ||
    (/\b(continue|pick up|resume|jump back)\b/.test(s) && /\b(card|quote|pull|batch|series)\b/.test(s)) ||
    /\bmore (?:quote )?cards? about\b/.test(s) ||
    /\b\d+\s+more (?:quote )?cards?\b/.test(s) ||
    (/\b(same (?:topic|theme)|another batch)\b/.test(s) && /\b(card|quote|pull)\b/.test(s)) ||
    (/\bwhat (?:did we|have we)\s+(?:make|generate|build|do)\b/.test(s) && /\b(card|quote)\b/.test(s))
  );
}

/**
 * After `detectAutoMode` (and any server-side overrides), keep Recall from winning
 * when the message is in-thread quote-card work. Single place for routing alignment
 * with `api/ao/auto/chat.js`.
 */
export function finalizeAutoModeForQuoteWork(text, mode) {
  if (mode === 'recall' && messageIsInThreadQuoteWork(text)) return 'plan';
  return mode;
}

export function detectAutoMode(text, fallback = 'general') {
  const s = safeText(text, 1000).toLowerCase();
  if (!s) return fallback;
  if (wantsExitTrainingMode(text)) return 'plan';
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
  if (messageIsInThreadQuoteWork(text)) return 'plan';
  if (recallModeFromMessage(text) && !messageIsInThreadQuoteWork(text)) return 'recall';
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

/** Attach last-message preview to archived threads (drops threads with no messages). */
async function enrichArchivedThreadsWithPreview(threads) {
  const list = Array.isArray(threads) ? threads : [];
  if (!list.length) return [];

  const ids = list.map((t) => t.id);
  const msgsOut = await supabaseAdmin
    .from('ao_auto_messages')
    .select('thread_id, content, role, created_at')
    .in('thread_id', ids)
    .order('created_at', { ascending: false })
    .limit(1200);

  if (msgsOut.error) throw msgsOut.error;
  const rows = Array.isArray(msgsOut.data) ? msgsOut.data : [];
  const lastByThread = new Map();
  for (const m of rows) {
    const tid = m.thread_id;
    if (!tid || lastByThread.has(tid)) continue;
    lastByThread.set(tid, m);
  }

  return list
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

/**
 * List archived Auto threads (drafts) for the owner, newest first.
 * Without search: paginates in the database. With search: scans recent archived threads (cap 400), filters by title/preview in memory, then slices.
 * @returns {{ drafts: object[], total: number, limit: number, offset: number }}
 */
export async function listArchivedAutoThreads(email, { limit = 20, offset = 0, search = '' } = {}) {
  const owner = safeText(email, 200).toLowerCase();
  if (!owner) throw new Error('email required');

  const lim = Math.min(Math.max(Number(limit) || 20, 1), 80);
  const off = Math.max(Number(offset) || 0, 0);
  const q = safeText(search, 200).trim().toLowerCase();

  const baseSelect = () =>
    supabaseAdmin
      .from('ao_auto_threads')
      .select('id, title, status, current_mode, created_at, updated_at, last_message_at, pinned, state', { count: 'exact' })
      .eq('created_by_email', owner)
      .eq('status', 'archived')
      .order('updated_at', { ascending: false });

  if (!q) {
    const threadsOut = await baseSelect().range(off, off + lim - 1);
    if (threadsOut.error) throw threadsOut.error;
    const threads = Array.isArray(threadsOut.data) ? threadsOut.data : [];
    const enriched = await enrichArchivedThreadsWithPreview(threads);
    const total =
      typeof threadsOut.count === 'number' && threadsOut.count >= 0 ? threadsOut.count : enriched.length;
    return { drafts: enriched, total, limit: lim, offset: off };
  }

  const threadsOut = await baseSelect().limit(400);
  if (threadsOut.error) throw threadsOut.error;
  const threads = Array.isArray(threadsOut.data) ? threadsOut.data : [];
  let enriched = await enrichArchivedThreadsWithPreview(threads);
  enriched = enriched.filter((t) => {
    const hay = `${safeText(t.title, 500)} ${safeText(t.preview, 500)}`.toLowerCase();
    return hay.includes(q);
  });
  const total = enriched.length;
  const page = enriched.slice(off, off + lim);
  return { drafts: page, total, limit: lim, offset: off };
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

/** Pin a thread. Enforces a hard cap of 15 pinned threads per owner. */
export async function pinAutoThread(email, threadId) {
  const owner = safeText(email, 200).toLowerCase();
  const id = safeText(threadId, 80);
  if (!owner || !id) throw new Error('email and thread id required');

  const countOut = await supabaseAdmin
    .from('ao_auto_threads')
    .select('id', { count: 'exact', head: true })
    .eq('created_by_email', owner)
    .eq('pinned', true);
  if (countOut.error) throw countOut.error;

  const currentCount = countOut.count || 0;
  if (currentCount >= 15) {
    throw new Error('You can pin up to 15 chats. Unpin one before pinning another.');
  }

  const updated = await supabaseAdmin
    .from('ao_auto_threads')
    .update({ pinned: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('created_by_email', owner)
    .select('*')
    .single();
  if (updated.error) throw updated.error;
  return updated.data;
}

/** Unpin a thread. */
export async function unpinAutoThread(email, threadId) {
  const owner = safeText(email, 200).toLowerCase();
  const id = safeText(threadId, 80);
  if (!owner || !id) throw new Error('email and thread id required');

  const updated = await supabaseAdmin
    .from('ao_auto_threads')
    .update({ pinned: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('created_by_email', owner)
    .select('*')
    .single();
  if (updated.error) throw updated.error;
  return updated.data;
}

/** Rename a thread. Empty or whitespace-only titles are rejected. */
export async function renameAutoThread(email, threadId, newTitle) {
  const owner = safeText(email, 200).toLowerCase();
  const id = safeText(threadId, 80);
  const title = safeText(newTitle, 200);
  if (!owner || !id) throw new Error('email and thread id required');
  if (!title) throw new Error('Title cannot be empty');

  const updated = await supabaseAdmin
    .from('ao_auto_threads')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('created_by_email', owner)
    .select('*')
    .single();
  if (updated.error) throw updated.error;
  return updated.data;
}

/** Archive one thread (hide from main list). Does not touch other threads. */
export async function archiveAutoThread(email, threadId) {
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
  if (!existing.data) throw new Error('Thread not found');

  const prevState =
    existing.data.state && typeof existing.data.state === 'object' ? existing.data.state : {};
  const now = new Date().toISOString();

  const updated = await supabaseAdmin
    .from('ao_auto_threads')
    .update({
      status: 'archived',
      updated_at: now,
      state: { ...prevState, user_archived: true },
    })
    .eq('id', id)
    .eq('created_by_email', owner)
    .select('*')
    .single();
  if (updated.error) throw updated.error;
  return updated.data;
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

  const msgLimit = Math.min(500, Math.max(50, Number(process.env.AO_AUTO_MESSAGE_LOAD_LIMIT) || 400));
  const [messagesOut, attachmentsOut] = await Promise.all([
    supabaseAdmin
      .from('ao_auto_messages')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: false })
      .limit(msgLimit),
    supabaseAdmin
      .from('ao_auto_attachments')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })
      .limit(100),
  ]);

  if (messagesOut.error) throw messagesOut.error;
  if (attachmentsOut.error) throw attachmentsOut.error;

  const msgs = Array.isArray(messagesOut.data) ? [...messagesOut.data].reverse() : [];

  return {
    thread,
    messages: msgs,
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
