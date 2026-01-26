/**
 * Record Offense
 * 
 * POST /api/operators/offenses/record
 * 
 * Accountant records an offense (no_show or early_departure).
 * Automatically progresses card status and creates owed balance for no-shows.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { canPerformAction } from '../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { email, event_id, user_email, offense_type } = req.body;

    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }
    if (!event_id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!user_email) {
      return res.status(400).json({ ok: false, error: 'user_email required' });
    }
    if (!offense_type || !['no_show', 'early_departure'].includes(offense_type)) {
      return res.status(400).json({ ok: false, error: 'offense_type must be "no_show" or "early_departure"' });
    }

    // Get event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    // Check permissions - only Accountant can record offenses
    const canRecord = await canPerformAction(email, event.state, 'record_offense');
    if (!canRecord) {
      return res.status(403).json({ ok: false, error: 'Only Accountants can record offenses' });
    }

    // Check if offense already recorded for this event/user
    const { data: existingOffense } = await supabaseAdmin
      .from('operators_offenses')
      .select('*')
      .eq('event_id', event_id)
      .eq('user_email', user_email)
      .eq('offense_type', offense_type)
      .maybeSingle();

    if (existingOffense) {
      return res.status(400).json({ ok: false, error: 'Offense already recorded for this event and user' });
    }

    // Record offense (triggers will handle card progression and owed balance)
    const { data: offense, error: offenseError } = await supabaseAdmin
      .from('operators_offenses')
      .insert({
        event_id,
        user_email,
        offense_type,
        recorded_by_email: email
      })
      .select()
      .single();

    if (offenseError) {
      console.error('[RECORD_OFFENSE] Database error:', offenseError);
      return res.status(500).json({ ok: false, error: 'Failed to record offense' });
    }

    // Get updated user record to return card status
    const { data: updatedUser } = await supabaseAdmin
      .from('operators_users')
      .select('card_status, card_count, benched_until, owed_balance')
      .eq('email', user_email)
      .single();

    return res.status(200).json({
      ok: true,
      offense,
      user_status: {
        card_status: updatedUser?.card_status,
        card_count: updatedUser?.card_count,
        benched_until: updatedUser?.benched_until,
        owed_balance: updatedUser?.owed_balance
      }
    });
  } catch (error) {
    console.error('[RECORD_OFFENSE] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
