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
    const { 
      email, 
      title, 
      event_date,
      start_time,
      finish_time,
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
      sponsor_description,
      sponsor_email // Keep for backwards compatibility
    } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }
    
    // Check for missing required fields (allow empty strings to be caught)
    const missingFields = [];
    if (!title || title.trim() === '') missingFields.push('title');
    if (!event_date || event_date.trim() === '') missingFields.push('event_date');
    if (!start_time || start_time.trim() === '') missingFields.push('start_time');
    if (!finish_time || finish_time.trim() === '') missingFields.push('finish_time');
    if (!stake_amount || stake_amount === '') missingFields.push('stake_amount');
    if (!max_seats || max_seats === '') missingFields.push('max_seats');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        ok: false, 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Validate finish_time is after start_time
    if (finish_time <= start_time) {
      return res.status(400).json({ ok: false, error: 'Finish time must be after start time' });
    }

    // Validate host description length (150 words max)
    if (host_description) {
      const wordCount = host_description.trim().split(/\s+/).length;
      if (wordCount > 150) {
        return res.status(400).json({ ok: false, error: 'Host description must be 150 words or less' });
      }
    }

    // Validate sponsor description length (150 words max)
    if (sponsor_description) {
      const wordCount = sponsor_description.trim().split(/\s+/).length;
      if (wordCount > 150) {
        return res.status(400).json({ ok: false, error: 'Sponsor description must be 150 words or less' });
      }
    }

    // Check permissions - only CO can create events
    const canCreate = await canPerformAction(email, 'LIVE', 'create_event');
    if (!canCreate) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators can create events' });
    }

    // Create event with all fields
    const eventData = {
      title,
      event_date,
      start_time: start_time || null,
      finish_time: finish_time || null,
      state: 'LIVE',
      stake_amount: parseFloat(stake_amount),
      max_seats: parseInt(max_seats),
      created_by: email,
      // Host fields
      host_name: host_name || null,
      host_logo_url: host_logo_url || null,
      host_location: host_location || null,
      host_location_lat: host_location_lat ? parseFloat(host_location_lat) : null,
      host_location_lng: host_location_lng ? parseFloat(host_location_lng) : null,
      host_description: host_description || null,
      // Sponsor fields
      sponsor_name: sponsor_name || null,
      sponsor_logo_url: sponsor_logo_url || null,
      sponsor_website: sponsor_website || null,
      sponsor_phone: sponsor_phone || null,
      sponsor_pot_value: sponsor_pot_value ? parseFloat(sponsor_pot_value) : 0,
      sponsor_description: sponsor_description || null,
      sponsor_email: sponsor_email || null // Keep for backwards compatibility
    };

    console.log('[CREATE_EVENT] Inserting event data:', JSON.stringify(eventData, null, 2));

    const { data: event, error } = await supabaseAdmin
      .from('operators_events')
      .insert(eventData)
      .select()
      .single();

    if (error) {
      console.error('[CREATE_EVENT] Database error:', error);
      return res.status(500).json({ 
        ok: false, 
        error: error.message || 'Failed to create event',
        diag: process.env.NODE_ENV === 'development' ? { code: error.code, details: error.details, hint: error.hint } : undefined
      });
    }

    return res.status(200).json({ ok: true, event });
  } catch (error) {
    console.error('[CREATE_EVENT] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
