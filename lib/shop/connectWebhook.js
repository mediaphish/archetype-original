/**
 * Connects the shop to Stripe's purchase notifications (2026-10-30). Runs on
 * its own the first time the shop is used after the Stripe key is in the
 * site settings, so Bart never has to press a setup button. Any earlier
 * notification pointed at this site is replaced, so there is only ever one.
 */
import { stripeRequest, stripeReady } from './stripe.js';
import { getSetting, setSetting } from './shop.js';

export const HOOK_URL = 'https://www.archetypeoriginal.com/api/shop/webhook';

export async function connectWebhook({ force = false } = {}) {
  if (!stripeReady()) return { ok: false, error: 'The Stripe key is not in the site settings yet.' };
  const have = await getSetting('stripe_webhook_secret');
  if (have?.secret && !force) return { ok: true, webhook: true, already: true };
  const existing = await stripeRequest('/webhook_endpoints?limit=100', null, 'GET').catch(() => ({ data: [] }));
  for (const h of existing?.data || []) {
    if (h.url === HOOK_URL) await stripeRequest(`/webhook_endpoints/${h.id}`, null, 'DELETE').catch(() => null);
  }
  const hook = await stripeRequest('/webhook_endpoints', {
    url: HOOK_URL,
    enabled_events: ['checkout.session.completed', 'checkout.session.async_payment_succeeded'],
    description: 'Archetype Original shop',
  });
  await setSetting('stripe_webhook_secret', { id: hook.id, secret: hook.secret, at: new Date().toISOString() });
  return { ok: true, webhook: true };
}

let pending = null;
/** Once per warm server: connect if the key is in and nothing is connected yet. Never throws. */
export function ensureWebhook() {
  if (!stripeReady()) return Promise.resolve(null);
  if (!pending) pending = connectWebhook().catch((err) => { pending = null; console.error('[shop] webhook connect failed:', err?.message || err); return null; });
  return pending;
}
