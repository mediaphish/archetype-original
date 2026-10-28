/**
 * The team huddle: teammates talking to each other in Bart's thread.
 *
 * Bart, 2026-10-26: "Would like to see them interacting with each other more.
 * Right now it's one way communication with me." Then: "Build it."
 *
 * When a teammate has something real to add to an answer, the team huddles in
 * the same conversation. Ada runs it: each step she picks who speaks next and
 * to whom, and why. Every turn has to challenge, fix, decide or build on
 * something; agreeing, thanking and repeating are not turns. It is capped, it
 * stops as soon as they have settled it, and Ada closes with Bart in a few
 * lines: what they decided, and at most one question that is truly his.
 *
 * Each turn is a full teammate turn (runChatTurn) in its own function run, so
 * a long turn never cuts the huddle short. The huddle lives on the thread
 * (ao_auto_threads.state.huddle); the five-minute team sweep picks up any that
 * stalled.
 */
import { supabaseAdmin } from '../../supabase-admin.js';
import { AGENTS, AGENT_KEYS, normalizeAgent } from './agents.js';
import { shortenedCopy } from '../shortenedCopy.js';

export const MAX_TURNS = 4;
const LOCK_MS = 5 * 60 * 1000;
const SITE = () => String(process.env.SITE_URL || 'https://www.archetypeoriginal.com').replace(/\/$/, '');
const nowIso = () => new Date().toISOString();

/** Pure: the conversation as the moderator reads it, newest last, the team's notes left out. */
export function huddleTranscript(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .filter((m) => m.role === 'assistant' || (m.role === 'user' && !m.meta?.team_note && !m.meta?.team_task && !/^\s*\[(TEAM|TEAM TASK|SYSTEM)/.test(String(m.content || ''))))
    .map((m) => `${m.role === 'user' ? 'Bart' : AGENTS[normalizeAgent(m.meta?.agent)]?.name || 'Ada'}: ${shortenedCopy(String(m.content || '').replace(/\[ARTIFACT[\s\S]*?\[\/ARTIFACT\]/g, '[the draft]'), 8000)}`)
    .join('\n\n');
}

/** Pure: Ada's question each step. */
export function moderatorPrompt({ transcript, turns, last }) {
  return `You are Ada, the Marketing Director, running a short huddle with your team inside Bart Paden's conversation. The team:
${AGENT_KEYS.map((k) => `- ${k}: ${AGENTS[k].name}, ${AGENTS[k].role}. ${AGENTS[k].lane}`).join('\n')}

THE CONVERSATION SO FAR (newest last):
${String(transcript || '').slice(-12000)}

Turns taken in this huddle: ${turns} of ${MAX_TURNS}.${last ? ` Last to speak: ${last}.` : ''}

Decide the next turn. A turn must do real work: challenge something said, fix something, decide something between two teammates, or build on an idea with something new. Agreeing, thanking, praising, repeating and summarizing are not turns. The speaker talks to one teammate by name, not to Bart. Never pick the one who just spoke. Stop as soon as the team has settled it, or when another turn would not change what Bart gets.

Return JSON only: either { "next": "one of ${AGENT_KEYS.join(', ')}", "to": "the teammate they speak to, one of ${AGENT_KEYS.join(', ')}", "note": "in a few words, what they need to say or settle" } or { "next": "done", "note": "in a few words, what was settled" }.`;
}

/** Pure: the moderator's answer, held to the rules. */
export function pickNextTurn(raw, { turns = 0, last = null } = {}) {
  if (turns >= MAX_TURNS) return { done: true, note: 'The huddle reached its limit.' };
  const next = String(raw?.next || '').toLowerCase().trim();
  if (!next || next === 'done' || !AGENTS[next]) return { done: true, note: String(raw?.note || '').slice(0, 300) };
  if (next === last) return { done: true, note: String(raw?.note || '').slice(0, 300) };
  let to = String(raw?.to || '').toLowerCase().trim();
  if (!AGENTS[to] || to === next) to = last && last !== next ? last : next === 'auto' ? 'jot' : 'auto';
  const note = String(raw?.note || '').trim().slice(0, 300);
  if (!note) return { done: true, note: '' };
  return { done: false, agent: next, to, note };
}

/** Pure: what the teammate is asked on their turn. */
export function huddleTurnMessage({ agent, to, note }) {
  const name = AGENTS[agent]?.name || 'Ada';
  const toName = AGENTS[to]?.name || 'Ada';
  return `[TEAM] Huddle. ${name}, your turn: ${note}. Speak to ${toName} directly, by name, in a few lines, as yourself. Challenge it, fix it, decide it with them, or build on it with something new; if the fix is yours to make, make it with your tools. Do not agree just to agree, do not thank or praise, do not repeat what was said, and do not address Bart; Ada closes with him.`;
}

export const CLOSE_MESSAGE =
  '[TEAM] Huddle done. Ada, close it with Bart in a few lines: what the team decided or changed, and at most one question that is truly his. Do not retell the huddle, and do not repeat what the others said.';

async function loadThread(threadId) {
  const { data } = await supabaseAdmin.from('ao_auto_threads').select('id, state, created_by_email').eq('id', threadId).maybeSingle();
  return data || null;
}

async function saveHuddle(thread, huddle) {
  const state = { ...(thread.state && typeof thread.state === 'object' ? thread.state : {}), huddle };
  await supabaseAdmin.from('ao_auto_threads').update({ state }).eq('id', thread.id);
  return state;
}

/** Start the next step in its own function run. */
export async function kickHuddle(threadId) {
  const secret = process.env.CRON_SECRET || '';
  try {
    await fetch(`${SITE()}/api/ao/team/run?huddle=${encodeURIComponent(threadId)}`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      signal: AbortSignal.timeout(2500),
    });
  } catch (_) {
    // Timing out is expected: the step keeps running there. The sweep catches a lost hand-off.
  }
}

