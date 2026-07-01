import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import {
  listGuestsPaginated,
  searchGuests,
  getGuestEpisodeStatusMap,
  enrichGuestDirectoryRow,
} from '../../../lib/ao/guestIntakeStore.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const query = String(req.query?.q || '').trim();
  const page = parseInt(req.query?.page || '1', 10) || 1;

  try {
    const statusMap = await getGuestEpisodeStatusMap();

    if (query.length >= 2) {
      const result = await searchGuests({ query, limit: 25 });
      if (!result.ok) {
        const status = result.error === 'guest_intake_table_missing' ? 503 : 500;
        return res.status(status).json({ ok: false, error: result.error });
      }
      return res.status(200).json({
        ok: true,
        guests: (result.guests || []).map((g) => enrichGuestDirectoryRow(g, statusMap)),
        total: result.guests?.length || 0,
        page: 1,
        pageSize: result.guests?.length || 0,
        search: true,
      });
    }

    const result = await listGuestsPaginated({ page, pageSize: 20 });
    if (!result.ok) {
      const status = result.error === 'guest_intake_table_missing' ? 503 : 500;
      return res.status(status).json({ ok: false, error: result.error });
    }

    return res.status(200).json({
      ok: true,
      guests: (result.guests || []).map((g) => enrichGuestDirectoryRow(g, statusMap)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      search: false,
    });
  } catch (err) {
    console.error('[ao/podcast/guests]', err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}
