/**
 * List Events
 * 
 * GET /api/operators/events?email=xxx&state=LIVE
 * 
 * Lists events filtered by state and user role
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { getUserOperatorsRoles } from '../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { email, state } = req.query;

    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    // Build query
    let query = supabaseAdmin
      .from('operators_events')
      .select('*')
      .order('event_date', { ascending: false });

    // Filter by state if provided
    if (state && ['LIVE', 'OPEN', 'CLOSED'].includes(state)) {
      query = query.eq('state', state);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('[LIST_EVENTS] Database error:', error);
      return res.status(500).json({ ok: false, error: 'Failed to fetch events' });
    }

    // For each event, get RSVP status for user
    const roles = await getUserOperatorsRoles(email);
    const eventsWithRSVP = await Promise.all(
      (events || []).map(async (event) => {
        const { data: rsvp } = await supabaseAdmin
          .from('operators_rsvps')
          .select('status')
          .eq('event_id', event.id)
          .eq('user_email', email)
          .maybeSingle();

        // Get RSVP counts
        const { count: confirmedCount } = await supabaseAdmin
          .from('operators_rsvps')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('status', 'confirmed');

        const { count: waitlistCount } = await supabaseAdmin
          .from('operators_rsvps')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('status', 'waitlisted');

        return {
          ...event,
          user_rsvp_status: rsvp?.status || null,
          confirmed_count: confirmedCount || 0,
          waitlist_count: waitlistCount || 0,
          user_roles: roles
        };
      })
    );

    return res.status(200).json({ ok: true, events: eventsWithRSVP });
  } catch (error) {
    console.error('[LIST_EVENTS] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
