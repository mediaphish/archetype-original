/**
 * Reach speaks up on its own (Bart, 2026-10-25: Reach "communicating with Auto
 * and myself"). Two weekly team tasks for Reach, run in the background like any
 * other assignment; Bart gets the result by email and in its conversation.
 *
 *   ?kind=lookahead  Thursdays: next week against the rhythm, the gaps, what
 *                    could fill them, and the "Life through my eyes" nudge.
 *   ?kind=report     Mondays: what reached people last week, and one
 *                    recommendation.
 *
 * Secured by CRON_SECRET.
 */
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { createTask } from '../../../lib/ao/team/tasks.js';
import { kickTask } from '../../../lib/ao/team/runTask.js';

const BRIEFS = {
  lookahead: {
    title: 'Thursday look-ahead',
    brief: [
      'Look at next week for Bart with reach_week (week: "next") and send him the look-ahead.',
      'Day by day: what goes out, on which channels, at what times (Central). Say plainly where the week matches his rhythm and where it does not.',
      'Name every gap (no Monday Archetype entry, no Wednesday leadership entry, no Friday resurface) and, for each, the approved entries waiting for a date that could fill it, with one line on why each fits. Recommend; Bart picks.',
      'Flag anything crowded or off-rhythm. Do not move anything; only Bart moves things.',
      'End with the "Life through my eyes" nudge: one line asking for a photo from his week for his personal Instagram.',
      'Keep it short enough to read on a phone. When finished, call task_update with status "done" and put the whole look-ahead in the summary, since that is what Bart reads in his email.',
    ].join('\n'),
  },
  report: {
    title: 'Monday report',
    brief: [
      'Write Bart his Monday report on last week.',
      'Use real numbers only: reach_week for what went out last week (week: the Monday a week ago as YYYY-MM-DD), and get_recommended_schedule and get_caption_length_performance for what the engagement data shows. Instagram, X and Facebook report numbers; do not mention LinkedIn numbers.',
      'Say what reached people and what did not, in plain words, with the numbers. If the sample is too small to say anything, say that instead of inventing a winner.',
      'End with one recommendation for this week, and why. Recommend; never change anything yourself.',
      'Keep it short enough to read on a phone. When finished, call task_update with status "done" and put the whole report in the summary, since that is what Bart reads in his email.',
    ].join('\n'),
  },
};

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || req.query?.secret || '';
  const provided = String(auth).replace(/^Bearer\s+/i, '');
  if (!cronSecret || provided !== cronSecret) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const kind = String(req.query?.kind || '').trim();
  const spec = BRIEFS[kind];
  if (!spec) return res.status(400).json({ ok: false, error: 'kind must be lookahead or report' });

  try {
    // One a week: skip if this week's already exists.
    const since = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from('ao_team_tasks')
      .select('id')
      .eq('agent', 'reach')
      .eq('title', spec.title)
      .gte('created_at', since)
      .limit(1);
    if (existing && existing.length) return res.status(200).json({ ok: true, skipped: true, reason: 'already ran this week' });

    const out = await createTask({ agent: 'reach', title: spec.title, brief: spec.brief, assignedBy: 'auto', maxPasses: 4 });
    if (!out.ok) return res.status(500).json(out);
    await kickTask(out.task.id);
    return res.status(200).json({ ok: true, task_id: out.task.id });
  } catch (err) {
    console.error('[reach-weekly]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
