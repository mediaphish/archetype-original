/**
 * Operators Platform Magic Link - Verify
 * 
 * Verifies magic link token and signs user in
 * 
 * GET /api/operators/auth/verify-magic-link?token=xxx&email=xxx
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email');

    if (!token || !email) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Link - Operators Platform</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Invalid Login Link</h1>
            <div class="error">
              <p>This login link is invalid or missing required information.</p>
              <p><a href="/operators/login">Go to Login</a></p>
            </div>
          </body>
        </html>
      `);
    }

    const emailLower = email.toLowerCase().trim();

    // Verify token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('operators_magic_link_tokens')
      .select('*')
      .eq('token', token)
      .eq('email', emailLower)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Link - Operators Platform</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Invalid or Expired Link</h1>
            <div class="error">
              <p>This login link is invalid, expired, or has already been used.</p>
              <p><a href="/operators/login">Request a new link</a></p>
            </div>
          </body>
        </html>
      `);
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Expired Link - Operators Platform</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Link Expired</h1>
            <div class="error">
              <p>This login link has expired. Magic links expire after 15 minutes.</p>
              <p><a href="/operators/login">Request a new link</a></p>
            </div>
          </body>
        </html>
      `);
    }

    // Mark token as used
    await supabaseAdmin
      .from('operators_magic_link_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    // Check if user exists in operators_users table
    const { data: user, error: userError } = await supabaseAdmin
      .from('operators_users')
      .select('email')
      .eq('email', emailLower)
      .maybeSingle();

    if (userError || !user) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Account Not Found - Operators Platform</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Account Not Found</h1>
            <div class="error">
              <p>No account found for this email address. Please contact your administrator to be added to the Operators Platform.</p>
              <p><a href="/operators">Go to Home</a></p>
            </div>
          </body>
        </html>
      `);
    }

    // Redirect to dashboard with email in query string
    // Frontend will handle storing email in localStorage
    const redirectUrl = `${process.env.SITE_URL || 'https://www.archetypeoriginal.com'}/operators/dashboard?email=${encodeURIComponent(emailLower)}`;
    
    return res.status(302).setHeader('Location', redirectUrl).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Signing In - Operators Platform</title>
          <meta http-equiv="refresh" content="0;url=${redirectUrl}">
        </head>
        <body>
          <p>Signing you in... <a href="${redirectUrl}">Click here if you're not redirected</a></p>
        </body>
      </html>
    `);

  } catch (err) {
    console.error('[OPERATORS MAGIC LINK] Verify error:', err);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error - Operators Platform</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Error</h1>
          <div class="error">
            <p>An error occurred while verifying your login link.</p>
            <p><a href="/operators/login">Try again</a></p>
          </div>
        </body>
      </html>
    `);
  }
}
