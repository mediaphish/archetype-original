/**
 * The team board for Bart's screen.
 * GET: what needs Bart, what is moving, what finished.
 * POST { action: 'create', agent, title, brief } | { action: 'cancel', id } | { action: 'retry', id }
 */
import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { listBoard, createTask, updateTask, getTask } from '../../../lib/ao/team/tasks.js';
import { kickTask } from '../../../lib/ao/team/runTask.js';

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;

  try {
    if (req.method === 'GET') {
      const board = await listBoard({ limit: Number(req.query?.limit) || 40 });
      const { countWaiting } = await import('../../../lib/ao/team/outbox.js');
      return res.status(200).json({ ...board, emails_waiting: await countWaiting().catch(() => 0) });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const body = req.body || {};
    if (body.action === 'create') {
      const out = await createTask({ agent: body.agent, title: body.title, brief: body.brief, assignedBy: 'bart', email: auth.email });
      if (out.ok) await kickTask(out.task.id);
      return res.status(out.ok ? 200 : 400).json(out);
    }
    const task = await getTask(String(body.id || ''));
    if (!task) return res.status(404).json({ ok: false, error: 'Task not found' });
    if (body.action === 'cancel') {
      return res.status(200).json(await updateTask(task.id, { status: 'cancelled', finished_at: new Date().toISOString() }));
    }
    if (body.action === 'retry') {
      const out = await updateTask(task.id, { status: 'queued', error: null, max_passes: Math.max(task.max_passes || 8, (task.passes || 0) + 4) });
      await kickTask(task.id);
      return res.status(200).json(out);
    }
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    console.error('[team/tasks]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
