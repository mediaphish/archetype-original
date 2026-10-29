/**
 * The shop (2026-10-28): guides sold as downloads, and apparel drops.
 *
 * A guide: the buyer pays on Stripe, the webhook records the order, and an
 * email with a download link goes out at once, with nobody involved.
 * A drop: one design, orders taken while the window is open, then Bart's
 * local printer does the run and the orders are shipped.
 */
import crypto from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';

export const SHOP_BUCKET = 'ao-shop-files';
const PUBLIC_FIELDS = 'slug, kind, title, subtitle, description, price_cents, shipping_cents, cover_url, sizes, status, opens_at, closes_at';

/** Pure: whether a product can be bought right now. */
export function isBuyable(p, now = new Date()) {
  if (!p || p.status !== 'live') return false;
  if (p.opens_at && new Date(p.opens_at) > now) return false;
  if (p.closes_at && new Date(p.closes_at) <= now) return false;
  return true;
}

export async function listProducts() {
  const { data } = await supabaseAdmin.from('ao_shop_products').select(PUBLIC_FIELDS).in('status', ['live', 'closed']).order('created_at', { ascending: false });
  return data || [];
}

export async function getProduct(slug, { withFile = false } = {}) {
  const fields = withFile ? `id, file_path, ${PUBLIC_FIELDS}` : PUBLIC_FIELDS;
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

/** Pure: the email a guide buyer gets. */
export function guideEmail({ title, link, name }) {
  const hi = name ? `Hi ${String(name).split(' ')[0]},` : 'Hi,';
  const text = `${hi}\n\nThank you for buying ${title}. Your copy is here:\n\n${link}\n\nThe link always gets you a fresh download, so keep this email.\n\nBart Paden\nArchetype Original`;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = `<p>${esc(hi)}</p><p>Thank you for buying <strong>${esc(title)}</strong>. Your copy is here:</p><p><a href="${esc(link)}">Download ${esc(title)}</a></p><p>The link always gets you a fresh download, so keep this email.</p><p>Bart Paden<br/>Archetype Original</p>`;
  return { subject: `Your copy of ${title}`, text, html };
}

/** The webhook: a paid checkout becomes an order; a guide is delivered at once. */
export async function recordPaidCheckout(session, { origin = 'https://www.archetypeoriginal.com', send = null } = {}) {
  if (!session?.id || session.payment_status !== 'paid') return { ok: true, skipped: true };
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
  const mail = guideEmail({ title: product.title, name: row.name, link: `${origin}/api/shop/download?token=${order.download_token}` });
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
