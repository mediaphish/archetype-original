/**
 * Reverse Offense
 * 
 * POST /api/operators/users/[email]/reverse-offense
 * 
 * Super Admin reverses an offense, removing card status and bench.
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
    const { email, offense_id } = req.body;

    if (!targetEmail) {
      return res.status(400).json({ ok: false, error: 'Target email required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }
    if (!offense_id) {
      return res.status(400).json({ ok: false, error: 'offense_id required' });
    }

    // Check permissions - only SA can reverse
    const isSA = await hasRole(email, 'super_admin');
    if (!isSA) {
      return res.status(403).json({ ok: false, error: 'Only Super Admins can reverse offenses' });
    }

    // Get offense
    const { data: offense, error: offenseError } = await supabaseAdmin
      .from('operators_offenses')
      .select('*')
      .eq('id', offense_id)
      .eq('user_email', targetEmail)
      .maybeSingle();

    if (offenseError || !offense) {
      return res.status(404).json({ ok: false, error: 'Offense not found' });
    }

    // Get user
    const { data: user, error: userError } = await supabaseAdmin
      .from('operators_users')
      .select('*')
      .eq('email', targetEmail)
      .single();

    if (userError || !user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Reverse card progression
    let newCardCount = Math.max(0, (user.card_count || 0) - 1);
    let newCardStatus = 'none';
    if (newCardCount === 0) {
      newCardStatus = 'none';
    } else if (newCardCount === 1) {
      newCardStatus = 'yellow';
    } else if (newCardCount === 2) {
      newCardStatus = 'orange';
    } else {
      newCardStatus = 'red';
    }

    // If reversing from red, remove bench
    let benchedUntil = user.benched_until;
    if (user.card_status === 'red' && newCardStatus !== 'red') {
      benchedUntil = null;
    }

    // Reverse owed balance if no-show
    let newOwedBalance = user.owed_balance || 0;
    if (offense.offense_type === 'no_show') {
      const { data: event } = await supabaseAdmin
        .from('operators_events')
        .select('stake_amount')
        .eq('id', offense.event_id)
        .single();
      
      if (event) {
        newOwedBalance = Math.max(0, newOwedBalance - parseFloat(event.stake_amount || 0));
      }
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('operators_users')
      .update({
        card_status: newCardStatus,
        card_count: newCardCount,
        benched_until: benchedUntil,
        owed_balance: newOwedBalance
      })
      .eq('email', targetEmail)
      .select()
      .single();

    if (updateError) {
      console.error('[REVERSE_OFFENSE] Database error:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to reverse offense' });
    }

    // Delete offense record
    await supabaseAdmin
      .from('operators_offenses')
      .delete()
      .eq('id', offense_id);

    return res.status(200).json({ ok: true, user: updatedUser });
  } catch (error) {
    console.error('[REVERSE_OFFENSE] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
