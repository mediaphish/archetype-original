/**
 * Calendly webhook: someone booked or cancelled.
 *
 * Re-applies Bart's conversation hours straight away, so a Wednesday booking
 * closes the other Wednesday window and a full week closes, before the next
 * visitor looks at the booking page. See lib/calendly/conversationHours.js.
 *
 * Signed by Calendly with CALENDLY_WEBHOOK_SIGNING_KEY (header
 * Calendly-Webhook-Signature: t=<unix>,v1=<hex hmac of "t.body">).
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { applyConversationHours } from '../../lib/calendly/client.js';

const TOLERANCE_SECONDS = 5 * 60;

async function rawBody(req) {
  if (typeof req.body === 'string') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export function verifySignature(header, body, key, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!header || !key) return false;
  const parts = Object.fromEntries(
    String(header)
      .split(',')
      .map((p) => p.trim().split('='))
      .filter((kv) => kv.length === 2)
  );
  const t = Number(parts.t);
  if (!t || !parts.v1 || Math.abs(nowSeconds - t) > TOLERANCE_SECONDS) return false;
  const expected = createHmac('sha256', key).update(`${t}.${body}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(parts.v1));
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const body = await rawBody(req);
  const key = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!verifySignature(req.headers['calendly-webhook-signature'], body, key)) {
    return res.status(401).json({ ok: false, error: 'Bad signature' });
  }

  let event = null;
  try {
    event = JSON.parse(body);
  } catch {
    return res.status(400).json({ ok: false, error: 'Bad JSON' });
  }

  try {
    const result = await applyConversationHours();
    console.log('[calendly-webhook]', event?.event, JSON.stringify(result));
    return res.status(200).json({ ok: true, event: event?.event, applied: result.ok });
  } catch (err) {
    // 200 anyway: the daily job re-applies, and a retry storm helps nobody.
    console.error('[calendly-webhook] apply failed:', err?.message || err);
    return res.status(200).json({ ok: false, error: err?.message || 'apply failed' });
  }
}
