/**
 * POST (Bart only) -> connects the shop to Stripe (2026-10-28): registers the
 * webhook on his Stripe account and keeps its signing secret, so he only ever
 * pastes one key into the site's settings.
 */
import { requireOwnerSession } from '../../lib/ao/requireAoSession.js';
import { stripeRequest, stripeReady } from '../../lib/shop/stripe.js';
import { getSetting, setSetting } from '../../lib/shop/shop.js';

const HOOK_URL = 'https://www.archetypeoriginal.com/api/shop/webhook';

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;
  if (!stripeReady()) return res.status(200).json({ ok: false, error: 'The Stripe key is not in the site settings yet.' });
  const have = await getSetting('stripe_webhook_secret');
  if (req.method === 'GET') return res.status(200).json({ ok: true, stripe: true, webhook: Boolean(have?.secret) });
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  try {
    if (have?.id) await stripeRequest(`/webhook_endpoints/${have.id}`, null, 'DELETE').catch(() => null);
    const hook = await stripeRequest('/webhook_endpoints', {
      url: HOOK_URL,
      enabled_events: ['checkout.session.completed', 'checkout.session.async_payment_succeeded'],
      description: 'Archetype Original shop',
    });
    await setSetting('stripe_webhook_secret', { id: hook.id, secret: hook.secret, at: new Date().toISOString() });
    return res.status(200).json({ ok: true, webhook: true });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err?.message || 'Stripe did not answer.' });
  }
}
