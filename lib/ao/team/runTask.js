/**
 * Runs team tasks in the background, one pass at a time, through the same Auto
 * turn the chat uses (runChatTurn in api/ao/auto/chat.js). A pass is one full
 * turn with every tool, check and save. Between passes the task is queued and
 * the next pass is started at once; a cron every five minutes picks up anything
 * that was interrupted.
 *
 * Bart, 2026-10-25: "Then they run autonomously until they need me again."
 */
import { supabaseAdmin } from '../../supabase-admin.js';
import { AGENTS } from './agents.js';
import { getTask, updateTask } from './tasks.js';

const STALE_MS = 8 * 60 * 1000;
const SITE = () => String(process.env.SITE_URL || 'https://www.archetypeoriginal.com').replace(/\/$/, '');
const OWNER = () => String(process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com').toLowerCase();

function nowIso() {
  return new Date().toISOString();
}

/** Start the next pass in its own function run. Waits only long enough to hand off. */
export async function kickTask(taskId) {
  if (!taskId) return;
  const secret = process.env.CRON_SECRET || '';
  try {
    await fetch(`${SITE()}/api/ao/team/run?task=${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      signal: AbortSignal.timeout(2500),
    });
  } catch (_) {
    // The hand-off timing out is expected: the pass keeps running there. The
    // five-minute sweep starts it if the hand-off never arrived.
  }
}

/** Take a task for one pass, only if nobody else is running it. */
async function claim(taskId) {
  const task = await getTask(taskId);
  if (!task) return null;
  const stale = task.status === 'running' && Date.now() - Date.parse(task.heartbeat_at || 0) > STALE_MS;
  if (task.status !== 'queued' && !stale) return null;
  const { data } = await supabaseAdmin
    .from('ao_team_tasks')
    .update({
      status: 'running',
      heartbeat_at: nowIso(),
      started_at: task.started_at || nowIso(),
      passes: (task.passes || 0) + 1,
      updated_at: nowIso(),
    })
    .eq('id', taskId)
    .eq('status', task.status)
    .eq('updated_at', task.updated_at)
    .select('*')
    .maybeSingle();
  return data || null;
}

export function passMessage(task, { resumedAfterBart = false } = {}) {
  const who = AGENTS[task.assigned_by]?.name || (task.assigned_by === 'bart' ? 'Bart' : 'Ada');
  const rules =
    'You are working in the background; Bart is not watching this conversation right now. Work it through on your own, ' +
    'the way his own team did: solve problems yourself, and do not ask permission for anything the brief already asks for. ' +
    'Save real work with your tools as you go so nothing lives only in this conversation. ' +
    'Do not narrate your process; write only the reply Bart will read. ' +
    'At the end of this pass call task_update: "done" with a short summary of what you produced and where it is, ' +
    '"needs_bart" with one clear question that is truly his to decide, or "continue" with a note on what is left for the next pass.';
  if (resumedAfterBart) {
    return `[TEAM TASK] Bart answered above. Pick up "${task.title}" from there and finish it.\n\n${rules}`;
  }
  if ((task.passes || 0) <= 1) {
    return `[TEAM TASK from ${who}] ${task.title}\n\n${task.brief}\n\n${rules}`;
  }
  const where = task.last_note ? `\n\nWhere you left off: ${task.last_note}` : '';
  return `[TEAM TASK, pass ${task.passes} of ${task.max_passes}] Keep going on "${task.title}".${where}\n\n${rules}`;
}

async function notify(task) {
  if (!task || task.notified_at && Date.parse(task.notified_at) >= Date.parse(task.updated_at)) return;
  try {
    const [{ sendToBart }, { noticeHtml }] = await Promise.all([
      import('../../calendly/followups.js'),
      import('../../calendly/emailLayout.js'),
    ]);
    const name = AGENTS[task.agent]?.name || 'Ada';
    const url = task.thread_id ? `${SITE()}/ao/review?thread=${task.thread_id}` : `${SITE()}/ao/review`;
    let subject;
    let title;
    let lines;
    if (task.status === 'needs_bart') {
      subject = `${name} needs you: ${task.title}`;
      title = `${name} has a question`;
      lines = [task.title, task.question || 'Open the conversation to see what is needed.'];
    } else if (task.status === 'done') {
      subject = `${name} finished: ${task.title}`;
      title = `${name} finished`;
      lines = [task.title, task.summary || ''];
    } else if (task.status === 'failed') {
      subject = `${name} got stuck: ${task.title}`;
      title = `${name} got stuck`;
      lines = [task.title, task.error || 'Open the conversation to see where it stopped.'];
    } else {
      return;
    }
    await sendToBart({
      subject,
      html: noticeHtml({ title, lines, cta: { label: 'Open the conversation', url }, eyebrow: 'Auto · Team' }),
    });
    await supabaseAdmin.from('ao_team_tasks').update({ notified_at: nowIso() }).eq('id', task.id);
  } catch (err) {
    console.warn('[team] notify failed:', err?.message || err);
  }
}

/**
 * Run one pass of a task. Returns what happened, and starts the next pass when
 * there is more to do.
 */
export async function runTaskPass(taskId, { resumedAfterBart = false } = {}) {
  const task = await claim(taskId);
  if (!task) return { ok: true, skipped: true, reason: 'not runnable right now' };
  if (!task.thread_id) {
    await updateTask(task.id, { status: 'failed', error: 'The task has no conversation to run in.' });
    return { ok: false, error: 'no thread' };
  }

  const { runChatTurn } = await import('../../../api/ao/auto/chat.js');
  let done = null;
  let failure = null;
  await runChatTurn({
    email: task.created_by_email || OWNER(),
    body: {
      message: passMessage(task, { resumedAfterBart }),
      thread_id: task.thread_id,
      agent: task.agent,
      task_id: task.id,
      message_meta: { team_task: true, task_id: task.id, pass: task.passes, from: task.assigned_by },
    },
    sendEvent: (event, data) => {
      if (event === 'done') done = data;
      if (event === 'error') failure = data?.error || 'The pass ended with an error';
    },
  });

  const after = await getTask(task.id);
  if (!after) return { ok: false, error: 'task disappeared' };

  if (after.status === 'running') {
    // The pass ended without a task_update.
    // Bart reads this on the board, so it is said plainly; the detail goes to the log.
    if (failure) console.warn('[team] pass error for', after.id, String(failure).slice(0, 500));
    const note = failure ? 'The last pass ran into a problem; trying again.' : after.last_note;
    if ((after.passes || 0) >= (after.max_passes || 8)) {
      const res = await updateTask(after.id, {
        status: failure ? 'failed' : 'needs_bart',
        error: failure ? 'It kept running into a problem and stopped after its last pass. Tap Try again, or open the conversation to see where it got to.' : null,
        question: failure
          ? null
          : `${AGENTS[after.agent]?.name || 'Ada'} has worked ${after.passes} passes without calling it finished. Read where it stands and say how to proceed.`,
      });
      await notify(res.task);
      return { ok: true, status: res.task?.status };
    }
    await updateTask(after.id, { status: 'queued', last_note: note || null });
    await kickTask(after.id);
    return { ok: true, status: 'queued', continued: true, error: failure || undefined };
  }

  if (after.status === 'queued') {
    await kickTask(after.id);
    return { ok: true, status: 'queued', continued: true };
  }

  if (['needs_bart', 'done', 'failed'].includes(after.status)) await notify(after);
  return { ok: true, status: after.status, reply: done?.assistant_message ? String(done.assistant_message).slice(0, 400) : null };
}

/** Pick up queued work and anything interrupted. Used by the five-minute cron. */
export async function sweepTasks({ maxKicks = 5 } = {}) {
  const staleBefore = new Date(Date.now() - STALE_MS).toISOString();
  const { data } = await supabaseAdmin
    .from('ao_team_tasks')
    .select('id, status, heartbeat_at')
    .or(`status.eq.queued,and(status.eq.running,heartbeat_at.lt.${staleBefore})`)
    .order('updated_at', { ascending: true })
    .limit(maxKicks);
  const ids = (data || []).map((r) => r.id);
  for (const id of ids) await kickTask(id);
  return { ok: true, kicked: ids.length };
}
