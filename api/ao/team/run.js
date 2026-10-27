/**
 * Runs one pass of a team task (?task=<id>), or sweeps for queued and
 * interrupted tasks (no task, used by the five-minute cron). Called by the task
 * engine itself and by the cron, both with CRON_SECRET. See lib/ao/team/runTask.js.
 */
import { runTaskPass, sweepTasks } from '../../../lib/ao/team/runTask.js';
import { runHuddleStep, sweepHuddles } from '../../../lib/ao/team/huddle.js';

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || req.query?.secret || '';
  const provided = String(auth).replace(/^Bearer\s+/i, '');
  if (!cronSecret || provided !== cronSecret) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  try {
    const taskId = String(req.query?.task || '').trim();
    const huddleThread = String(req.query?.huddle || '').trim();
    // One huddle step (lib/ao/team/huddle.js), one task pass, or the sweep of both.
    const result = huddleThread
      ? await runHuddleStep(huddleThread)
      : taskId
        ? await runTaskPass(taskId)
        : { ...(await sweepTasks()), huddles: await sweepHuddles() };
    console.log('[team/run]', huddleThread ? `huddle ${huddleThread}` : taskId || 'sweep', JSON.stringify(result).slice(0, 500));
    return res.status(200).json(result);
  } catch (err) {
    console.error('[team/run] failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
