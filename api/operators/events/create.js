/**
 * Create Event
 * 
 * POST /api/operators/events/create
 * 
 * Creates a new event in LIVE state. Only Chief Operators can create events.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { hasRole, canPerformAction } from '../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { email, title, event_date, stake_amount, max_seats, sponsor_email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }
    if (!title || !event_date || !stake_amount || !max_seats) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: title, event_date, stake_amount, max_seats' });
    }

    // Check permissions - only CO can create events
    const canCreate = await canPerformAction(email, 'LIVE', 'create_event');
    if (!canCreate) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators can create events' });
    }

    // Validate sponsor (max 1 per event, optional)
    if (sponsor_email) {
      // Check if sponsor email exists in operators_users
      const { data: sponsorUser } = await supabaseAdmin
        .from('operators_users')
        .select('email')
        .eq('email', sponsor_email)
        .maybeSingle();
      
      if (!sponsorUser) {
        return res.status(400).json({ ok: false, error: 'Sponsor email not found in Operators system' });
      }
    }

    // Create event
    const { data: event, error } = await supabaseAdmin
      .from('operators_events')
      .insert({
        title,
        event_date,
        state: 'LIVE',
        stake_amount: parseFloat(stake_amount),
        max_seats: parseInt(max_seats),
        sponsor_email: sponsor_email || null,
        created_by: email
      })
      .select()
      .single();

    if (error) {
      console.error('[CREATE_EVENT] Database error:', error);
      return res.status(500).json({ ok: false, error: 'Failed to create event' });
    }

    return res.status(200).json({ ok: true, event });
  } catch (error) {
    console.error('[CREATE_EVENT] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
