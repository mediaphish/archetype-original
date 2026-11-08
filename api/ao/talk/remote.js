/**
 * The phone remote for a live talk (2026-10-28).
 * GET  /api/ao/talk/remote?slug=...                     -> { ok, state }
 * POST /api/ao/talk/remote { slug, action, photo_url?, index? } -> { ok, state }   action: next | back | photo | at
 *   at: the big screen reports which slide it is on, so the iPad shows that slide's script.
 *   first: back to the title slide, to start over.
 * POST /api/ao/talk/remote { slug, upload: true }       -> signed upload for the room photo
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getRemote, setRemote, setRemoteIndex, photoUploadTarget } from '../../../lib/ao/talkDemo.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;
  if (req.method === 'GET') return res.status(200).json({ ok: true, state: await getRemote(String(req.query?.slug || '')) });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const slug = String(body.slug || '').trim();
  if (!slug) return res.status(400).json({ ok: false, error: 'slug is required' });
  if (body.upload) return res.status(200).json(await photoUploadTarget());
  const action = String(body.action || '');
  if (!['next', 'back', 'first', 'photo', 'at'].includes(action)) return res.status(400).json({ ok: false, error: 'action must be next, back, first, photo or at' });
  if (action === 'at') return res.status(200).json(await setRemoteIndex(slug, Math.max(0, Math.floor(Number(body.index) || 0))));
  const patch = { action, ...(action === 'photo' ? { photo_url: String(body.photo_url || '') } : {}) };
  return res.status(200).json(await setRemote(slug, patch));
}
