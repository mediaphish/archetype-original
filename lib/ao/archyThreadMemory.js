import { supabaseAdmin } from '../supabase-admin.js';

/**
 * @param {string} sessionId
 * @returns {Promise<{ summary: string, messageCount: number, schedulingQuotaUsed: number } | null>}
 */
export async function loadArchyThreadMemory(sessionId) {
  const sid = String(sessionId || '').trim();
  if (!sid) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from('ao_archy_thread_memory')
      .select('thread_summary, message_count, scheduling_quota_used')
      .eq('session_id', sid)
      .maybeSingle();
    if (error || !data) return null;
    return {
      summary: String(data.thread_summary || ''),
      messageCount: Number(data.message_count) || 0,
      schedulingQuotaUsed: Number(data.scheduling_quota_used) || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Rolling summary for paid Archy: append last exchange (capped).
 */
export async function appendArchyThreadMemory(sessionId, { userLine, assistantLine } = {}) {
  const sid = String(sessionId || '').trim();
  if (!sid) return;
  const u = String(userLine || '').slice(0, 1200);
  const a = String(assistantLine || '').slice(0, 2000);
  try {
    const prev = await loadArchyThreadMemory(sessionId);
    const chunk = `\n---\nUser: ${u}\nArchy: ${a}`.trim();
    let next = (prev?.summary || '') + chunk;
    if (next.length > 8000) next = next.slice(-8000);
    const count = (prev?.messageCount || 0) + 1;

    await supabaseAdmin.from('ao_archy_thread_memory').upsert(
      {
        session_id: sid,
        thread_summary: next,
        last_user_excerpt: u.slice(0, 500),
        message_count: count,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    );
  } catch {
    /* table may not exist yet */
  }
}

export async function bumpArchySchedulingQuota(sessionId, delta = 1) {
  const sid = String(sessionId || '').trim();
  if (!sid) return;
  try {
    const prev = await loadArchyThreadMemory(sessionId);
    const used = (prev?.schedulingQuotaUsed || 0) + delta;
    await supabaseAdmin.from('ao_archy_thread_memory').upsert(
      {
        session_id: sid,
        thread_summary: prev?.summary || '',
        scheduling_quota_used: used,
        message_count: prev?.messageCount || 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    );
  } catch {
    /* noop */
  }
}
