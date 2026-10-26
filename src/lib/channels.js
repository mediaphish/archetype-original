/**
 * Browser copy of channelOfThread in lib/ao/team/channels.js (a test holds the
 * two to the same answers): which channel a thread belongs to.
 */
export function channelOfThread(thread) {
  const st = thread?.state && typeof thread.state === 'object' ? thread.state : {};
  if (st.channel) return String(st.channel);
  if (st.crm_ask) return 'crm';
  if (st.task_id) return 'team';
  // The one-on-one chats with Jot, Vox and Cam become the history of #team.
  const agent = String(st.agent || 'auto').toLowerCase();
  return ['jot', 'reach', 'producer'].includes(agent) ? 'team' : 'general';
}

/** Threads grouped by channel key, newest first in each. */
export function groupByChannel(threads = []) {
  const out = {};
  for (const t of threads) {
    const k = channelOfThread(t);
    (out[k] = out[k] || []).push(t);
  }
  const at = (t) => Date.parse(t.updated_at || t.last_message_at || t.created_at || 0) || 0;
  for (const k of Object.keys(out)) out[k].sort((a, b) => at(b) - at(a));
  return out;
}
