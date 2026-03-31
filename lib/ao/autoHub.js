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
