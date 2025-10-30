// api/handoff.js
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);
const HANDOFF_TO_EMAIL = process.env.HANDOFF_TO_EMAIL || 'bart@archetypeoriginal.com';
const CALENDLY_SCHEDULING_URL = process.env.CALENDLY_SCHEDULING_URL || null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    message, 
    timestamp, 
    conversationHistory = [],
    triageAnswers = {},
    sessionId
  } = req.body;

  // Basic contact fields we expect in triageAnswers
  const {
    name,
    email,
    phone,
    preferred_contact,
    preferred_time
  } = triageAnswers || {};

  // Check if we're in dark hours
  const now = new Date();
  const cstTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  const hour = cstTime.getHours();
  const dayOfWeek = cstTime.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isDarkHours = isWeekend || hour >= 18 || hour < 10;

  // Create handoff brief
  const handoffBrief = {
    id: `handoff_${Date.now()}`,
    timestamp: new Date().toISOString(),
    message,
    conversationHistory,
    triageAnswers,
    status: isDarkHours ? 'queued' : 'pending',
    isDarkHours,
    sessionId
  };

  // Store handoff in Supabase
  try {
    const { error } = await supabase
      .from('handoffs')
      .insert([
        {
          session_id: sessionId,
          message: message,
          conversation_history: conversationHistory,
          triage_answers: triageAnswers,
          status: handoffBrief.status,
          is_dark_hours: handoffBrief.isDarkHours,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error storing handoff:', error);
    }
  } catch (error) {
    console.error('Supabase error:', error);
  }

  // Send email via Resend (best-effort)
  try {
    const subjectStatus = handoffBrief.isDarkHours ? 'Queued' : 'New';
    const lines = [];
    lines.push(`Status: ${handoffBrief.status}${handoffBrief.isDarkHours ? ' (dark hours)' : ''}`);
    lines.push(`Session: ${sessionId || '(n/a)'}`);
    lines.push('');
    lines.push('Contact');
    lines.push(`Name: ${name || '(n/a)'}`);
    lines.push(`Email: ${email || '(n/a)'}`);
    lines.push(`Phone: ${phone || '(n/a)'}`);
    lines.push(`Preferred: ${preferred_contact || '(n/a)'} ${preferred_time ? `@ ${preferred_time}` : ''}`.trim());
    lines.push('');
    lines.push('Summary');
    lines.push(`${message || '(no message)'}`);
    lines.push('');
    if (triageAnswers) {
      lines.push('Triage');
      lines.push(JSON.stringify(triageAnswers, null, 2));
      lines.push('');
    }
    if (CALENDLY_SCHEDULING_URL) {
      lines.push(`Calendly: ${CALENDLY_SCHEDULING_URL}`);
    }

    await resend.emails.send({
      from: 'Archetype Original <handoff@archetypeoriginal.com>',
      to: HANDOFF_TO_EMAIL,
      subject: `${subjectStatus} Handoff: ${name || email || sessionId || 'Prospect'}`,
      text: lines.join('\n')
    });
  } catch (e) {
    console.error('Resend email failed:', e);
  }

  const baseResponse = {
    success: true,
    queued: isDarkHours,
    calendlyUrl: CALENDLY_SCHEDULING_URL || null
  };

  if (isDarkHours) {
    return res.status(200).json({ 
      ...baseResponse,
      message: `Your handoff request has been queued! Bart's office is closed right now, but I'll deliver your brief at 10 AM CST. He typically replies that afternoon.`
    });
  }

  return res.status(200).json({ 
    ...baseResponse,
    message: 'Your handoff request has been submitted! Bart will review your brief and reply personally within a few hours.'
  });
}
