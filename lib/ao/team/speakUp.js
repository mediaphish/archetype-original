/**
 * The whole team in every thread (notes/PLAN-auto-chat-first.md, Phase 1).
 *
 * Bart, 2026-10-25: "Every chat can be a full group chat with everyone being
 * able to speak up at will or on request. It brings all the experience we have
 * to the table for every project."
 *
 * One teammate answers. Then this asks, once, whether anyone else on the team
 * has something real to add from their own area: a risk, a fact, a better
 * idea. Most of the time the answer is nobody, so Bart never gets four replies
 * to one question. Whoever has something then speaks in their own turn.
 */
import { supabaseAdmin } from '../../supabase-admin.js';
import { AGENTS, AGENT_KEYS, normalizeAgent } from './agents.js';

export const MAX_SPEAKERS = 2;

/** Pure: the question put to the team after a reply. */
export function speakUpPrompt({ question, reply, answeredBy, channel = null }) {
  const others = AGENT_KEYS.filter((k) => k !== answeredBy);
  return `A small team works with Bart Paden, like a company in Slack. ${AGENTS[answeredBy]?.name || 'Ada'} just answered Bart${channel ? ` in #${channel}` : ''}.

The others on the team:
${others.map((k) => `- ${k}: ${AGENTS[k].name}, ${AGENTS[k].role}. ${AGENTS[k].lane}`).join('\n')}

BART ASKED:
${String(question || '').slice(0, 3000)}

THE ANSWER:
${String(reply || '').slice(0, 5000)}

Does any of the others have something real to add from their own area: a risk the answer missed, a fact only they would know, a better idea, or a next step that is theirs? Speak up too, always, when the answer breaks one of Bart's standing rules (the most important: public content never shows how Bart builds or uses AI; no invented facts, people or numbers; no em dashes) or does not fit the bigger goal. ${answeredBy === 'auto' ? '' : 'Ada runs the team and is the one who keeps the whole in view, so she speaks up whenever the answer does not fit it. '}Only say yes when it would change what Bart does or knows. Agreeing, repeating, or adding polish is not a reason. Most of the time the answer is nobody.

Return JSON only: { "speakers": [ { "agent": "one of ${others.join(', ')}", "note": "in a few words, what they would add" } ] }, at most ${MAX_SPEAKERS}, or an empty list.`;
}

/** Pure: who speaks, held to the team and the limit. */
export function pickSpeakers(raw, answeredBy) {
  const list = Array.isArray(raw?.speakers) ? raw.speakers : [];
  const out = [];
  for (const s of list) {
    const k = String(s?.agent || '').toLowerCase().trim();
    if (!AGENTS[k] || k === answeredBy || out.some((o) => o.agent === k)) continue;
    const note = String(s?.note || '').trim().slice(0, 200);
    if (!note) continue;
    out.push({ agent: k, name: AGENTS[k].name, note });
    if (out.length >= MAX_SPEAKERS) break;
  }
  return out;
}

/** Pure: the last thing Bart asked and the reply to it, or null when there is nothing to weigh in on. */
export function lastExchange(messages = []) {
  const list = Array.isArray(messages) ? messages : [];
  let replyIdx = -1;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i].role === 'assistant') {
      replyIdx = i;
      break;
    }
  }
  if (replyIdx < 0) return null;
  let askIdx = -1;
  for (let i = replyIdx - 1; i >= 0; i -= 1) {
    if (list[i].role === 'user') {
      askIdx = i;
      break;
    }
  }
  if (askIdx < 0) return null;
  const ask = String(list[askIdx].content || '');
  // A teammate's own turn, a background task or a system note is not Bart asking.
  if (/^\[(TEAM|TEAM TASK|SYSTEM)/.test(ask.trim()) || list[askIdx].meta?.team_note || list[askIdx].meta?.team_task) return null;
  return {
    question: ask,
    reply: String(list[replyIdx].content || ''),
    answeredBy: normalizeAgent(list[replyIdx].meta?.agent),
  };
}

/**
 * Who on the team has something to add to the last reply in this thread.
 * @returns {Promise<{ ok: true, speakers: Array<{agent, name, note}> }>}
 */
export async function whoSpeaksUp({ owner, threadId, complete = null } = {}) {
  const { data: thread } = await supabaseAdmin
    .from('ao_auto_threads')
    .select('id, state')
    .eq('id', threadId)
    .eq('created_by_email', String(owner || '').toLowerCase())
    .maybeSingle();
  if (!thread) return { ok: false, error: 'No such thread', speakers: [] };
  if (thread.state?.task_id || thread.state?.crm_ask) return { ok: true, speakers: [] };
  const { data: rows } = await supabaseAdmin
    .from('ao_auto_messages')
    .select('role, content, meta, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(12);
  const exchange = lastExchange((rows || []).reverse());
  if (!exchange) return { ok: true, speakers: [] };
  try {
    const ask = complete || (await import('../textModel.js')).completeJson;
    const raw = await ask({
      task: 'analysis',
      effort: 'low',
      maxTokens: 1200,
      timeoutMs: 30000,
      prompt: speakUpPrompt({ ...exchange, channel: thread.state?.channel || null }),
    });
    return { ok: true, speakers: pickSpeakers(raw, exchange.answeredBy) };
  } catch (err) {
    console.warn('[speak-up] check did not run:', err?.message || err);
    return { ok: true, speakers: [] };
  }
}

/** Pure: what the teammate is asked when it is their turn to add something. */
export function speakUpMessage({ name, note }) {
  return `[TEAM] ${name}, you have something to add to the answer above: ${note}. Add it in a few lines, as yourself. Do not repeat what was already said, and do not speak for anyone else.`;
}
