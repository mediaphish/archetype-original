/**
 * Stripe for the shop (2026-10-28), called directly over its web API so the
 * site needs no extra package. Bart pastes his own keys into the site's
 * settings: STRIPE_SECRET_KEY, and the webhook signing secret is saved by
 * /api/shop/setup when it registers the webhook.
 */
import { createHmac, timingSafeEqual } from 'crypto';

const API = 'https://api.stripe.com/v1';

/** Pure: Stripe's form encoding, nested keys as a[b][0][c]. */
export function formEncode(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === 'object') out.push(formEncode(item, `${key}[${i}]`));
        else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(item)}`);
      });
    } else if (typeof v === 'object') {
      out.push(formEncode(v, key));
    } else {
      out.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
    }
  }
  return out.filter(Boolean).join('&');
}

export function stripeReady() {
  return /^sk_(live|test)_/.test(String(process.env.STRIPE_SECRET_KEY || ''));
}

export async function stripeRequest(path, params = null, method = 'POST') {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!stripeReady()) throw new Error('Stripe is not connected yet.');
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params && method !== 'GET' ? formEncode(params) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `Stripe ${r.status}`);
  return j;
}

/** Pure: the checkout request for one product. */
export function checkoutParams({ product, size = null, quantity = 1, origin }) {
  const q = Math.max(1, Math.min(10, Number(quantity) || 1));
  const params = {
    mode: 'payment',
    line_items: [
      {
        quantity: q,
        price_data: {
          currency: 'usd',
          unit_amount: product.price_cents,
          product_data: { name: size ? `${product.title} (${size})` : product.title },
        },
      },
    ],
    success_url: `${origin}/guides/thanks?order={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/guides/${product.slug}`,
    metadata: { product_slug: product.slug, size: size || '' },
    allow_promotion_codes: 'true',
  };
  if (product.kind === 'apparel') {
    params.shipping_address_collection = { allowed_countries: ['US'] };
    params.shipping_options = [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: 'Shipping after the print run',
          fixed_amount: { amount: product.shipping_cents || 0, currency: 'usd' },
        },
      },
    ];
    params.success_url = `${origin}/guides/thanks?order={CHECKOUT_SESSION_ID}&drop=1`;
  }
  return params;
}

/** Pure: whether a Stripe-Signature header matches the raw body. */
export function verifyStripeSignature(header, body, secret, toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    String(header).split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    })
  );
  const t = Number(parts.t);
  const sigs = String(header).split(',').filter((p) => p.trim().startsWith('v1=')).map((p) => p.trim().slice(3));
  if (!t || !sigs.length || Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}
