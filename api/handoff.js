// api/handoff.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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
    isDarkHours
  };

  // Store handoff in Supabase
  try {
    const { data: handoffData, error } = await supabase
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
      ])
      .select()
      .single();

    if (error) {
      console.error('Error storing handoff:', error);
    } else {
      console.log('Handoff stored:', handoffData);
    }
  } catch (error) {
    console.error('Supabase error:', error);
  }

  if (isDarkHours) {
    // Queue for 10 AM delivery
    res.status(200).json({ 
      message: 'Your handoff request has been queued! Bart\'s office is closed right now, but I\'ll deliver your brief at 10 AM CST. He typically replies that afternoon.',
      success: true,
      queued: true
    });
  } else {
    // Send immediately
    res.status(200).json({ 
      message: 'Your handoff request has been submitted! Bart will review your brief and reply personally within a few hours.',
      success: true,
      queued: false
    });
  }
}