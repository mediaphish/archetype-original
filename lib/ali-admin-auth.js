/**
 * ALI Super Admin auth helper
 * Validates that the request is from a Super Admin (ali_super_admins or ali_super_admin_users).
 * Use for deletion APIs, tenants API, etc.
 *
 * @param {object} req - Request object (Vercel-style)
 * @param {object} res - Response object
 * @param {object} opts - { body?: object } parsed POST body; email can also come from body.email or Ali-Super-Admin-Email header
 * @returns {Promise<{ email: string } | null>} - { email } if SA, null if already sent error response
 */

import { supabaseAdmin } from './supabase-admin.js';

export async function requireSuperAdmin(req, res, opts = {}) {
  const body = opts.body || {};
  let emailRaw =
    body.email ||
    (req.headers && (req.headers['ali-super-admin-email'] || req.headers['Ali-Super-Admin-Email']));
  if (!emailRaw && req.method === 'GET' && req.url) {
    try {
      const u = new URL(req.url, `https://${req.headers?.host || 'x'}`);
      emailRaw = u.searchParams.get('email');
    } catch (_) {}
  }
  const email = typeof emailRaw === 'string' ? emailRaw.toLowerCase().trim() : '';

  if (!email) {
    res.status(403).json({ ok: false, error: 'Super admin email required (body.email or Ali-Super-Admin-Email header)' });
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('ali_super_admins')
    .select('user_id, email, role')
    .eq('email', email)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[ali-admin-auth] ali_super_admins lookup error:', error);
    res.status(500).json({ ok: false, error: 'Auth check failed' });
    return null;
  }
  if (data) {
    return { email };
  }

  const { data: legacy, error: legacyError } = await supabaseAdmin
    .from('ali_super_admin_users')
    .select('id, email, role')
    .eq('email', email)
    .maybeSingle();

  if (legacyError && legacyError.code !== 'PGRST116') {
    console.error('[ali-admin-auth] ali_super_admin_users lookup error:', legacyError);
    res.status(500).json({ ok: false, error: 'Auth check failed' });
    return null;
  }
  if (legacy) {
    return { email };
  }

  res.status(403).json({ ok: false, error: 'Not a super admin' });
  return null;
}
