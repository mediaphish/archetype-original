/**
 * ALI Authentication - Login
 * 
 * Authenticate user and return session
 * 
 * POST /api/ali/auth/login
 * Body: {
 *   email: string (required)
 *   password: string (required)
 * }
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find contact by email
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('ali_contacts')
      .select('id, email, password_hash, company_id, permission_level, full_name')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (contactError || !contact) {
      // Don't reveal if user exists or not (security best practice)
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    if (!contact.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordValid = await bcrypt.compare(password, contact.password_hash);

    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get company info
    const { data: company, error: companyError } = await supabaseAdmin
      .from('ali_companies')
      .select('id, name, subscription_status')
      .eq('id', contact.company_id)
      .single();

    if (companyError || !company) {
      return res.status(500).json({ error: 'Failed to load company information' });
    }

    // Generate session token (in production, use JWT or session management library)
    // For now, return user info - frontend should handle session storage
    // TODO: Implement proper session management (JWT tokens, HTTP-only cookies, etc.)

    return res.status(200).json({
      success: true,
      user: {
        id: contact.id,
        email: contact.email,
        full_name: contact.full_name,
        company_id: contact.company_id,
        company_name: company.name,
        permission_level: contact.permission_level,
        subscription_status: company.subscription_status
      },
      // In production, return a secure session token here
      // session_token: generateSessionToken(contact.id)
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

