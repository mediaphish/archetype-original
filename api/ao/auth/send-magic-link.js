/**
 * AO Automation Dashboard — Send magic link (single-owner only).
 * POST /api/ao/auth/send-magic-link
 * Body: { email: string }
 * Only the email in AO_OWNER_EMAIL (env) is allowed.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import crypto from 'crypto';

const OWNER_EMAIL = (process.env.AO_OWNER_EMAIL || '').toLowerCase().trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address required' });
    }

    const emailLower = email.toLowerCase().trim();

    if (!OWNER_EMAIL) {
      console.error('[AO auth] AO_OWNER_EMAIL not configured');
      return res.status(503).json({ error: 'Login not configured' });
    }

    if (emailLower !== OWNER_EMAIL) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const { error: tokenError } = await supabaseAdmin
      .from('ao_magic_link_tokens')
      .insert({
        email: emailLower,
        token,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (tokenError) {
      console.error('[AO auth] Token storage error:', tokenError);
      return res.status(500).json({ error: 'Failed to generate magic link' });
    }

    const siteUrl = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
    const magicLink = `${siteUrl}/api/ao/auth/verify-magic-link?token=${token}&email=${encodeURIComponent(emailLower)}`;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.log('[AO auth] Development mode - link:', magicLink);
      return res.status(200).json({
        ok: true,
        message: 'Magic link sent',
        ...(process.env.NODE_ENV !== 'production' && { link: magicLink })
      });
    }

    const fromEmail = process.env.RESEND_FROM || 'Archetype Original <noreply@archetypeoriginal.com>';
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 10px;">Sign in to AO Automation</h1>
            <p style="color: #666; font-size: 16px;">Click the button below to sign in to your dashboard.</p>
          </div>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${magicLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Sign In</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <a href="${magicLink}" style="color: #2563eb; word-break: break-all;">${magicLink}</a>
          </p>
        </body>
      </html>
    `;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: emailLower, subject: 'Sign in to AO Automation', html: emailHtml })
    });

    if (!emailRes.ok) {
      const errData = await emailRes.json().catch(() => ({}));
      console.error('[AO auth] Email send error:', errData);
      return res.status(500).json({ error: 'Failed to send magic link email' });
    }

    return res.status(200).json({ ok: true, message: 'Magic link sent to your email' });
  } catch (err) {
    console.error('[AO auth] Send error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
