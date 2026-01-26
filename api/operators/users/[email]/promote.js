/**
 * Promote User to Chief Operator
 * 
 * POST /api/operators/users/[email]/promote
 * 
 * Super Admin promotes a user to Chief Operator role.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { hasRole } from '../../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { email: targetEmail } = req.query;
    const { email } = req.body;

    if (!targetEmail) {
      return res.status(400).json({ ok: false, error: 'Target email required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    // Check permissions - only SA can promote
    const isSA = await hasRole(email, 'super_admin');
    if (!isSA) {
      return res.status(403).json({ ok: false, error: 'Only Super Admins can promote users' });
    }

    // Get target user
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('operators_users')
      .select('*')
      .eq('email', targetEmail)
      .maybeSingle();

    if (userError || !targetUser) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Add CO role if not present
    const roles = targetUser.roles || [];
    if (!roles.includes('chief_operator')) {
      const newRoles = [...roles, 'chief_operator'];
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('operators_users')
        .update({ roles: newRoles })
        .eq('email', targetEmail)
        .select()
        .single();

      if (updateError) {
        console.error('[PROMOTE_USER] Database error:', updateError);
        return res.status(500).json({ ok: false, error: 'Failed to promote user' });
      }

      return res.status(200).json({ ok: true, user: updatedUser });
    } else {
      return res.status(400).json({ ok: false, error: 'User is already a Chief Operator' });
    }
  } catch (error) {
    console.error('[PROMOTE_USER] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
