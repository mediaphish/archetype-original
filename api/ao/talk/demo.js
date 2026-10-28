/**
 * POST /api/ao/talk/demo { slug, photo_url }            -> { ok, package, lines }
 * POST /api/ao/talk/demo { post: true, package, live }  -> { ok, results | rehearsal }
 * "Live from the room" in a talk. A rehearsal never posts. See lib/ao/talkDemo.js.
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { runDemo, postDemo } from '../../../lib/ao/talkDemo.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const body = typeof req.body === 'object' && req.body ? req.body : {};
  try {
    if (body.post) return res.status(200).json(await postDemo({ package: body.package, rehearse: body.live !== true }));
    return res.status(200).json(await runDemo({ slug: String(body.slug || ''), photoUrl: body.photo_url }));
  } catch (err) {
    return res.status(502).json({ ok: false, error: err?.message || 'The demo hit a snag.' });
  }
}
