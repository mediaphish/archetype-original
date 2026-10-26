/**
 * Every 30 minutes: anyone in the podcast pipeline whose prep is missing gets
 * handed to Cam, the producer, as a background task, one at a time. September's plan
 * found people waiting weeks with nothing prepared and failures that surfaced
 * only as "Not available." Now the Producer picks them up and Bart is emailed
 * when each one is ready. Secured by CRON_SECRET.
 */
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { listPodcastGuests } from '../../../lib/ao/team/producer.js';
import { createTask } from '../../../lib/ao/team/tasks.js';
import { kickTask } from '../../../lib/ao/team/runTask.js';

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || req.query?.secret || '';
  const provided = String(auth).replace(/^Bearer\s+/i, '');
  if (!cronSecret || provided !== cronSecret) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  try {
    const list = await listPodcastGuests();
    if (!list.ok) return res.status(500).json(list);
    const waiting = list.guests.filter((g) => !g.prepared && g.release_agreed);

    for (const g of waiting) {
      // One Producer task per person: skip anyone already in hand, or tried
      // and stuck in the last two days (Bart sees that on the board).
      const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const { data: prior } = await supabaseAdmin
        .from('ao_team_tasks')
        .select('id, status, created_at')
        .eq('agent', 'producer')
        .ilike('brief', `%${g.id}%`)
        .order('created_at', { ascending: false })
        .limit(1);
      const last = prior?.[0];
      if (last && (['queued', 'running', 'needs_bart', 'done'].includes(last.status) || last.created_at > since)) continue;

      const out = await createTask({
        agent: 'producer',
        title: `Prepare ${g.name} (${g.track})`,
        brief: [
          `${g.name} is in the podcast pipeline (${g.track}, submitted ${g.submitted || 'recently'}) and has not been prepared. Guest id: ${g.id}.`,
          'Call podcast_prepare_guest with that id. If a step fails, say plainly which and why.',
          `When it is done, call task_update with status "done" and a summary Bart can read on his phone: who ${g.name} is in two lines, ${g.track === 'mentor session' ? 'the problem they brought in one line, ' : ''}and that the full brief is on their podcast record.`,
        ].join('\n'),
        assignedBy: 'auto',
        maxPasses: 3,
      });
      if (!out.ok) return res.status(500).json(out);
      await kickTask(out.task.id);
      return res.status(200).json({ ok: true, assigned: g.name, task_id: out.task.id });
    }
    return res.status(200).json({ ok: true, assigned: null, waiting: waiting.length });
  } catch (err) {
    console.error('[producer-intake]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
