import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import {
  listUpcomingScheduleSlots,
  createScheduleSlot,
} from '../../../lib/ao/podcastScheduleStore.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    try {
      const result = await listUpcomingScheduleSlots();
      if (!result.ok) {
        const status = result.error === 'schedule_table_missing' ? 503 : 500;
        return res.status(status).json({ ok: false, error: result.error });
      }
      return res.status(200).json({ ok: true, slots: result.slots });
    } catch (err) {
      console.error('[ao/podcast/schedule GET]', err);
      return res.status(500).json({ ok: false, error: err.message || 'Server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const date = String(body.date || '').trim();
      const time = String(body.time || '').trim();
      if (!date || !time) {
        return res.status(400).json({ ok: false, error: 'date and time are required' });
      }

      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      if (Number.isNaN(new Date(scheduledAt).getTime())) {
        return res.status(400).json({ ok: false, error: 'Invalid date or time' });
      }

      const result = await createScheduleSlot({
        guest_id: body.guest_id || null,
        episode_title: String(body.episode_title || '').trim() || null,
        scheduled_at: scheduledAt,
        notes: String(body.notes || '').trim() || null,
      });

      if (!result.ok) {
        const status = result.error === 'schedule_table_missing' ? 503 : 500;
        return res.status(status).json({ ok: false, error: result.error });
      }

      return res.status(200).json({ ok: true, slot: result.slot });
    } catch (err) {
      console.error('[ao/podcast/schedule POST]', err);
      return res.status(500).json({ ok: false, error: err.message || 'Server error' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
