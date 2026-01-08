/**
 * ALI Magic Link - Verify
 * 
 * Verifies magic link token and signs user in
 * Works for both contacts and Super Admins
 * 
 * GET /api/ali/auth/verify-magic-link?token=xxx&email=xxx
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
            <title>Invalid Link - ALI</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Invalid Login Link</h1>
            <div class="error">
              <p>This login link is invalid or missing required information.</p>
              <p><a href="/ali/login">Go to Login</a></p>
            </div>
          </body>
        </html>
      `);
    }

    const emailLower = email.toLowerCase().trim();

    // Verify token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('ali_magic_link_tokens')
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
            <title>Invalid Link - ALI</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Invalid or Expired Link</h1>
            <div class="error">
              <p>This login link is invalid, expired, or has already been used.</p>
              <p><a href="/ali/login">Request a new link</a></p>
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
            <title>Expired Link - ALI</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Link Expired</h1>
            <div class="error">
              <p>This login link has expired. Magic links expire after 15 minutes.</p>
              <p><a href="/ali/login">Request a new link</a></p>
            </div>
          </body>
        </html>
      `);
    }

    // Mark token as used
    await supabaseAdmin
      .from('ali_magic_link_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    // Determine if Super Admin or regular contact
    let redirectPath = '/ali/dashboard';
    let userInfo = {};

    // Check if Super Admin (check both tables for compatibility)
    let superAdmin = null;
    let superAdminError = null;
    
    ({ data: superAdmin, error: superAdminError } = await supabaseAdmin
      .from('ali_super_admins')
      .select('user_id, email, role')
      .eq('email', emailLower)
      .maybeSingle()); // Use maybeSingle() instead of single() to avoid error if not found

    // If not found, try old table for backward compatibility
    if ((superAdminError && superAdminError.code !== 'PGRST116') || !superAdmin) {
      ({ data: superAdmin, error: superAdminError } = await supabaseAdmin
        .from('ali_super_admin_users')
        .select('id as user_id, email, role')
        .eq('email', emailLower)
        .maybeSingle());
    }

    // Log for debugging
    if (superAdminError && superAdminError.code !== 'PGRST116') {
      console.error('Super Admin lookup error:', superAdminError);
    }

    if (superAdmin && !superAdminError) {
      // Super Admin found - check if they also have a contact record for tenant access
      const { data: contact } = await supabaseAdmin
        .from('ali_contacts')
        .select('id, email, company_id, permission_level, full_name')
        .eq('email', emailLower)
        .single();

      if (contact) {
        // Super Admin with contact record - redirect to tenant dashboard (they can navigate to Super Admin)
        const { data: company } = await supabaseAdmin
          .from('ali_companies')
          .select('id, name, subscription_status')
          .eq('id', contact.company_id)
          .single();

        redirectPath = `/ali/dashboard?email=${encodeURIComponent(emailLower)}`;
        userInfo = {
          id: contact.id,
          email: contact.email,
          company_id: contact.company_id,
          company_name: company?.name || '',
          permission_level: contact.permission_level,
          subscription_status: company?.subscription_status || null,
          isSuperAdmin: true,
          superAdminId: superAdmin.user_id
        };
      } else {
        // Super Admin only - redirect to Super Admin overview
        redirectPath = `/ali/super-admin/overview?email=${encodeURIComponent(emailLower)}`;
        userInfo = {
          id: superAdmin.user_id,
          email: superAdmin.email,
          role: superAdmin.role,
          isSuperAdmin: true
        };
      }
    } else {
      // Check if regular contact
      const { data: contact, error: contactError } = await supabaseAdmin
        .from('ali_contacts')
        .select('id, email, company_id, permission_level, full_name')
        .eq('email', emailLower)
        .single();

      if (contactError || !contact) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Account Not Found - ALI</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
                .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
              </style>
            </head>
            <body>
              <h1>Account Not Found</h1>
              <div class="error">
                <p>No account found for this email address.</p>
                <p><a href="/ali/signup">Sign up for ALI</a></p>
              </div>
            </body>
          </html>
        `);
      }

      // Get company info
      const { data: company } = await supabaseAdmin
        .from('ali_companies')
        .select('id, name, subscription_status')
        .eq('id', contact.company_id)
        .single();

      redirectPath = `/ali/dashboard?email=${encodeURIComponent(emailLower)}`;
      userInfo = {
        id: contact.id,
        email: contact.email,
        company_id: contact.company_id,
        company_name: company?.name || '',
        permission_level: contact.permission_level,
        subscription_status: company?.subscription_status || null,
        isSuperAdmin: false
      };
    }

    // Redirect to appropriate dashboard with email in query string
    // Frontend will handle setting up the session
    const redirectUrl = `${process.env.SITE_URL || 'https://www.archetypeoriginal.com'}${redirectPath}`;
    
    return res.status(302).setHeader('Location', redirectUrl).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Signing In - ALI</title>
          <meta http-equiv="refresh" content="0;url=${redirectUrl}">
        </head>
        <body>
          <p>Signing you in... <a href="${redirectUrl}">Click here if you're not redirected</a></p>
        </body>
      </html>
    `);

  } catch (err) {
    console.error('Magic link verify error:', err);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error - ALI</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Error</h1>
          <div class="error">
            <p>An error occurred while verifying your login link.</p>
            <p><a href="/ali/login">Try again</a></p>
          </div>
        </body>
      </html>
    `);
  }
}

