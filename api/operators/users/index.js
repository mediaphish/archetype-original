/**
 * List All Users
 * 
 * GET /api/operators/users?email=xxx
 * 
 * Lists all Operators users with their roles, card status, and benched status
 * Only Super Admins can access this
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { getUserOperatorsRoles } from '../../../lib/operators/permissions.js';

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

    // Check permissions - only Super Admin can view all users
    const roles = await getUserOperatorsRoles(email);
    if (!roles.includes('super_admin')) {
      return res.status(403).json({ ok: false, error: 'Only Super Admins can view all users' });
    }

    // Get all users
    const { data: users, error } = await supabaseAdmin
      .from('operators_users')
      .select('*')
      .order('email', { ascending: true });

    if (error) {
      console.error('[LIST_USERS] Database error:', error);
      return res.status(500).json({ ok: false, error: 'Failed to fetch users' });
    }

    return res.status(200).json({ ok: true, users: users || [] });
  } catch (error) {
    console.error('[LIST_USERS] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
