import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { listArchivedAutoThreads } from '../../../../lib/ao/autoHub.js';

function clampInt(v, fallback, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const limit = clampInt(req.query?.limit, 20, 1, 80);
    const offset = clampInt(req.query?.offset, 0, 0, 100000);
    const search =
      typeof req.query?.q === 'string'
        ? req.query.q
        : typeof req.query?.search === 'string'
          ? req.query.search
          : '';

    const pack = await listArchivedAutoThreads(auth.email, { limit, offset, search });
    return res.status(200).json({
      ok: true,
      drafts: pack.drafts,
      total: pack.total,
      limit: pack.limit,
      offset: pack.offset,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Could not load drafts' });
  }
}
