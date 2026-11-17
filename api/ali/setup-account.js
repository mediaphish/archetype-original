/**
 * ALI Setup Account
 *
 * Verifies the setup token sent after signup, marks the token used, and signs
 * the user in with a real session. There is no password: ALI sign-in is by
 * email link only (the live ali_contacts table has no password column).
 *
 * Name and role are NOT collected here — signup (api/ali/signup.js) already
 * requires and stores contactName/contactRole as full_name/role at account
 * creation time. Re-asking here would just silently overwrite that real data
 * with whatever the user re-types.
 *
 * POST /api/ali/setup-account
 * Body: { token, email }
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { createSessionToken, sessionCookieHeader } from '../../lib/ali-session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { token, email } = req.body || {};

    if (!token || !email) {
      return res.status(400).json({ ok: false, error: 'Missing setup link information. Please use the link from your email.' });
    }

    const emailLower = String(email).toLowerCase().trim();

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('ali_magic_link_tokens')
      .select('*')
      .eq('token', token)
      .eq('email', emailLower)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({ ok: false, error: 'This setup link is invalid or has already been used.' });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json({ ok: false, error: 'This setup link has expired. Please contact support for a new one.' });
    }

    const { data: contact, error: contactError } = await supabaseAdmin
      .from('ali_contacts')
      .select('id, email, company_id, permission_level')
      .eq('email', emailLower)
      .single();

    if (contactError || !contact) {
      return res.status(404).json({ ok: false, error: 'No account found for this email.' });
    }

    await supabaseAdmin
      .from('ali_magic_link_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    const sessionToken = createSessionToken({
      contactId: contact.id,
      companyId: contact.company_id,
      email: contact.email,
      isSuperAdmin: false,
    });
    res.setHeader('Set-Cookie', sessionCookieHeader(sessionToken));

    return res.status(200).json({ ok: true, companyId: contact.company_id });
  } catch (err) {
    console.error('[ali/setup-account] error:', err);
    return res.status(500).json({ ok: false, error: 'Server error. Please try again.' });
  }
}
