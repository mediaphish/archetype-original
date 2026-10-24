/**
 * Zoom tells us a cloud recording's transcript is ready
 * (recording.transcript_completed). We fetch the transcript with the one-time
 * download token Zoom includes, keep it for the 15-minute job to match and
 * read (lib/calendly/transcriptIntake.js), and answer Zoom right away: Zoom
 * wants a reply within three seconds.
 *
 * Every call is signed by Zoom with ZOOM_WEBHOOK_SECRET; anything unsigned is
 * turned away. Downloads only ever go to zoom.us.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { queueIncoming } from '../../lib/calendly/transcriptIntake.js';

const TOLERANCE_SECONDS = 5 * 60;

async function rawBody(req) {
  if (typeof req.body === 'string') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export function verifyZoom(headers, body, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const ts = Number(headers['x-zm-request-timestamp']);
  const sig = String(headers['x-zm-signature'] || '');
  if (!secret || !ts || !sig || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) return false;
  const expected = `v0=${createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isZoomDownload(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'zoom.us' || u.hostname.endsWith('.zoom.us'));
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const secret = process.env.ZOOM_WEBHOOK_SECRET;
  const body = await rawBody(req);
  let event = null;
  try {
    event = JSON.parse(body);
  } catch {
    return res.status(400).json({ ok: false, error: 'Bad JSON' });
  }

  // Zoom checks the address once when the app is set up.
  if (event?.event === 'endpoint.url_validation') {
    const plainToken = String(event.payload?.plainToken || '');
    if (!secret || !plainToken) return res.status(400).json({ ok: false });
    return res.status(200).json({ plainToken, encryptedToken: createHmac('sha256', secret).update(plainToken).digest('hex') });
  }

  if (!verifyZoom(req.headers, body, secret)) return res.status(401).json({ ok: false, error: 'Bad signature' });
  if (event?.event !== 'recording.transcript_completed') return res.status(200).json({ ok: true, ignored: event?.event || null });

  const obj = event.payload?.object || {};
  const file = (obj.recording_files || []).find((f) => String(f.file_type).toUpperCase() === 'TRANSCRIPT' && f.download_url);
  if (!file || !isZoomDownload(file.download_url)) return res.status(200).json({ ok: true, ignored: 'no transcript file' });

  try {
    const token = event.download_token || '';
    const url = `${file.download_url}${file.download_url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) throw new Error(`download ${r.status}`);
    const transcript = await r.text();
    await queueIncoming({
      source: 'zoom',
      externalId: String(obj.uuid || file.id || ''),
      meetingId: obj.id != null ? String(obj.id) : null,
      startedAt: obj.start_time || null,
      topic: obj.topic || null,
      transcript,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[zoom webhook] transcript not kept:', err?.message || err);
    // A 500 makes Zoom try again later, which is what we want here.
    return res.status(500).json({ ok: false });
  }
}
