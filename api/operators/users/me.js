/**
 * Get/Update Current User
 * 
 * GET /api/operators/users/me?email=xxx - Get current user's Operators profile
 * PUT /api/operators/users/me?email=xxx - Update current user's Operators profile
 * 
 * Gets or updates current user's Operators profile, roles, status, and owed balance.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { getOperatorsUser } from '../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    const { email } = req.method === 'GET' ? req.query : req.body;

    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    if (req.method === 'GET') {
      const user = await getOperatorsUser(email);

      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found in Operators system' });
      }

      // Remove sensitive fields if needed, or return all
      return res.status(200).json({ ok: true, user });
    } else if (req.method === 'PUT') {
      const { role_title, industry, bio, headshot_url, business_name, website_url } = req.body;

      // Validate that user exists
      const user = await getOperatorsUser(email);
      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found in Operators system' });
      }

      // Check if user is an Operator (not just a Candidate) for operator-only fields
      const isOperator = user.roles?.includes('operator') || false;
      
      // Update user profile
      const updates = {};
      if (role_title !== undefined) updates.role_title = role_title || null;
      if (industry !== undefined) updates.industry = industry || null;
      if (bio !== undefined) updates.bio = bio || null;
      
      // Operator-only fields
      if (isOperator) {
        if (headshot_url !== undefined) updates.headshot_url = headshot_url || null;
        if (business_name !== undefined) updates.business_name = business_name || null;
        if (website_url !== undefined) updates.website_url = website_url || null;
      }

      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('operators_users')
        .update(updates)
        .eq('email', email)
        .select()
        .single();

      if (updateError) {
        console.error('[UPDATE_USER_PROFILE] Error:', updateError);
        return res.status(500).json({ ok: false, error: 'Failed to update profile' });
      }

      return res.status(200).json({ ok: true, user: updatedUser });
    } else {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[USER_ME] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
