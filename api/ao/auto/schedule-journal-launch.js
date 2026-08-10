/**
 * POST /api/ao/auto/schedule-journal-launch
 *
 * Schedules social captions for a journal entry on its publish date (or next weekday slot).
 * Thin wrapper around scheduleJournalLaunchCaptions (shared with the schedule_captions tool).
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { scheduleJournalLaunchCaptions } from '../../../lib/ao/scheduleJournalLaunchCaptions.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { slug, title, captions } = req.body || {};
  const result = await scheduleJournalLaunchCaptions({
    email: auth.email,
    slug,
    title,
    captions,
  });

  if (!result.ok) {
    const status = /required|No captions|No valid/i.test(result.error || '') ? 400 : 500;
    if (status === 500) console.error('[schedule-journal-launch]', result.error);
    return res.status(status).json({ ok: false, error: result.error });
  }

  return res.status(200).json(result);
}
