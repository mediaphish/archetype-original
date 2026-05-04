/**
 * Operators — temporary test login (no magic link)
 *
 * POST /api/operators/auth/test-login
 * Body: { email, secret }
 *
 * Only works when OPERATORS_TEST_LOGIN_SECRET is set on the server (e.g. Vercel env).
 * Still requires the email to exist in operators_users (invite-only unchanged).
 * Remove the env var when finished testing — bypass dies automatically.
 */

import crypto from 'crypto';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export const config = { runtime: 'nodejs' };

function timingSafeEqualString(a, b) {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const configuredSecret = process.env.OPERATORS_TEST_LOGIN_SECRET;
  if (!configuredSecret || configuredSecret.length < 8) {
    return res.status(403).json({
      ok: false,
      error: 'Test login is not enabled. Set OPERATORS_TEST_LOGIN_SECRET on the server to use it.',
    });
  }

  try {
    const { email, secret } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ ok: false, error: 'Valid email required' });
    }
    if (!secret || typeof secret !== 'string') {
      return res.status(400).json({ ok: false, error: 'Secret required' });
    }

    if (!timingSafeEqualString(secret.trim(), configuredSecret)) {
      return res.status(403).json({ ok: false, error: 'Invalid secret' });
    }

    const emailLower = email.toLowerCase().trim();

    const { data: user, error } = await supabaseAdmin
      .from('operators_users')
      .select('email')
      .eq('email', emailLower)
      .maybeSingle();

    if (error || !user) {
      return res.status(403).json({
        ok: false,
        error:
          'No membership for this email. Test login still requires an existing Operators account.',
      });
    }

    return res.status(200).json({ ok: true, email: emailLower });
  } catch (e) {
    console.error('[operators/test-login]', e);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
