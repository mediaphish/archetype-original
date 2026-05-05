/**
 * Public interest / application form for The Operators marketing landing.
 * POST /api/operators/interest/submit
 * Body: { name, email, role_title, company_size, bio }
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';

const COMPANY_SIZES = new Set(['1-4', '5-25', '26-100', '101-250', '250+']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { name, email, role_title, company_size, bio } = req.body || {};

    if (!name || !email || !role_title || !company_size || !bio) {
      return res.status(400).json({ ok: false, error: 'All fields are required.' });
    }

    if (typeof bio !== 'string' || bio.trim().length < 100) {
      return res.status(400).json({ ok: false, error: 'Your bio must be at least 100 characters.' });
    }

    if (!COMPANY_SIZES.has(company_size)) {
      return res.status(400).json({ ok: false, error: 'Please select a valid company size.' });
    }

    const emailLower = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }

    const { error } = await supabaseAdmin.from('operators_interest').insert({
      name: String(name).trim().slice(0, 200),
      email: emailLower.slice(0, 320),
      role_title: String(role_title).trim().slice(0, 200),
      company_size,
      bio: String(bio).trim().slice(0, 20000),
      status: 'pending',
    });

    if (error) {
      console.error('operators_interest insert', error.message || error);
      console.error('[OPERATORS_INTEREST]', {
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return res.status(500).json({
        ok: false,
        error: 'We could not save your application. Please try again in a moment.',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
}
