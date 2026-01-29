/**
 * Operators Platform Magic Link - Send
 * 
 * Sends a magic link email to the user
 * 
 * POST /api/operators/auth/send-magic-link
 * Body: { email: string }
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address required' });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user exists in operators_users table (optional check, don't reveal if user doesn't exist)
    let userExists = false;
    const { data: user } = await supabaseAdmin
      .from('operators_users')
      .select('email')
      .eq('email', emailLower)
      .maybeSingle();

    if (user) {
      userExists = true;
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token in database
    const { error: tokenError } = await supabaseAdmin
      .from('operators_magic_link_tokens')
      .insert({
        email: emailLower,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false,
        ip_address: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null,
        user_agent: req.headers['user-agent'] || null
      });

    if (tokenError) {
      console.error('[OPERATORS MAGIC LINK] Token storage error:', tokenError);
      return res.status(500).json({ error: 'Failed to generate magic link' });
    }

    // Build magic link URL
    const siteUrl = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
    const magicLink = `${siteUrl}/api/operators/auth/verify-magic-link?token=${token}&email=${encodeURIComponent(emailLower)}`;

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('[OPERATORS MAGIC LINK] RESEND_API_KEY not configured');
      // In development, log the link instead
      console.log('[OPERATORS MAGIC LINK] Development mode - link:', magicLink);
      return res.status(200).json({
        ok: true,
        message: 'Magic link sent',
        // In development only, return the link
        ...(process.env.NODE_ENV !== 'production' && { link: magicLink })
      });
    }

    const fromEmail = process.env.RESEND_FROM || 'Archetype Original <noreply@archetypeoriginal.com>';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 10px;">Sign in to Operators Platform</h1>
            <p style="color: #666; font-size: 16px;">Click the button below to securely sign in to your account</p>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${magicLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              Sign In to Operators Platform
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This link will expire in 15 minutes. If you didn't request this, you can safely ignore this email.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${magicLink}" style="color: #2563eb; word-break: break-all;">${magicLink}</a>
          </p>
        </body>
      </html>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: emailLower,
        subject: 'Sign in to Operators Platform',
        html: emailHtml
      })
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('[OPERATORS MAGIC LINK] Email send error:', errorData);
      return res.status(500).json({ error: 'Failed to send magic link email' });
    }

    return res.status(200).json({
      ok: true,
      message: 'Magic link sent to your email'
    });

  } catch (err) {
    console.error('[OPERATORS MAGIC LINK] Send error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
