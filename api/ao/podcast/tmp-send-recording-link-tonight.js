/**
 * ONE-SHOT: Aug 6 2026 recording-link email to Adam & Erik Theis.
 * Uses the live site's existing Resend config (same as guest magic-link mail).
 * Remove this file and its vercel.json route immediately after a successful send.
 */
import { Resend } from 'resend';

const ONE_SHOT_TOKEN = 'c2be8444230cce28c60e4daaa1586537586b6c4091675854';
const riversideLink = 'https://riverside.com/studio/bart-padens-studio?t=dbb17d62b1cf49b05226';

function escapeHtml(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildHtml(guestName) {
  return `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1A1A1A; line-height: 1.6;">
      <h1 style="font-family: Georgia, serif; font-weight: 400; font-size: 24px;">It's time.</h1>
      <p style="font-family: system-ui, sans-serif;">${escapeHtml(guestName)},</p>
      <p style="font-family: system-ui, sans-serif;">We're recording today, August 6, at 6:00 PM Central.</p>
      <p style="font-family: system-ui, sans-serif;">Here's what you need.</p>
      <p style="font-family: system-ui, sans-serif;"><strong>Device</strong><br/>Any laptop, desktop, phone, or tablet with a camera works. No professional equipment required. If you're on a phone, make sure it's not low on storage. Riverside records locally first, then uploads, so a full phone can cause problems.</p>
      <p style="font-family: system-ui, sans-serif;"><strong>Browser</strong><br/>On a computer, use Chrome or Edge. On a phone or tablet, just use the link below.</p>
      <p style="font-family: system-ui, sans-serif;"><strong>Audio</strong><br/>A microphone helps but isn't required. Headphones aren't required either. If you use them, wired or wireless both work, just make sure wireless ones are charged.</p>
      <p style="font-family: system-ui, sans-serif;"><strong>Room</strong><br/>Find a quiet room if you can. Shut the door. Turn off fans, TVs, and music.</p>
      <p style="font-family: system-ui, sans-serif;"><strong>Camera</strong><br/>Sit where your face is clearly lit, ideally a window or lamp in front of you, not behind you. Set the camera at eye level.</p>
      <p style="font-family: system-ui, sans-serif;"><strong>Before you log in</strong><br/>Close extra tabs and apps. Put your phone on Do Not Disturb. Be ready to allow camera and microphone permissions when Riverside asks.</p>
      <p style="font-family: system-ui, sans-serif;">Log in to the studio right at 6:00 PM, not before. We'll check mics, cameras, and audio together once you're in.</p>
      <p style="margin: 24px 0;">
        <a href="${riversideLink}" style="display:inline-block;background:#DB0812;color:#fff;padding:12px 20px;text-decoration:none;border-radius:2px;font-family: system-ui, sans-serif;">Join the studio</a>
      </p>
      <p style="font-family: system-ui, sans-serif;">I'm reachable by text 10 to 15 minutes early, at <strong>+1 417 388 0680</strong>. If anything doesn't connect, or your mic or camera isn't working, text me there.</p>
      <p style="font-family: system-ui, sans-serif;">See you at 6.</p>
      <p style="font-family: system-ui, sans-serif;">Bart</p>
      <hr style="border:none;border-top:1px solid #e5e7eb; margin:24px 0;" />
      <p style="font-size:12px;color:#6B6B6B;font-family: system-ui, sans-serif;">Archetype Original. The Archetype Original Podcast</p>
    </div>
  `;
}

const recipients = [
  { name: 'Adam', email: 'adamhtheis@gmail.com' },
  { name: 'Erik', email: 'anvil2272@gmail.com' },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = String(req.headers['x-one-shot-token'] || req.body?.token || '').trim();
  if (token !== ONE_SHOT_TOKEN) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  const from = process.env.CONTACT_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    return res.status(500).json({ ok: false, error: 'email_not_configured' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const results = [];

  for (const r of recipients) {
    const result = await resend.emails.send({
      from,
      to: r.email,
      subject: 'Recording set for August 6 at 6:00 PM Central',
      html: buildHtml(r.name),
    });
    if (result?.error) {
      results.push({
        email: r.email,
        ok: false,
        error: result.error.message || String(result.error),
      });
    } else {
      results.push({
        email: r.email,
        ok: true,
        id: result?.data?.id || null,
      });
    }
  }

  const allOk = results.every((r) => r.ok);
  return res.status(allOk ? 200 : 500).json({ ok: allOk, results });
}
