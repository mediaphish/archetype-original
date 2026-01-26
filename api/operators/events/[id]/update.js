/**
 * Update Event
 * 
 * PUT /api/operators/events/[id]/update
 * 
 * Updates an existing event. Only works for LIVE events that are in the future.
 * Only Chief Operators or Super Admins can update events.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { canPerformAction } from '../../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { 
      email,
      title, 
      event_date, 
      stake_amount, 
      max_seats,
      // Host fields
      host_name,
      host_logo_url,
      host_location,
      host_location_lat,
      host_location_lng,
      host_description,
      // Sponsor fields
      sponsor_name,
      sponsor_logo_url,
      sponsor_website,
      sponsor_phone,
      sponsor_pot_value,
      sponsor_description
    } = req.body;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    // Get current event
    const { data: currentEvent, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('*')
      .eq('id', id)
      .single();

    if (eventError || !currentEvent) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    // Only allow editing LIVE events
    if (currentEvent.state !== 'LIVE') {
      return res.status(400).json({ ok: false, error: 'Can only edit LIVE events. This event is already OPEN or CLOSED.' });
    }

    // Only allow editing future events
    const eventDate = new Date(currentEvent.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      return res.status(400).json({ ok: false, error: 'Can only edit future events' });
    }

    // Check permissions - only CO or SA can update
    const canUpdate = await canPerformAction(email, 'LIVE', 'create_event'); // Same permission as create
    if (!canUpdate) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators or Super Admins can update events' });
    }

    // Validate word counts if provided
    if (host_description) {
      const wordCount = host_description.trim().split(/\s+/).length;
      if (wordCount > 150) {
        return res.status(400).json({ ok: false, error: 'Host description must be 150 words or less' });
      }
    }

    if (sponsor_description) {
      const wordCount = sponsor_description.trim().split(/\s+/).length;
      if (wordCount > 150) {
        return res.status(400).json({ ok: false, error: 'Sponsor description must be 150 words or less' });
      }
    }

    // Build update object (only include fields that were provided)
    const updateData = {};
    
    if (title !== undefined) updateData.title = title;
    if (event_date !== undefined) updateData.event_date = event_date;
    if (stake_amount !== undefined) updateData.stake_amount = parseFloat(stake_amount);
    if (max_seats !== undefined) updateData.max_seats = parseInt(max_seats);
    
    // Host fields
    if (host_name !== undefined) updateData.host_name = host_name || null;
    if (host_logo_url !== undefined) updateData.host_logo_url = host_logo_url || null;
    if (host_location !== undefined) updateData.host_location = host_location || null;
    if (host_location_lat !== undefined) updateData.host_location_lat = host_location_lat ? parseFloat(host_location_lat) : null;
    if (host_location_lng !== undefined) updateData.host_location_lng = host_location_lng ? parseFloat(host_location_lng) : null;
    if (host_description !== undefined) updateData.host_description = host_description || null;
    
    // Sponsor fields
    if (sponsor_name !== undefined) updateData.sponsor_name = sponsor_name || null;
    if (sponsor_logo_url !== undefined) updateData.sponsor_logo_url = sponsor_logo_url || null;
    if (sponsor_website !== undefined) updateData.sponsor_website = sponsor_website || null;
    if (sponsor_phone !== undefined) updateData.sponsor_phone = sponsor_phone || null;
    if (sponsor_pot_value !== undefined) updateData.sponsor_pot_value = sponsor_pot_value ? parseFloat(sponsor_pot_value) : 0;
    if (sponsor_description !== undefined) updateData.sponsor_description = sponsor_description || null;

    // Update event
    const { data: updatedEvent, error: updateError } = await supabaseAdmin
      .from('operators_events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[UPDATE_EVENT] Database error:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to update event' });
    }

    return res.status(200).json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('[UPDATE_EVENT] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
