/**
 * Get Current User
 * 
 * GET /api/operators/users/me?email=xxx
 * 
 * Gets current user's Operators profile, roles, status, and owed balance.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { getOperatorsUser } from '../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    const user = await getOperatorsUser(email);

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found in Operators system' });
    }

    // Remove sensitive fields if needed, or return all
    return res.status(200).json({ ok: true, user });
  } catch (error) {
    console.error('[GET_USER] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
