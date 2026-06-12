/**
 * GET /api/ao/auto/guest-search?q=...
 * Search podcast guest intake submissions by name or email.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { searchGuests } from '../../../lib/ao/guestIntakeStore.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const query = String(req.query?.q || '').trim();

  try {
    const result = await searchGuests({ query, limit: 12 });
    if (!result.ok) {
      const status = result.error === 'guest_intake_table_missing' ? 503 : 500;
      return res.status(status).json({ ok: false, error: result.error });
    }
    return res.status(200).json({ ok: true, guests: result.guests });
  } catch (err) {
    console.error('[guest-search]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
