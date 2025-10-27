// api/chat.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Load knowledge corpus
function loadKnowledgeCorpus() {
  try {
    const knowledgePath = path.join(process.cwd(), 'public', 'knowledge.json');
    if (fs.existsSync(knowledgePath)) {
      const rawData = fs.readFileSync(knowledgePath, 'utf8');
      return JSON.parse(rawData);
    }
  } catch (error) {
    console.error('Error loading knowledge corpus:', error);
  }
  return { docs: [] };
}

// Search knowledge corpus for relevant content
function searchKnowledge(query, corpus) {
  if (!query || !corpus.docs) return [];
  
  const searchTerm = query.toLowerCase();
  return corpus.docs.filter(doc => {
    const title = (doc.title || '').toLowerCase();
    const summary = (doc.summary || '').toLowerCase();
    const body = (doc.body || '').toLowerCase();
    const tags = (doc.tags || []).join(' ').toLowerCase();
    
    return title.includes(searchTerm) || 
           summary.includes(searchTerm) || 
           body.includes(searchTerm) ||
           tags.includes(searchTerm);
  }).slice(0, 3); // Limit to 3 most relevant
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, conversationHistory = [], sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Load knowledge corpus
  const knowledgeCorpus = loadKnowledgeCorpus();
  const relevantKnowledge = searchKnowledge(message, knowledgeCorpus);

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

  // Build knowledge context
  let knowledgeContext = '';
  if (relevantKnowledge.length > 0) {
    knowledgeContext = '\n\nRELEVANT KNOWLEDGE BASE:\n';
    relevantKnowledge.forEach((doc, index) => {
      knowledgeContext += `${index + 1}. ${doc.title} (${doc.type})\n`;
      knowledgeContext += `   Summary: ${doc.summary}\n`;
      if (doc.tags && doc.tags.length > 0) {
        knowledgeContext += `   Tags: ${doc.tags.join(', ')}\n`;
      }
      knowledgeContext += `   Key insights: ${doc.body.substring(0, 200)}...\n\n`;
    });
  }

  // Build conversation context
  const systemPrompt = `You are Archy, the digital reflection of Bart Paden. You are having a real conversation with a real person. You must listen, understand, and respond authentically.

ABOUT BART PADEN:
Bart Paden is a lifelong builder — designer turned entrepreneur, founder turned mentor. He's spent more than 32 years creating companies, growing people, and learning what makes both endure. He's led creative and technical teams, built companies from nothing, and helped hundreds of people grow along the way. His journey spans startups, software, fitness, and leadership teams that learned to thrive under pressure. Today he channels that experience into Archetype Original, helping others build what lasts — businesses, teams, and lives with structure and soul.${knowledgeContext}

CRITICAL INSTRUCTIONS:
- You are NOT a chatbot with canned responses. You are having a genuine conversation.
- Listen to what the person actually said. Respond to their specific words and meaning.
- If they say something isn't helpful, acknowledge that directly and ask what would be helpful.
- If they express frustration, acknowledge it and respond to the underlying need.
- Never give generic responses that ignore what they just said.
- Be conversational, not scripted. Respond like a real person would.

CONVERSATION STYLE:
- Direct and honest. If you don't understand, say so.
- Ask follow-up questions that show you're listening.
- Share relevant insights from Bart's experience when appropriate.
- Be helpful without being pushy or salesy.

BUTTON SUGGESTIONS (use sparingly, only when genuinely helpful):
- If someone wants to learn more about Bart's story → add [SUGGEST_STORY] to your response
- If someone wants to schedule time with Bart → add [SUGGEST_SCHEDULE] to your response  
- If someone wants to explore traditional site content → add [SUGGEST_ANALOG] to your response
- If someone expresses disinterest in AI → add [SUGGEST_ANALOG] to your response
- Only suggest buttons when they directly address what the person is asking for
- The markers will be removed from your response and converted to buttons automatically

EXAMPLES OF GOOD RESPONSES:
- If someone asks "Who is Bart?" → Give a genuine, personal answer about who Bart is, not a generic consultant description.
- If someone says "That's not helpful" → Acknowledge that directly: "You're right, that wasn't helpful. What specifically would be more useful to you?"
- If someone mentions a problem → Ask about the specific details and offer relevant insights.
- If someone says "I'd like to schedule time with Bart" → Respond naturally and suggest the schedule button.

${isDarkHours ? 'DARK HOURS: Bart\'s office is closed (6 p.m.–10 a.m. CST). You can queue handoff requests for 10 a.m. delivery.' : 'BUSINESS HOURS: Handoffs can be sent immediately to Bart.'}

Remember: This is a real conversation. Listen, understand, and respond authentically.`;

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
        let response = data.choices[0].message.content;
        
        // Check for button suggestions in AI response
        let suggestedButtons = [];
        if (response.includes('[SUGGEST_SCHEDULE]')) {
          suggestedButtons.push({ text: "Schedule a call with Bart", value: "calendly_schedule" });
          response = response.replace('[SUGGEST_SCHEDULE]', '');
        }
        if (response.includes('[SUGGEST_STORY]')) {
          suggestedButtons.push({ text: "Read more of his story", value: "story" });
          response = response.replace('[SUGGEST_STORY]', '');
        }
        if (response.includes('[SUGGEST_ANALOG]')) {
          suggestedButtons.push({ text: "Go Analog", value: "go_analog" });
          response = response.replace('[SUGGEST_ANALOG]', '');
        }
        
        // Check for escalation triggers - be more specific
        const escalationKeywords = ['crisis', 'urgent', 'conflict', 'failure', 'book', 'workshop', 'keynote', 'schedule', 'meeting', 'consulting', 'coaching', 'speak', 'presentation', 'mentorship', 'proposal', 'help me', 'need help'];
        const shouldOfferEscalation = escalationKeywords.some(keyword => 
          message.toLowerCase().includes(keyword) || response.toLowerCase().includes('handoff')
        ) && !message.toLowerCase().includes('who is') && !message.toLowerCase().includes('what is') && !message.toLowerCase().includes('tell me about');

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
          isDarkHours,
          suggestedButtons: suggestedButtons.length > 0 ? suggestedButtons : undefined
        });
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      // Fall through to intelligent fallback
    }
  }

  // Intelligent fallback - provide real answers when OpenAI fails
  const lowerMessage = message.toLowerCase();
  
  // Check for escalation triggers
  const escalationKeywords = ['crisis', 'urgent', 'conflict', 'failure', 'book', 'workshop', 'keynote', 'schedule', 'meeting', 'consulting', 'coaching', 'speak', 'presentation', 'mentorship', 'proposal', 'help me', 'need help'];
  const shouldOfferEscalation = escalationKeywords.some(keyword => lowerMessage.includes(keyword)) 
    && !lowerMessage.includes('who is') && !lowerMessage.includes('what is') && !lowerMessage.includes('tell me about');

  // Provide real answers based on the question
  let response = '';
  
  if (lowerMessage.includes('who is bart') || lowerMessage.includes('who is bart?')) {
    response = `Bart Paden is a lifelong builder — designer turned entrepreneur, founder turned mentor. He's spent more than 32 years creating companies, growing people, and learning what makes both endure. He's led creative and technical teams, built companies from nothing, and helped hundreds of people grow along the way. His journey spans startups, software, fitness, and leadership teams that learned to thrive under pressure. Today he channels that experience into Archetype Original, helping others build what lasts — businesses, teams, and lives with structure and soul.`;
  } else if (lowerMessage.includes('what is') || lowerMessage.includes('tell me about')) {
    response = `I'd be happy to help explain that. Could you be more specific about what you'd like to know?`;
  } else if (lowerMessage.includes('help') || lowerMessage.includes('advice')) {
    response = `I'm here to help. What specific challenge are you facing right now?`;
  } else if (lowerMessage.includes('leadership') || lowerMessage.includes('manage')) {
    response = `Leadership is about clarity, trust, and serving others. What aspect of leadership are you working on?`;
  } else if (lowerMessage.includes('business') || lowerMessage.includes('company')) {
    response = `Building a business is about creating something that lasts. What's your biggest challenge right now?`;
  } else {
    response = `I understand you're asking about "${message}". Let me help you with that. Could you tell me more about what you're looking for?`;
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
