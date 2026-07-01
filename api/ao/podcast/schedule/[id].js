import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { deleteScheduleSlot } from '../../../../lib/ao/podcastScheduleStore.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'DELETE') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const id = String(req.query?.id || '').trim();
  if (!id) {
    return res.status(400).json({ ok: false, error: 'id required' });
  }

  try {
    const result = await deleteScheduleSlot(id);
    if (!result.ok) {
      const status = result.error === 'schedule_table_missing' ? 503 : 500;
      return res.status(status).json({ ok: false, error: result.error });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[ao/podcast/schedule DELETE]', err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}
