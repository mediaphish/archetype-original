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
import { verifySessionToken } from './ali-session.js';

function readSessionCookie(req) {
  const header = req?.headers?.cookie || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === 'ali_session') return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return '';
}

export async function requireSuperAdmin(req, res, opts = {}) {
  // Security (2026-11-16 audit): the admin's identity comes only from the signed
  // ALI sign-in cookie. An email typed into the request body, a header or the URL
  // is ignored, because anyone could type an admin's address.
  const claims = verifySessionToken(readSessionCookie(req));
  if (!claims?.email) {
    res.status(401).json({ ok: false, error: 'Not signed in. Please log in to ALI again.' });
    return null;
  }
  const emailRaw = claims.email;
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
