/**
 * POST /api/ao/talk/demo { slug, photo_url }            -> { ok, package, lines }
 * POST /api/ao/talk/demo { post: true, package, live }  -> { ok, results | rehearsal }
 * "Live from the room" in a talk. A rehearsal never posts. See lib/ao/talkDemo.js.
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { runDemo, postDemo, noteDemo, CHANNEL_NAMES } from '../../../lib/ao/talkDemo.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const body = typeof req.body === 'object' && req.body ? req.body : {};
  try {
    const slug = String(body.slug || '');
    if (body.post) {
      const out = await postDemo({ package: body.package, rehearse: body.live !== true });
      await noteDemo(slug, { posted: out.rehearsal ? 'rehearsal' : Boolean(out.ok), posted_at: new Date().toISOString() }).catch(() => {});
      return res.status(200).json(out);
    }
    const started = Date.now();
    const out = await runDemo({ slug, photoUrl: body.photo_url });
    if (out.ok) {
      const caption = Object.values(out.package?.captions || {})[0] || '';
      await noteDemo(slug, { seconds: (Date.now() - started) / 1000, at: new Date().toISOString(), caption, channels: Object.values(CHANNEL_NAMES), posted: null }).catch(() => {});
    }
    return res.status(200).json(out);
  } catch (err) {
    return res.status(502).json({ ok: false, error: err?.message || 'The demo hit a snag.' });
  }
}
