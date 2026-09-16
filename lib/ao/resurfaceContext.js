/**
 * Is this conversation resurface work?
 *
 * Decided from Bart's own messages, never from a label Auto passes. Bart,
 * 2026-09-16: the duplicate check must not "bleed into non-resurface post work.
 * I can see Auto screwing up and ignoring the no duplicate rule all together."
 * If Auto could declare its own work a resurface, that is exactly how it would
 * skip the rule.
 *
 * Resurface work is exempt from the published-duplicate check because overlap
 * is its purpose: "It's supposed to have overlap, but use new information found
 * online via web search to expand on it."
 */
const RESURFACE_WORD = /\bresurfac(?:e|es|ed|ing)\b/i;

/** Pure: do Bart's recent messages ask for resurface work? */
export function isResurfaceConversation(userMessages) {
  return (Array.isArray(userMessages) ? userMessages : []).some((m) => RESURFACE_WORD.test(String(m || '')));
}

/** Bart's most recent messages in the thread, newest last. */
export async function loadRecentUserMessages(threadId, limit = 20) {
  if (!threadId) return [];
  const { supabaseAdmin } = await import('../supabase-admin.js');
  const { data, error } = await supabaseAdmin
    .from('ao_auto_messages')
    .select('content, created_at')
    .eq('thread_id', threadId)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).reverse().map((r) => r.content);
}
