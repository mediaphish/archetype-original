/**
 * The shop (2026-10-28): guides sold as downloads, and apparel drops.
 *
 * A guide: the buyer pays on Stripe, the webhook records the order, and an
 * email with a download link goes out at once, with nobody involved.
 * A drop: one design, orders taken while the window is open, then Bart's
 * local printer does the run and the orders are shipped.
 * A book: sold where it already sells (Lulu, SamCart). The shop lists it and
 * sends the buyer to that store.
 */
import crypto from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';
import { productEmailHtml } from '../calendly/emailLayout.js';

export const SHOP_BUCKET = 'ao-shop-files';
const PUBLIC_FIELDS = 'slug, kind, title, subtitle, description, price_cents, shipping_cents, cover_url, sizes, status, opens_at, closes_at, buy_url, page_path, sort_order, sample_urls, free_url, free_label';

/** Pure: whether a product can be bought right now. */
export function isBuyable(p, now = new Date()) {
  if (!p || p.status !== 'live') return false;
  if (p.opens_at && new Date(p.opens_at) > now) return false;
  if (p.closes_at && new Date(p.closes_at) <= now) return false;
  return true;
}

export async function listProducts() {
  const { data } = await supabaseAdmin.from('ao_shop_products').select(PUBLIC_FIELDS).in('status', ['live', 'closed']).order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  return data || [];
}

export async function getProduct(slug, { withFile = false } = {}) {
  const fields = withFile ? `id, file_path, stripe_product_id, stripe_free_coupon_id, ${PUBLIC_FIELDS}` : PUBLIC_FIELDS;
  const { data } = await supabaseAdmin.from('ao_shop_products').select(fields).eq('slug', String(slug || '')).maybeSingle();
  return data || null;
}

export async function getSetting(key) {
  const { data } = await supabaseAdmin.from('ao_bit_settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}

export async function setSetting(key, value) {
  return supabaseAdmin.from('ao_bit_settings').upsert({ key, value, updated_at: new Date().toISOString() });
}

/** A fresh link to the guide's file, good for a day. */
export async function downloadUrl(token) {
  const { data: order } = await supabaseAdmin
    .from('ao_shop_orders')
    .select('id, status, product:ao_shop_products(file_path, title)')
    .eq('download_token', String(token || ''))
    .maybeSingle();
  if (!order?.product?.file_path || order.status === 'refunded') return null;
  const { data } = await supabaseAdmin.storage.from(SHOP_BUCKET).createSignedUrl(order.product.file_path, 60 * 60 * 24, { download: true });
  return data?.signedUrl || null;
}

/** Pure: the email a guide buyer gets, in the brand look (Bart, 2026-11-01). A free copy is not thanked as a purchase. */
export function guideEmail({ title, subtitle = '', link, name, cover = null, free = false }) {
  const hi = name ? `Hi ${String(name).split(' ')[0]},` : 'Hi,';
  const opening = free ? `Here is your copy of ${title}.` : `Thank you for buying ${title}. Your copy is ready.`;
  const note = 'It is a printable PDF, and the worksheets work best on paper with a pen. This link always gets you a fresh download, so keep this email.';
  const text = `${hi}\n\n${opening}\n\n${link}\n\n${note}\n\nBart Paden\nArchetype Original`;
  const html = productEmailHtml({ greeting: hi, opening, cover, coverAlt: subtitle ? `${title}: ${subtitle}` : title, cta: { label: `Download ${title}`, url: link }, note: note.replace('This link', 'This button') });
  return { subject: `Your copy of ${title}`, text, html };
}

/** The webhook: a paid checkout becomes an order; a guide is delivered at once. */
export async function recordPaidCheckout(session, { origin = 'https://www.archetypeoriginal.com', send = null } = {}) {
  // A free code leaves Stripe saying no payment was required; that order still gets delivered.
  if (!session?.id || !['paid', 'no_payment_required'].includes(session.payment_status)) return { ok: true, skipped: true };
  const product = await getProduct(session.metadata?.product_slug, { withFile: true });
  if (!product) return { ok: false, error: 'Unknown product' };
  const token = product.kind === 'guide' ? crypto.randomBytes(24).toString('hex') : null;
  const row = {
    product_id: product.id,
    stripe_session_id: session.id,
    email: session.customer_details?.email || null,
    name: session.customer_details?.name || null,
    size: session.metadata?.size || null,
    amount_cents: session.amount_total ?? null,
    shipping: session.shipping_details || session.collected_information?.shipping_details || null,
    status: 'paid',
    download_token: token,
  };
  const ins = await supabaseAdmin.from('ao_shop_orders').upsert(row, { onConflict: 'stripe_session_id', ignoreDuplicates: true }).select('id, download_token, delivered_at');
  const order = ins.data?.[0];
  // Already recorded (Stripe retries): nothing more to do.
  if (!order) return { ok: true, duplicate: true };
  if (product.kind !== 'guide' || !row.email) return { ok: true, order_id: order.id };
  const cover = product.cover_url ? new URL(product.cover_url, origin).href : null;
  const mail = guideEmail({ title: product.title, subtitle: product.subtitle, name: row.name, cover, free: !row.amount_cents, link: `${origin}/api/shop/download?token=${order.download_token}` });
  const sender = send || (async (m) => {
    const { Resend } = await import('resend');
    return new Resend(process.env.RESEND_API_KEY).emails.send(m);
  });
  const from = process.env.RESEND_FROM || 'Bart Paden <bart@archetypeoriginal.com>';
  const sent = await sender({ from, to: row.email, subject: mail.subject, text: mail.text, html: mail.html });
  if (sent?.error) return { ok: false, error: sent.error.message || 'Email failed', order_id: order.id };
  await supabaseAdmin.from('ao_shop_orders').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', order.id);
  return { ok: true, order_id: order.id, delivered: true };
}
