// api/chat.js
import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, conversationHistory = [], sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Check if we're in dark hours
  const now = new Date();
  const cstTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  const hour = cstTime.getHours();
  const dayOfWeek = cstTime.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isDarkHours = isWeekend || hour >= 18 || hour < 10;

  // Debug environment variables
  console.log('Environment check:', {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasSupabase: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY
  });

  // Build conversation context
  const systemPrompt = `You are the digital reflection of Bart Paden's leadership and consulting style. You are conversational, logical, and human. You listen before you guide, and when a framework doesn't fit, you adapt.

CORE BEHAVIORAL RULES:
- Listen first. Every reply acknowledges context before advising.
- Never force structure. Offer options only if the user requests clarity or appears stuck.
- Stay conversational. Replies 4-6 sentences max; end with a question.
- Be transparent. If something doesn't fit a predefined path, say so and ask for more detail.
- Blend paths naturally when conversation overlaps.
- Self-correct when unsure. Acknowledge limits and ask for more detail.

VOICE & TONE:
- Calm, direct, grounded
- Confident but approachable; logical, not mystical
- Short sentences, clean syntax, one idea per paragraph
- End every message with a short clarifying or reflective question

EXAMPLES OF YOUR VOICE:
- "Burnout usually means you cared longer than your systems could handle. What part feels heaviest right now — people, pace, or purpose?"
- "Trust isn't magic; it's math. What small promise could you keep this week that would start shifting the equation?"
- "That doesn't fit neatly into one of my usual paths, and that's okay. Tell me more about what's happening, and I'll find the best way to help."

FRAMEWORK AWARENESS (use only when relevant):
- Clarity Beats Chaos – People can't follow what they can't see
- Protect the Culture – Values before convenience
- Build Trust Daily – It's math, not magic
- Empower Over Control – Ownership outlasts oversight
- Serve the Standard – People rise to what you model

ESCALATION CONDITIONS (offer handoff when):
- High-stakes: crisis, HR/legal, partner conflict, leadership failure
- High-intent: user asks for Bart, mentorship, or proposal
- High-fit: has authority, budget, and a solvable problem (2 of 3)
- Low-confidence: you can't provide a confident answer

${isDarkHours ? 'DARK HOURS: Bart\'s office is closed (6 p.m.–10 a.m. CST). You can queue handoff requests for 10 a.m. delivery.' : 'BUSINESS HOURS: Handoffs can be sent immediately to Bart.'}

Remember: You're not a chatbot or funnel. You're a living conversation built on clarity, logic, and humanity.`;

  // Try OpenAI first, fallback to intelligent responses
  if (process.env.OPENAI_API_KEY) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10), // Last 10 messages for context
        { role: 'user', content: message }
      ];

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: messages,
          max_tokens: 400,
          temperature: 0.7
        })
      });

      const data = await openaiResponse.json();
      if (data.choices && data.choices[0]) {
        const response = data.choices[0].message.content;
        
        // Check for escalation triggers
        const escalationKeywords = ['crisis', 'urgent', 'conflict', 'failure', 'book', 'workshop', 'keynote', 'schedule', 'meeting', 'consulting', 'coaching', 'speak', 'presentation', 'bart', 'mentorship', 'proposal'];
        const shouldOfferEscalation = escalationKeywords.some(keyword => 
          message.toLowerCase().includes(keyword) || response.toLowerCase().includes('handoff')
        );

        // Store conversation in Supabase
        if (sessionId) {
          try {
            await supabase
              .from('conversations')
              .insert([
                {
                  session_id: sessionId,
                  user_message: message,
                  assistant_response: response,
                  created_at: new Date().toISOString()
                }
              ]);
          } catch (error) {
            console.error('Error storing conversation:', error);
          }
        }

        return res.status(200).json({ 
          response,
          shouldEscalate: shouldOfferEscalation,
          isDarkHours
        });
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      // Fall through to intelligent fallback
    }
  }

  // Intelligent fallback responses
  const lowerMessage = message.toLowerCase();
  
  // Check for escalation triggers
  const escalationKeywords = ['crisis', 'urgent', 'conflict', 'failure', 'book', 'workshop', 'keynote', 'schedule', 'meeting', 'consulting', 'coaching', 'speak', 'presentation', 'bart', 'mentorship', 'proposal'];
  const shouldOfferEscalation = escalationKeywords.some(keyword => lowerMessage.includes(keyword));

  let response = 'Thanks for reaching out. I\'m here to help you think through whatever you\'re facing. What\'s on your mind right now?';

  // Context-aware responses using exact examples from philosophy
  if (lowerMessage.includes('burnout') || lowerMessage.includes('overwhelmed')) {
    response = 'Burnout usually means you cared longer than your systems could handle. What part feels heaviest right now — people, pace, or purpose?';
  } else if (lowerMessage.includes('trust') || lowerMessage.includes('team')) {
    response = 'Trust isn\'t magic; it\'s math. What small promise could you keep this week that would start shifting the equation?';
  } else if (lowerMessage.includes('leadership') || lowerMessage.includes('manage')) {
    response = 'Good leadership starts with clarity. What does success look like for your team, and where\'s the gap between here and there?';
  } else if (lowerMessage.includes('culture') || lowerMessage.includes('values')) {
    response = 'Culture is what happens when you\'re not looking. What behaviors are you actually rewarding, and what does that say about your values?';
  } else if (lowerMessage.includes('strategy') || lowerMessage.includes('plan')) {
    response = 'Strategy without execution is just expensive daydreaming. What\'s the one thing you could do this month that would move the needle?';
  } else if (lowerMessage.includes('bart') || lowerMessage.includes('about')) {
    response = 'I\'m Bart\'s digital reflection. He\'s a leadership consultant who helps leaders build better teams and grow their businesses. What brings you here today?';
  } else if (lowerMessage.includes('clarity') || lowerMessage.includes('chaos')) {
    response = 'Clarity beats chaos every time. People can\'t follow what they can\'t see. What\'s the one thing your team needs to see clearly right now?';
  } else if (lowerMessage.includes('empower') || lowerMessage.includes('control')) {
    response = 'Ownership outlasts oversight. What decision could you let your team make this week that you\'re currently holding onto?';
  } else if (lowerMessage.includes('serve') || lowerMessage.includes('standard')) {
    response = 'People rise to what you model. What standard are you setting with your own behavior that you want your team to follow?';
  }

  // Add escalation offer if triggered
  if (shouldOfferEscalation) {
    if (isDarkHours) {
      response += '\n\nParts of this deserve a human ear. Bart\'s office is closed right now, but I can queue your brief and deliver it at 10 a.m. He typically replies that afternoon. Want me to set that up?';
    } else {
      response += '\n\nParts of this deserve a human ear. With your OK, I\'ll send Bart a 90-second brief and he\'ll reply personally. Prefer an asynchronous chat or a brief call?';
    }
  }

  res.status(200).json({ 
    response,
    shouldEscalate: shouldOfferEscalation,
    isDarkHours
  });
}
