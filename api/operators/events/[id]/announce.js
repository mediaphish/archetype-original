/**
 * Announce Event
 * 
 * POST /api/operators/events/[id]/announce
 * 
 * Sends email announcements to all Operators and approved Candidates about a new event.
 * Only CO or Accountant can announce events.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { canPerformAction } from '../../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { email } = req.body;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    // Get current event state
    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('*')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    // Check state - must be LIVE
    if (event.state !== 'LIVE') {
      return res.status(400).json({ ok: false, error: `Event must be LIVE to announce. Current state: ${event.state}` });
    }

    // Check permissions (CO or Accountant only)
    const canAnnounce = await canPerformAction(email, 'LIVE', 'announce_event');
    if (!canAnnounce) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators or Accountants can announce events' });
    }

    // Get all Operators (including Chief Operators)
    const { data: operators } = await supabaseAdmin
      .from('operators_users')
      .select('email')
      .or('roles.cs.{operator,chief_operator}');

    // Get eligible Candidates (approved status only)
    const { data: candidates } = await supabaseAdmin
      .from('operators_candidates')
      .select('candidate_email')
      .eq('status', 'approved');

    // Combine recipients and remove duplicates
    const operatorEmails = (operators || []).map(o => o.email);
    const candidateEmails = (candidates || []).map(c => c.candidate_email);
    const allRecipients = [...new Set([...operatorEmails, ...candidateEmails])];

    if (allRecipients.length === 0) {
      return res.status(400).json({ ok: false, error: 'No recipients found to announce event to' });
    }

    // Send emails via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('[ANNOUNCE_EVENT] RESEND_API_KEY not configured');
      return res.status(500).json({ ok: false, error: 'Email service not configured' });
    }

    const siteUrl = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
    const fromEmail = process.env.RESEND_FROM || 'Archetype Original <noreply@archetypeoriginal.com>';

    // Format event date and time
    const eventDate = new Date(event.event_date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedTime = event.start_time && event.finish_time
      ? `${formatTime(event.start_time)} - ${formatTime(event.finish_time)}`
      : 'Time TBD';

    // Build email HTML
    const buildEmailHtml = (recipientEmail) => {
      const rsvpLink = `${siteUrl}/operators/events/${id}?email=${encodeURIComponent(recipientEmail)}`;
      
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 10px;">New Operators Event</h1>
              <h2 style="color: #2563eb; font-size: 20px; margin-bottom: 20px;">${event.title}</h2>
            </div>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <p style="margin: 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 10px 0;"><strong>Time:</strong> ${formattedTime}</p>
              ${event.host_location ? `<p style="margin: 10px 0;"><strong>Location:</strong> ${event.host_location}</p>` : ''}
              <p style="margin: 10px 0;"><strong>Stake Amount:</strong> $${parseFloat(event.stake_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p style="margin: 10px 0;"><strong>Max Seats:</strong> ${event.max_seats}</p>
              ${event.host_name ? `<p style="margin: 10px 0;"><strong>Host:</strong> ${event.host_name}</p>` : ''}
              ${event.sponsor_name ? `<p style="margin: 10px 0;"><strong>Sponsor:</strong> ${event.sponsor_name}</p>` : ''}
            </div>
            
            ${event.host_description ? `<div style="margin-bottom: 20px;"><p style="color: #666;">${event.host_description}</p></div>` : ''}
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${rsvpLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                RSVP to Event
              </a>
            </div>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${rsvpLink}" style="color: #2563eb; word-break: break-all;">${rsvpLink}</a>
            </p>
          </body>
        </html>
      `;
    };

    // Send emails in batches (Resend supports up to 100 per batch)
    const batchSize = 100;
    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    for (let i = 0; i < allRecipients.length; i += batchSize) {
      const batch = allRecipients.slice(i, i + batchSize);
      
      try {
        const emailPromises = batch.map(recipientEmail => {
          return fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: fromEmail,
              to: recipientEmail,
              subject: `New Operators Event: ${event.title}`,
              html: buildEmailHtml(recipientEmail)
            })
          });
        });

        const results = await Promise.allSettled(emailPromises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.ok) {
            successCount++;
          } else {
            failureCount++;
            errors.push({
              email: batch[index],
              error: result.status === 'rejected' ? result.reason?.message : 'Unknown error'
            });
          }
        });
      } catch (error) {
        console.error('[ANNOUNCE_EVENT] Batch send error:', error);
        failureCount += batch.length;
        batch.forEach(email => {
          errors.push({ email, error: error.message || 'Batch send failed' });
        });
      }
    }

    // Update event with announced_at timestamp (optional, but useful for tracking)
    // Note: If announced_at column doesn't exist, this will fail silently
    try {
      await supabaseAdmin
        .from('operators_events')
        .update({ announced_at: new Date().toISOString() })
        .eq('id', id);
    } catch (error) {
      // Column might not exist yet - that's okay, just log it
      console.log('[ANNOUNCE_EVENT] Could not update announced_at (column may not exist):', error.message);
    }

    return res.status(200).json({
      ok: true,
      message: `Announcement sent to ${successCount} recipients`,
      sent: successCount,
      failed: failureCount,
      total: allRecipients.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit error details
    });
  } catch (error) {
    console.error('[ANNOUNCE_EVENT] Error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Server error',
      details: error.message || 'Unknown error'
    });
  }
}

// Helper function to format time (HH:MM to 12-hour format)
function formatTime(timeString) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}
