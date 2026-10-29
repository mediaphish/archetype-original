/**
 * @jest-environment node
 *
 * The shop (2026-10-28): guides delivered by email the moment they are paid
 * for, and apparel drops taken while the window is open.
 */
import { createHmac } from 'crypto';
import { readFileSync } from 'fs';

jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));

import { formEncode, checkoutParams, verifyStripeSignature } from '../shop/stripe.js';
import { isBuyable, guideEmail } from '../shop/shop.js';

const guide = { slug: 'holding-the-line', kind: 'guide', title: 'Holding the Line', price_cents: 3500 };
const shirt = { slug: 'lay-down-your-crown-01', kind: 'apparel', title: 'Lay Down Your Crown', price_cents: 4200, shipping_cents: 600, sizes: ['M', 'L'] };

describe('Stripe checkout', () => {
  it('encodes nested fields the way Stripe reads them', () => {
    const s = formEncode({ a: 1, line_items: [{ price_data: { unit_amount: 3500 } }], list: ['US'] });
    expect(s).toContain('a=1');
    expect(decodeURIComponent(s)).toContain('line_items[0][price_data][unit_amount]=3500');
    expect(decodeURIComponent(s)).toContain('list[0]=US');
  });

  it('a guide is a one-time payment with no shipping', () => {
    const p = checkoutParams({ product: guide, origin: 'https://x' });
    expect(p.mode).toBe('payment');
    expect(p.line_items[0].price_data.unit_amount).toBe(3500);
    expect(p.shipping_address_collection).toBeUndefined();
    expect(p.metadata.product_slug).toBe('holding-the-line');
    expect(p.success_url).toBe('https://x/guides/thanks?order={CHECKOUT_SESSION_ID}');
  });

  it('a shirt carries its size, an address and the shipping charge', () => {
    const p = checkoutParams({ product: shirt, size: 'L', origin: 'https://x' });
    expect(p.line_items[0].price_data.product_data.name).toBe('Lay Down Your Crown (L)');
    expect(p.metadata.size).toBe('L');
    expect(p.shipping_address_collection.allowed_countries).toEqual(['US']);
    expect(p.shipping_options[0].shipping_rate_data.fixed_amount.amount).toBe(600);
  });

  it('only a correctly signed, recent webhook is trusted', () => {
    const secret = 'whsec_test';
    const body = '{"x":1}';
    const t = 1700000000;
    const sig = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
    expect(verifyStripeSignature(`t=${t},v1=${sig}`, body, secret, 300, t + 10)).toBe(true);
    expect(verifyStripeSignature(`t=${t},v1=${sig}`, '{"x":2}', secret, 300, t + 10)).toBe(false);
    expect(verifyStripeSignature(`t=${t},v1=${sig}`, body, secret, 300, t + 1000)).toBe(false);
    expect(verifyStripeSignature(`t=${t},v1=${sig}`, body, '', 300, t)).toBe(false);
  });
});

describe('what can be bought', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  it('needs to be live, and a drop needs its window open', () => {
    expect(isBuyable({ status: 'draft' }, now)).toBe(false);
    expect(isBuyable({ status: 'live' }, now)).toBe(true);
    expect(isBuyable({ status: 'live', opens_at: '2026-11-11T00:00:00Z' }, now)).toBe(false);
    expect(isBuyable({ status: 'live', closes_at: '2026-11-09T00:00:00Z' }, now)).toBe(false);
    expect(isBuyable({ status: 'live', opens_at: '2026-11-01T00:00:00Z', closes_at: '2026-11-20T00:00:00Z' }, now)).toBe(true);
  });
});

describe('the download email', () => {
  it('names the guide, carries the link, and never mentions how it was made', () => {
    const m = guideEmail({ title: 'Holding the Line', name: 'Pat Smith', link: 'https://x/api/shop/download?token=abc' });
    expect(m.subject).toBe('Your copy of Holding the Line');
    expect(m.text).toMatch(/^Hi Pat,/);
    expect(m.html).toContain('href="https://x/api/shop/download?token=abc"');
    expect(`${m.text}${m.html}`).not.toMatch(/\bAI\b|—/);
  });
});

it('the shop is wired into the site', () => {
  const v = JSON.parse(readFileSync('vercel.json', 'utf8'));
  for (const n of ['webhook', 'download', 'setup']) expect(v.routes.some((r) => r.src === `/api/shop/${n}`)).toBe(true);
  expect(v.routes.some((r) => r.src === '/api/shop')).toBe(true);
  expect(readFileSync('src/App.jsx', 'utf8')).toContain("path.startsWith('/guides/')) return 'guides'");
  expect(readFileSync('api/shop/webhook.js', 'utf8')).toContain('verifyStripeSignature(');
});

describe('Books in the shop (2026-10-29)', () => {
  const api = readFileSync('api/shop/index.js', 'utf8');
  const page = readFileSync('src/pages/Guides.jsx', 'utf8');

  it('a book never goes through the Stripe checkout', () => {
    expect(api).toMatch(/p\.kind === 'book'\) return res\.status\(400\)/);
  });

  it('a book can be bought once it has a store link, with or without Stripe', () => {
    expect(api).toMatch(/p\.kind === 'book' \? Boolean\(p\.buy_url\) : stripeReady\(\)/);
  });

  it('the book page sends the buyer to its store', () => {
    expect(page).toMatch(/href=\{p\.buy_url\}/);
  });
});
