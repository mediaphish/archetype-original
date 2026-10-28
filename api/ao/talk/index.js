/**
 * GET /api/ao/talk?slug=... -> { ok, talk }   (one talk)
 * GET /api/ao/talk          -> { ok, talks }  (all, newest first)
 * A talk Bart gives from inside Auto. See lib/ao/talks.js.
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getTalk, listTalks } from '../../../lib/ao/talks.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const slug = String(req.query?.slug || '').trim();
  if (slug) {
    const talk = await getTalk(slug);
    return talk ? res.status(200).json({ ok: true, talk }) : res.status(404).json({ ok: false, error: 'No talk by that name.' });
  }
  return res.status(200).json({ ok: true, talks: await listTalks() });
}
