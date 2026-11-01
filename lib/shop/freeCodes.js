/**
 * Free codes for the shop (Bart, 2026-11-01): "We need discount codes so I can
 * give the book away when needed." A code takes 100% off one product only and
 * is good for a set number of uses. The buyer types it at checkout, pays
 * nothing, and gets the guide by email like anyone else.
 *
 * Stripe holds the codes, so each product keeps a lasting Stripe product and
 * one coupon limited to it. Checkout uses that same Stripe product, which is
 * what lets the coupon apply.
 */
import crypto from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';
import { stripeRequest } from './stripe.js';
import { getProduct } from './shop.js';

const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Pure: a code that is easy to read aloud, with no 0/O or 1/I/L to mix up. */
export function newCode(bytes = crypto.randomBytes(6)) {
  return `FREE-${Array.from(bytes, (b) => LETTERS[b % LETTERS.length]).join('')}`;
}

/** Pure: the code to use, or null when a requested one is not usable. */
export function cleanCode(code) {
  const c = String(code || '').trim().toUpperCase().replace(/\s+/g, '-');
  return /^[A-Z0-9-]{3,30}$/.test(c) ? c : null;
}

async function ensureStripeIds(product) {
  let { stripe_product_id: prod, stripe_free_coupon_id: coupon } = product;
  if (!prod) {
    prod = (await stripeRequest('/products', { name: product.title, metadata: { slug: product.slug } })).id;
    await supabaseAdmin.from('ao_shop_products').update({ stripe_product_id: prod }).eq('id', product.id);
  }
  if (!coupon) {
    coupon = (await stripeRequest('/coupons', { percent_off: 100, duration: 'once', name: `${product.title}, free copy`.slice(0, 40), applies_to: { products: [prod] } })).id;
    await supabaseAdmin.from('ao_shop_products').update({ stripe_free_coupon_id: coupon }).eq('id', product.id);
  }
  return { prod, coupon };
}

export async function makeFreeCode({ slug = 'holding-the-line', uses = 1, code = null, note = '' } = {}) {
  const product = await getProduct(slug, { withFile: true });
  if (!product) return { ok: false, error: `No product called ${slug}.` };
  if (product.kind !== 'guide') return { ok: false, error: 'Free codes are for guides.' };
  const wanted = code ? cleanCode(code) : newCode();
  if (!wanted) return { ok: false, error: 'A code can use letters, numbers and dashes, 3 to 30 characters.' };
  const count = Math.max(1, Math.min(500, Math.floor(Number(uses) || 1)));
  const { coupon } = await ensureStripeIds(product);
  const base = { code: wanted, max_redemptions: count, metadata: { note: String(note || '').slice(0, 200), slug } };
  let made;
  try {
    made = await stripeRequest('/promotion_codes', { ...base, coupon });
  } catch (err) {
    // Newer Stripe accounts name the coupon differently.
    if (!/coupon|promotion|parameter/i.test(err?.message || '')) throw err;
    made = await stripeRequest('/promotion_codes', { ...base, promotion: { type: 'coupon', coupon } });
  }
  return { ok: true, code: made.code, uses: count, guide: product.title, link: `https://www.archetypeoriginal.com/guides/${slug}` };
}
