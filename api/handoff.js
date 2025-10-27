// api/handoff.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    message, 
    timestamp, 
    conversationHistory = [],
    triageAnswers = {}
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

  // Log the handoff request (will be replaced with Supabase/Slack when ready)
  console.log('Handoff request received:', handoffBrief);

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