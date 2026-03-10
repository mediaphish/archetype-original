/**
 * AO Automation Dashboard — Verify magic link and redirect to dashboard.
 * GET /api/ao/auth/verify-magic-link?token=xxx&email=xxx
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';

const siteUrl = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
const loginPath = '/ao/login';
const dashboardPath = '/ao/command-center';

function errorPage(title, message, linkHref, linkText) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - AO Automation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .error { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="error"><p>${message}</p><p><a href="${linkHref}">${linkText}</a></p></div>
      </body>
    </html>
  `;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email');

    if (!token || !email) {
      return res.status(400).send(errorPage('Invalid Link', 'This login link is invalid or missing required information.', loginPath, 'Go to Login'));
    }

    const emailLower = email.toLowerCase().trim();

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('ao_magic_link_tokens')
      .select('*')
      .eq('token', token)
      .eq('email', emailLower)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).send(errorPage('Invalid or Expired Link', 'This login link is invalid, expired, or has already been used.', loginPath, 'Request a new link'));
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).send(errorPage('Link Expired', 'This login link has expired. Magic links expire after 15 minutes.', loginPath, 'Request a new link'));
    }

    await supabaseAdmin
      .from('ao_magic_link_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    const redirectUrl = `${siteUrl}${dashboardPath}?email=${encodeURIComponent(emailLower)}`;
    return res.status(302).setHeader('Location', redirectUrl).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Signing In - AO Automation</title><meta http-equiv="refresh" content="0;url=${redirectUrl}"></head>
        <body><p>Signing you in... <a href="${redirectUrl}">Click here if you're not redirected</a></p></body>
      </html>
    `);
  } catch (err) {
    console.error('[AO auth] Verify error:', err);
    return res.status(500).send(errorPage('Error', 'An error occurred while verifying your login link.', loginPath, 'Try again'));
  }
}
