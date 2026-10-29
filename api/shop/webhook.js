/**
 * Stripe calls this when a checkout is paid (2026-10-28). The order is
 * recorded and a guide's download email goes out at once.
 */
import { verifyStripeSignature } from '../../lib/shop/stripe.js';
import { recordPaidCheckout, getSetting } from '../../lib/shop/shop.js';

export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  if (typeof req.body === 'string') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const body = await rawBody(req);
  const secret = process.env.STRIPE_WEBHOOK_SECRET || (await getSetting('stripe_webhook_secret'))?.secret;
  if (!verifyStripeSignature(req.headers['stripe-signature'], body, secret)) return res.status(401).json({ ok: false, error: 'Bad signature' });
  let event = null;
  try {
    event = JSON.parse(body);
  } catch {
    return res.status(400).json({ ok: false });
  }
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') return res.status(200).json({ ok: true, ignored: event.type });
  const out = await recordPaidCheckout(event.data?.object);
  if (!out.ok) console.error('[shop webhook]', out.error);
  // A failure answers 500 so Stripe tries again later.
  return res.status(out.ok ? 200 : 500).json(out);
}
