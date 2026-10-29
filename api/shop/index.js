/**
 * The shop's public side (2026-10-28).
 * GET              -> the guides, books and drops on sale
 * GET ?slug=x      -> one of them
 * POST { slug, size, quantity } -> a Stripe checkout link
 */
import { listProducts, getProduct, isBuyable } from '../../lib/shop/shop.js';
import { stripeRequest, stripeReady, checkoutParams } from '../../lib/shop/stripe.js';

const ORIGIN = 'https://www.archetypeoriginal.com';

/** A book needs only its store link; guides and drops need Stripe. */
const canBuy = (p) => isBuyable(p) && (p.kind === 'book' ? Boolean(p.buy_url) : stripeReady());

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const slug = String(req.query?.slug || '');
      if (slug) {
        const p = await getProduct(slug);
        if (!p || p.status === 'draft') return res.status(404).json({ ok: false, error: 'Not found' });
        return res.status(200).json({ ok: true, product: { ...p, buyable: canBuy(p) } });
      }
      const list = await listProducts();
      return res.status(200).json({ ok: true, products: list.map((p) => ({ ...p, buyable: canBuy(p) })) });
    }
    if (req.method === 'POST') {
      const { slug, size = null, quantity = 1 } = req.body || {};
      const p = await getProduct(slug);
      if (!isBuyable(p)) return res.status(400).json({ ok: false, error: 'This is not on sale right now.' });
      // Books are bought at their own store, never through this checkout.
      if (p.kind === 'book') return res.status(400).json({ ok: false, error: 'This one is bought at its store.' });
      if (p.kind === 'apparel' && (!size || !(p.sizes || []).includes(size))) return res.status(400).json({ ok: false, error: 'Pick a size.' });
      if (!stripeReady()) return res.status(503).json({ ok: false, error: 'Checkout is not open yet.' });
      const session = await stripeRequest('/checkout/sessions', checkoutParams({ product: p, size, quantity, origin: ORIGIN }));
      return res.status(200).json({ ok: true, url: session.url });
    }
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('[shop]', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Checkout did not start. Please try again.' });
  }
}
