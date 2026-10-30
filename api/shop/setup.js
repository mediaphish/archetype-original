/**
 * POST (Bart only) -> connects the shop to Stripe (2026-10-28): registers the
 * webhook on his Stripe account and keeps its signing secret, so he only ever
 * pastes one key into the site's settings. 2026-10-30: the shop now does this
 * on its own (lib/shop/connectWebhook.js); this stays for a manual redo.
 */
import { requireOwnerSession } from '../../lib/ao/requireAoSession.js';
import { stripeReady } from '../../lib/shop/stripe.js';
import { getSetting } from '../../lib/shop/shop.js';
import { connectWebhook } from '../../lib/shop/connectWebhook.js';

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;
  if (!stripeReady()) return res.status(200).json({ ok: false, error: 'The Stripe key is not in the site settings yet.' });
  if (req.method === 'GET') {
    const have = await getSetting('stripe_webhook_secret');
    return res.status(200).json({ ok: true, stripe: true, webhook: Boolean(have?.secret) });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  try {
    return res.status(200).json(await connectWebhook({ force: true }));
  } catch (err) {
    return res.status(200).json({ ok: false, error: err?.message || 'Stripe did not answer.' });
  }
}
