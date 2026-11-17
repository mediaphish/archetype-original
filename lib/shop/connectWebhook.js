/**
 * Connects the shop to Stripe's purchase notifications (2026-10-30). Runs on
 * its own the first time the shop is used after the Stripe key is in the
 * site settings, so Bart never has to press a setup button. Any earlier
 * notification pointed at this site is replaced, so there is only ever one.
 */
import { stripeRequest, stripeReady } from './stripe.js';
import { getSetting, setSetting } from './shop.js';

export const HOOK_URL = 'https://www.archetypeoriginal.com/api/shop/webhook';

// The shop's checkouts, plus ALI's yearly plans (2026-11-17, lib/ali-billing.js).
// A notification set up before ALI billing has only the first two; re-running
// the shop setup (POST /api/shop/setup) replaces it with one that has them all.
export const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
];

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
    enabled_events: WEBHOOK_EVENTS,
    description: 'Archetype Original shop and ALI billing',
  });
  await setSetting('stripe_webhook_secret', { id: hook.id, secret: hook.secret, events: WEBHOOK_EVENTS, at: new Date().toISOString() });
  return { ok: true, webhook: true };
}

let pending = null;
/** Once per warm server: connect if the key is in and nothing is connected yet. Never throws. */
export function ensureWebhook() {
  if (!stripeReady()) return Promise.resolve(null);
  if (!pending) pending = connectWebhook().catch((err) => { pending = null; console.error('[shop] webhook connect failed:', err?.message || err); return null; });
  return pending;
}