/** Begin a huddle in this thread, unless one is already going. */
export async function startHuddle({ owner, threadId, opener = null }) {
  const thread = await loadThread(threadId);
  if (!thread || String(thread.created_by_email || '').toLowerCase() !== String(owner || '').toLowerCase()) return { ok: false, error: 'No such thread' };
  if (thread.state?.huddle?.active) return { ok: true, already: true };
  await saveHuddle(thread, {
    active: true,
    turns: 0,
    last: null,
    opener: opener && AGENTS[opener.agent] ? { agent: opener.agent, to: AGENTS[opener.to] ? opener.to : 'auto', note: String(opener.note || '').slice(0, 300) } : null,
    started_at: nowIso(),
    lock_at: null,
    closing: false,
  });
  await kickHuddle(threadId);
  return { ok: true, started: true };
}

/**
 * End the huddle now, without Ada's close: Bart has spoken, and his message is
 * what gets answered (2026-10-27). A turn already being written still lands.
 */
export async function stopHuddle(threadId, reason = 'stopped') {
  const thread = await loadThread(threadId);
  const h = thread?.state?.huddle;
  if (!h?.active) return { ok: true, stopped: false };
  await saveHuddle(thread, { ...h, active: false, closing: false, lock_at: null, ended_at: nowIso(), stopped: String(reason).slice(0, 80) });
  return { ok: true, stopped: true };
}

/** Run one step: Ada picks the next turn and it runs, or Ada closes. */
export async function runHuddleStep(threadId, { complete = null, runTurn = null } = {}) {
  const thread = await loadThread(threadId);
  const h = thread?.state?.huddle;
  if (!h?.active) return { ok: true, skipped: 'no huddle' };
  // Over the day's spend line the huddle waits (spendStop.js). Tests pass their own turn runner.
  if (!runTurn) {
    const { backgroundSpendStop } = await import('./spendStop.js');
    if ((await backgroundSpendStop()).stop) return { ok: true, skipped: 'paused for spend' };
  }
  if (h.lock_at && Date.now() - Date.parse(h.lock_at) < LOCK_MS) return { ok: true, skipped: 'step running' };
  await saveHuddle(thread, { ...h, lock_at: nowIso() });

  const turn =
    runTurn ||
    (async ({ agent, message }) => {
      const { runChatTurn } = await import('../../../api/ao/auto/chat.js');
      let failure = null;
      await runChatTurn({
        email: thread.created_by_email,
        body: { message, thread_id: threadId, agent, message_meta: { team_note: true, huddle: true } },
        sendEvent: (event, data) => {
          if (event === 'error') failure = data?.error || 'failed';
        },
      });
      return { ok: !failure, error: failure };
    });

  // The close, once decided.
  if (h.closing) {
    await turn({ agent: 'auto', message: CLOSE_MESSAGE });
    const fresh = await loadThread(threadId);
    await saveHuddle(fresh, { ...fresh.state.huddle, active: false, closing: false, lock_at: null, ended_at: nowIso() });
    return { ok: true, closed: true };
  }

  let next;
  if (h.turns === 0 && h.opener) {
    next = { done: false, agent: h.opener.agent, to: h.opener.to === h.opener.agent ? 'auto' : h.opener.to || 'auto', note: h.opener.note };
  } else {
    const { data: rows } = await supabaseAdmin
      .from('ao_auto_messages')
      .select('role, content, meta, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(14);
    const transcript = huddleTranscript((rows || []).reverse());
    let raw = null;
    try {
      const ask = complete || (await import('../textModel.js')).completeJson;
      raw = await ask({ task: 'analysis', effort: 'low', maxTokens: 800, timeoutMs: 30000, prompt: moderatorPrompt({ transcript, turns: h.turns, last: h.last }) });
    } catch (err) {
      console.warn('[huddle] moderator did not run:', err?.message || err);
    }
    next = pickNextTurn(raw, { turns: h.turns, last: h.last });
  }

  if (next.done) {
    const fresh = await loadThread(threadId);
    // Nothing was said in the huddle: no close is needed either.
    if (!h.turns) {
      await saveHuddle(fresh, { ...fresh.state.huddle, active: false, lock_at: null, ended_at: nowIso() });
      return { ok: true, ended: 'nothing to add' };
    }
    await saveHuddle(fresh, { ...fresh.state.huddle, closing: true, lock_at: null, settled: next.note || null });
    await kickHuddle(threadId);
    return { ok: true, closing: true };
  }

  await turn({ agent: next.agent, message: huddleTurnMessage(next) });
  const fresh = await loadThread(threadId);
  await saveHuddle(fresh, { ...fresh.state.huddle, turns: (h.turns || 0) + 1, last: next.agent, lock_at: null });
  await kickHuddle(threadId);
  return { ok: true, turn: next };
}

/** Pick up huddles whose next step was lost. Used by the five-minute team sweep. */
export async function sweepHuddles({ max = 3 } = {}) {
  const { data } = await supabaseAdmin.from('ao_auto_threads').select('id, state').contains('state', { huddle: { active: true } }).limit(10);
  const stale = (data || []).filter((t) => {
    const h = t.state?.huddle;
    return h?.active && (!h.lock_at || Date.now() - Date.parse(h.lock_at) > LOCK_MS);
  });
  for (const t of stale.slice(0, max)) await kickHuddle(t.id);
  return { kicked: Math.min(stale.length, max) };
}
