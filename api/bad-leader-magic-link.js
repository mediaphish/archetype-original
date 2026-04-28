import { createMagicLinkToken } from '../lib/badLeaderAuth.js';

async function sendMagicEmail({ email, magicLink }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return { ok: true, skipped: true };

  const fromEmail = process.env.RESEND_FROM || 'Archetype Original <noreply@archetypeoriginal.com>';
  const subject = 'Sign in to Bad Leader Project Admin';
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1A1A1A;">
      <h1 style="font-family: Georgia, serif; font-weight: 400;">Bad Leader Project Admin</h1>
      <p>Use the secure link below to sign in.</p>
      <p><a href="${magicLink}" style="display:inline-block;background:#2B2929;color:#fff;padding:12px 20px;text-decoration:none;border-radius:2px;">Open admin dashboard</a></p>
      <p style="color:#6B6B6B;font-size:13px;">This link expires in 15 minutes. If you did not request this, ignore this email.</p>
      <p style="font-size:12px;color:#6B6B6B;">${magicLink}</p>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to send email: ${errText}`);
  }
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required.' });

    const { token } = await createMagicLinkToken(email, req);
    const baseUrl = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
    const magicLink = `${baseUrl}/api/bad-leader-magic-verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    const emailResult = await sendMagicEmail({ email, magicLink });

    return res.status(200).json({
      ok: true,
      message: 'Magic link sent.',
      ...(process.env.NODE_ENV !== 'production' ? { link: magicLink, emailSkipped: Boolean(emailResult?.skipped) } : {}),
    });
  } catch (error) {
    console.error('[BLP MAGIC LINK SEND] Error:', error);
    return res.status(500).json({ error: 'Failed to send magic link.' });
  }
}
