/**
 * Team tasks: the record of who on Auto's team is working on what.
 * See notes/PLAN-auto-team.md and lib/ao/team/runTask.js.
 */
import { supabaseAdmin } from '../../supabase-admin.js';
import { AGENTS, normalizeAgent } from './agents.js';

const OWNER = () => String(process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com').toLowerCase();
const OPEN = ['queued', 'running', 'needs_bart'];

function nowIso() {
  return new Date().toISOString();
}

export async function getTask(id) {
  if (!id) return null;
  const { data } = await supabaseAdmin.from('ao_team_tasks').select('*').eq('id', id).maybeSingle();
  return data || null;
}

export async function getOpenTaskForThread(threadId) {
  if (!threadId) return null;
  const { data } = await supabaseAdmin
    .from('ao_team_tasks')
    .select('*')
    .eq('thread_id', threadId)
    .in('status', OPEN)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

export async function updateTask(id, patch) {
  const { data, error } = await supabaseAdmin
    .from('ao_team_tasks')
    .update({ ...patch, updated_at: nowIso() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, task: data };
}

/**
 * Create a task and the conversation it runs in. The conversation is parked
 * (status archived, not user-archived) so it shows in Bart's list without
 * replacing the conversation he has open.
 */
export async function createTask({ agent, title, brief, assignedBy = 'auto', parentThreadId = null, maxPasses = 8, email = OWNER() }) {
  const a = normalizeAgent(agent);
  const t = String(title || '').trim().slice(0, 140);
  const b = String(brief || '').trim();
  if (!t) return { ok: false, error: 'title is required' };
  if (!b) return { ok: false, error: 'brief is required' };
  const owner = String(email || OWNER()).toLowerCase();

  const { data: task, error } = await supabaseAdmin
    .from('ao_team_tasks')
    .insert({
      agent: a,
      title: t,
      brief: b,
      assigned_by: String(assignedBy || 'auto').toLowerCase(),
      parent_thread_id: parentThreadId || null,
      max_passes: Math.min(Math.max(Number(maxPasses) || 8, 1), 20),
      created_by_email: owner,
    })
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };

  const stamp = nowIso();
  const { data: thread, error: threadErr } = await supabaseAdmin
    .from('ao_auto_threads')
    .insert({
      created_by_email: owner,
      title: `${AGENTS[a].name}: ${t}`.slice(0, 160),
      current_mode: 'plan',
      status: 'archived',
      state: { agent: a, task_id: task.id, user_archived: false },
      created_at: stamp,
      updated_at: stamp,
      last_message_at: stamp,
    })
    .select('id')
    .single();
  if (threadErr) {
    await updateTask(task.id, { status: 'failed', error: `Could not open the task's conversation: ${threadErr.message}` });
    return { ok: false, error: threadErr.message };
  }
  const linked = await updateTask(task.id, { thread_id: thread.id });
  return { ok: true, task: linked.task || { ...task, thread_id: thread.id } };
}

/** Every task for the board: what needs Bart first, then what is moving, then recent finished work. */
export async function listBoard({ limit = 40 } = {}) {
  const { data, error } = await supabaseAdmin
    .from('ao_team_tasks')
    .select('id, agent, title, status, assigned_by, thread_id, parent_thread_id, question, summary, last_note, error, passes, max_passes, created_at, updated_at, finished_at')
    .order('updated_at', { ascending: false })
    .limit(Math.min(Math.max(Number(limit) || 40, 1), 100));
  if (error) return { ok: false, error: error.message };
  const rows = (data || []).map((r) => ({ ...r, agent_name: AGENTS[r.agent]?.name || r.agent }));
  const order = { needs_bart: 0, running: 1, queued: 2, failed: 3, done: 4, cancelled: 5 };
  rows.sort((x, y) => (order[x.status] ?? 9) - (order[y.status] ?? 9) || String(y.updated_at).localeCompare(String(x.updated_at)));
  return {
    ok: true,
    needs_bart: rows.filter((r) => r.status === 'needs_bart'),
    working: rows.filter((r) => r.status === 'running' || r.status === 'queued'),
    finished: rows.filter((r) => ['done', 'failed', 'cancelled'].includes(r.status)).slice(0, 15),
  };
}
