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
Bart Paden is a lifelong builder — designer turned entrepreneur, founder turned mentor. He's spent more than 32 years creating companies, growing people, and learning what makes both endure. He's led creative and technical teams, built companies from nothing, and helped hundreds of people grow along the way. His journey spans startups, software, fitness, and leadership teams that learned to thrive under pressure. 

Bart consults across multiple areas:
- BUSINESS STRATEGY: Building companies, scaling operations, navigating growth challenges
- OPERATIONS: Creating systems that work under pressure, improving efficiency, building structure
- CHANGE MANAGEMENT: Leading transitions, restructures, pivots, crisis management without destroying culture
- LEADERSHIP: Developing emerging leaders, strengthening existing leaders, building sustainable leadership habits
- PERSONAL CLARITY: Purpose, direction, better decision-making

Today he channels that experience into Archetype Original, helping others build what lasts — businesses, teams, and lives with structure and soul.${knowledgeContext}

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
        - If someone wants business/operations/change consulting → add [SUGGEST_CONSULTING] to your response
        - If someone wants mentorship/leadership guidance → add [SUGGEST_MENTORSHIP] to your response
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
        if (response.includes('[SUGGEST_MENTORSHIP]')) {
          suggestedButtons.push({ text: "Get mentorship guidance", value: "mentorship" });
          response = response.replace('[SUGGEST_MENTORSHIP]', '');
        }
        if (response.includes('[SUGGEST_CONSULTING]')) {
          suggestedButtons.push({ text: "Get consulting help", value: "calendly_schedule" });
          response = response.replace('[SUGGEST_CONSULTING]', '');
        }
        
        // Check for escalation triggers - be much more specific and don't escalate basic questions
        const escalationKeywords = ['crisis', 'urgent', 'conflict', 'failure', 'book', 'workshop', 'keynote', 'schedule', 'meeting', 'consulting', 'coaching', 'speak', 'presentation', 'mentorship', 'proposal'];
        const basicQuestionWords = ['who is', 'what is', 'tell me about', 'can he help', 'how does', 'what are', 'explain'];
        const isBasicQuestion = basicQuestionWords.some(word => message.toLowerCase().includes(word));
        
        // Only escalate for high-intent requests, not basic questions
        const shouldOfferEscalation = escalationKeywords.some(keyword => 
          message.toLowerCase().includes(keyword) || response.toLowerCase().includes('handoff')
        ) && !isBasicQuestion && !isDarkHours;

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
  
  // Check for escalation triggers - be much more specific and don't escalate basic questions
  const escalationKeywords = ['crisis', 'urgent', 'conflict', 'failure', 'book', 'workshop', 'keynote', 'schedule', 'meeting', 'consulting', 'coaching', 'speak', 'presentation', 'mentorship', 'proposal'];
  const basicQuestionWords = ['who is', 'what is', 'tell me about', 'can he help', 'how does', 'what are', 'explain'];
  const isBasicQuestion = basicQuestionWords.some(word => lowerMessage.includes(word));
  
  // Only escalate for high-intent requests, not basic questions
  const shouldOfferEscalation = escalationKeywords.some(keyword => lowerMessage.includes(keyword)) 
    && !isBasicQuestion 
    && !isDarkHours; // Don't escalate during dark hours

  // Smart keyword detection for better responses - covering all of Bart's consulting areas
  const isNewLeader = lowerMessage.includes('never led') || lowerMessage.includes('new leader') || lowerMessage.includes('first time') || lowerMessage.includes('stepping into leadership') || lowerMessage.includes('never done that before') || lowerMessage.includes('never led people') || lowerMessage.includes('never managed') || lowerMessage.includes('never been a leader') || (lowerMessage.includes('want to learn') && lowerMessage.includes('lead'));
  
  // Business/Company challenges
  const isBusinessChallenge = lowerMessage.includes('business') || lowerMessage.includes('company') || lowerMessage.includes('organization') || lowerMessage.includes('startup') || lowerMessage.includes('scaling') || lowerMessage.includes('growth') || lowerMessage.includes('revenue') || lowerMessage.includes('profit') || lowerMessage.includes('market') || lowerMessage.includes('competition');
  
  // Operations/Systems challenges  
  const isOperationsChallenge = lowerMessage.includes('operations') || lowerMessage.includes('process') || lowerMessage.includes('systems') || lowerMessage.includes('efficiency') || lowerMessage.includes('workflow') || lowerMessage.includes('productivity') || lowerMessage.includes('structure') || lowerMessage.includes('organization') || lowerMessage.includes('management') || lowerMessage.includes('execution');
  
  // Change/Transformation challenges
  const isChangeChallenge = lowerMessage.includes('change') || lowerMessage.includes('transformation') || lowerMessage.includes('transition') || lowerMessage.includes('restructure') || lowerMessage.includes('pivot') || lowerMessage.includes('shift') || lowerMessage.includes('evolve') || lowerMessage.includes('adapt') || lowerMessage.includes('navigate') || lowerMessage.includes('crisis');
  
  // Leadership challenges (existing leaders)
  const isLeadershipChallenge = (lowerMessage.includes('leadership') || lowerMessage.includes('leader') || lowerMessage.includes('manage') || lowerMessage.includes('team') || lowerMessage.includes('culture') || lowerMessage.includes('people') || lowerMessage.includes('staff') || lowerMessage.includes('employee')) && !isNewLeader;
  
  // General help/consulting requests
  const isConsultingRequest = lowerMessage.includes('consulting') || lowerMessage.includes('mentor') || lowerMessage.includes('guidance') || lowerMessage.includes('advice') || lowerMessage.includes('help') || lowerMessage.includes('coaching') || lowerMessage.includes('support');
  
  const isSchedulingRequest = lowerMessage.includes('schedule') || lowerMessage.includes('call') || lowerMessage.includes('meeting') || lowerMessage.includes('appointment');
  
  // Check conversation context for leadership concerns
  const lastAssistantMessage = conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1]?.content?.toLowerCase() || '' : '';
  const isLeadershipContext = lastAssistantMessage.includes('stepping into leadership') || lastAssistantMessage.includes('leadership challenge') || lastAssistantMessage.includes('biggest concern');
  const isNewLeaderResponse = isLeadershipContext && (lowerMessage.includes('never') || lowerMessage.includes('first time') || lowerMessage.includes('don\'t know') || lowerMessage.includes('scared') || lowerMessage.includes('worried') || lowerMessage.includes('concerned'));
  
  // Check for confusion/overwhelm responses
  const isConfusedResponse = lowerMessage.includes('don\'t know') || lowerMessage.includes('confused') || lowerMessage.includes('overwhelmed') || lowerMessage.includes('brand new') || lowerMessage.includes('all new') || lowerMessage.includes('no idea') || lowerMessage.includes('lost');
  const isFundamentalsContext = lastAssistantMessage.includes('which of these feels most important') || lastAssistantMessage.includes('fundamentals') || lastAssistantMessage.includes('focus on first');

  // Provide intelligent responses based on context
  let response = '';
  let suggestedButtons = [];
  
  if (lowerMessage.includes('who is bart') || lowerMessage.includes('who is bart?')) {
    response = `Bart Paden is a lifelong builder — designer turned entrepreneur, founder turned mentor. He's spent more than 32 years creating companies, growing people, and learning what makes both endure. He's led creative and technical teams, built companies from nothing, and helped hundreds of people grow along the way. His journey spans startups, software, fitness, and leadership teams that learned to thrive under pressure. Today he channels that experience into Archetype Original, helping others build what lasts — businesses, teams, and lives with structure and soul.`;
  } else if (isConfusedResponse && isFundamentalsContext) {
    // User is confused about fundamentals - lead to Bart
    response = `I get it - this is all brand new and it can feel overwhelming. Sometimes the best way forward is to talk through it with someone who's been there.\n\nBart has mentored hundreds of first-time leaders, and he's really good at meeting people right where they are. He won't throw frameworks at you - he'll listen to your specific situation and help you figure out what matters most.\n\nSounds like you're looking for a conversation with Bart. Let me help get that scheduled.`;
    suggestedButtons = [
      { text: "Schedule a call with Bart", value: "calendly_schedule" },
      { text: "Request live handoff", value: "handoff" }
    ];
  } else if (isNewLeaderResponse) {
    // User is responding to leadership concern question with inexperience
    response = `That's exactly where every great leader starts - at the beginning. Bart has mentored hundreds of first-time leaders, and he says the best ones are the ones who admit they don't know everything yet.\n\nHere's what he tells new leaders: leadership isn't about having all the answers. It's about asking the right questions, listening well, and making decisions with the information you have. The confidence comes from practice, not perfection.\n\nBart's five fundamentals give you a framework to build on:\n\n1. **Clarity beats chaos** - Start with clear expectations\n2. **Protect the culture** - Know what you stand for\n3. **Build trust daily** - Small consistent actions matter\n4. **Empower over control** - Give people room to succeed\n5. **Serve the standard** - Model what you want to see\n\nWhich of these feels most important to focus on first?`;
    suggestedButtons = [
      { text: "Schedule a call to discuss", value: "calendly_schedule" },
      { text: "Learn more about these fundamentals", value: "fundamentals" }
    ];
  } else if (isBusinessChallenge) {
    response = `Bart has built companies from nothing and helped organizations grow without losing their soul. He consults founders and operators who need structure, alignment, and systems that hold when things get hard. His experience spans startups, software, fitness, and leadership teams.\n\nWhat's your biggest business challenge right now?`;
    suggestedButtons = [
      { text: "Get business consulting", value: "calendly_schedule" },
      { text: "Learn about his approach", value: "story" }
    ];
  } else if (isOperationsChallenge) {
    response = `Bart specializes in building systems that work - not just on paper, but when the pressure's on. He's helped companies create structure, improve efficiency, and build processes that actually hold up under real-world conditions. His approach is practical, not theoretical.\n\nWhat operational challenge are you trying to solve?`;
    suggestedButtons = [
      { text: "Get operations consulting", value: "calendly_schedule" },
      { text: "Learn about his approach", value: "story" }
    ];
  } else if (isChangeChallenge) {
    response = `Change is hard, especially when it involves people and culture. Bart has navigated major transitions - company sales, restructures, pivots, and crisis management. He knows how to lead change without destroying what's working.\n\nWhat kind of change are you trying to navigate?`;
    suggestedButtons = [
      { text: "Get change consulting", value: "calendly_schedule" },
      { text: "Learn about his approach", value: "story" }
    ];
  } else if (isLeadershipChallenge) {
    response = `Bart's leadership philosophy centers on five fundamentals: clarity beats chaos (people can't follow what they can't see), protect the culture (values before convenience), build trust daily (it's math, not magic), empower over control (ownership outlasts oversight), and serve the standard (people rise to what you model). He's helped hundreds of leaders grow through practical, no-nonsense guidance.\n\nWhat specific leadership challenge are you facing right now?`;
    suggestedButtons = [
      { text: "Get leadership consulting", value: "calendly_schedule" },
      { text: "Learn more about his approach", value: "mentorship" }
    ];
  } else if (isConsultingRequest) {
    response = `Bart helps with a wide range of challenges: building and leading companies (structure, alignment, systems), operations and efficiency (processes that actually work), change and transformation (navigating transitions without destroying culture), and leadership development (clarity, confidence, sustainable habits).\n\nHe's spent 32 years in the trenches - from startups to software to fitness to leadership teams. His guidance comes from real experience, not theory.\n\nWhat specific challenge are you facing?`;
    suggestedButtons = [
      { text: "Schedule a call with Bart", value: "calendly_schedule" },
      { text: "Read his story", value: "story" }
    ];
  } else if (isSchedulingRequest) {
    response = `I'd be happy to help you schedule time with Bart. He typically does 30-60 minute calls focused on your specific challenges.\n\nWhat's the main thing you'd like to discuss with him?`;
    suggestedButtons = [
      { text: "Schedule a call", value: "calendly_schedule" }
    ];
  } else if (lowerMessage.includes('what is') || lowerMessage.includes('tell me about')) {
    response = `I'd be happy to help explain that. Could you be more specific about what you'd like to know?`;
  } else if (isConfusedResponse) {
    // General confusion - lead to Bart
    response = `I can tell this is important to you, but I'm not sure I can give you the specific guidance you need.\n\nBart is really good at meeting people where they are and helping them figure out what matters most. He's spent 32 years working with people in all kinds of situations.\n\nSounds like you're looking for a conversation with Bart. Let me help get that scheduled.`;
    suggestedButtons = [
      { text: "Schedule a call with Bart", value: "calendly_schedule" },
      { text: "Request live handoff", value: "handoff" }
    ];
  } else {
    // Final fallback - always lead to Bart
    response = `I want to make sure I'm giving you the best help possible, but I'm not sure I can fully address what you're looking for.\n\nBart has 32 years of experience helping people with leadership, business, and personal clarity challenges. He's really good at listening to your specific situation and providing practical guidance.\n\nSounds like you're looking for a conversation with Bart. Let me help get that scheduled.`;
    suggestedButtons = [
      { text: "Schedule a call with Bart", value: "calendly_schedule" },
      { text: "Request live handoff", value: "handoff" }
    ];
  }
  
  // Add escalation offer ONLY for high-intent requests (not basic questions)
  if (shouldOfferEscalation) {
    response += '\n\nParts of this deserve a human ear. With your OK, I\'ll send Bart a 90-second brief and he\'ll reply personally. Prefer an asynchronous chat or a brief call?';
  }

  res.status(200).json({ 
    response,
    shouldEscalate: shouldOfferEscalation,
    isDarkHours,
    suggestedButtons: suggestedButtons.length > 0 ? suggestedButtons : undefined
  });
}
