/**
 * POST (Bart only) -> makes a free code for a guide (2026-11-01). He usually
 * asks Auto (make_free_guide_code); this is the same thing from his session.
 */
import { requireOwnerSession } from '../../lib/ao/requireAoSession.js';
import { stripeReady } from '../../lib/shop/stripe.js';
import { makeFreeCode } from '../../lib/shop/freeCodes.js';

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!stripeReady()) return res.status(200).json({ ok: false, error: 'The Stripe key is not in the site settings yet.' });
  try {
    const { slug, uses, code, note } = req.body || {};
    return res.status(200).json(await makeFreeCode({ slug, uses, code, note }));
  } catch (err) {
    return res.status(200).json({ ok: false, error: err?.message || 'Stripe did not answer.' });
  }
}
