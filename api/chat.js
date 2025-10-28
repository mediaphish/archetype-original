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
    // Try multiple possible paths for Vercel serverless environment
    const possiblePaths = [
      path.join(process.cwd(), 'api', 'knowledge.json'),
      path.join(process.cwd(), 'public', 'knowledge.json'),
      path.join(process.cwd(), 'knowledge.json'),
      '/var/task/api/knowledge.json',
      '/var/task/public/knowledge.json',
      './knowledge.json',
      '../public/knowledge.json'
    ];
    
    for (const knowledgePath of possiblePaths) {
      if (fs.existsSync(knowledgePath)) {
        console.log('Found knowledge corpus at:', knowledgePath);
        const rawData = fs.readFileSync(knowledgePath, 'utf8');
        return JSON.parse(rawData);
      }
    }
    
    console.log('Knowledge corpus not found. Tried paths:', possiblePaths);
  } catch (error) {
    console.error('Error loading knowledge corpus:', error);
  }
  return { docs: [] };
}

// Search knowledge corpus for relevant content
function searchKnowledge(query, corpus) {
  if (!query || !corpus.docs) return corpus.docs.slice(0, 3); // Return first 3 docs if no query
  
  const searchTerm = query.toLowerCase();
  const words = searchTerm.split(' ').filter(word => word.length > 2);
  
  // If no meaningful words, return some general docs
  if (words.length === 0) {
    return corpus.docs.slice(0, 3);
  }
  
  const scoredDocs = corpus.docs.map(doc => {
    const title = (doc.title || '').toLowerCase();
    const summary = (doc.summary || '').toLowerCase();
    const body = (doc.body || '').toLowerCase();
    const tags = (doc.tags || []).join(' ').toLowerCase();
    
    let score = 0;
    
    // Exact phrase match gets highest score
    if (title.includes(searchTerm)) score += 10;
    if (summary.includes(searchTerm)) score += 8;
    if (body.includes(searchTerm)) score += 6;
    if (tags.includes(searchTerm)) score += 5;
    
    // Individual word matches
    words.forEach(word => {
      if (title.includes(word)) score += 3;
      if (summary.includes(word)) score += 2;
      if (body.includes(word)) score += 1;
      if (tags.includes(word)) score += 2;
    });
    
    return { doc, score };
  });
  
  // Sort by score and return top 5
  return scoredDocs
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.doc);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, conversationHistory = [], sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Load and search knowledge corpus
  const knowledgeCorpus = loadKnowledgeCorpus();
  console.log('Knowledge corpus loaded:', knowledgeCorpus.docs ? knowledgeCorpus.docs.length : 0, 'documents');
  
  const relevantKnowledge = searchKnowledge(message, knowledgeCorpus);
  console.log('Searching for:', message);
  console.log('Relevant knowledge found:', relevantKnowledge.length, 'documents');
  if (relevantKnowledge.length > 0) {
    console.log('Found documents:', relevantKnowledge.map(doc => doc.title));
  }

  // Build knowledge context for AI
  let knowledgeContext = '';
  if (relevantKnowledge.length > 0) {
    knowledgeContext = '\n\nRELEVANT KNOWLEDGE FROM BART PADEN\'S CORPUS:\n';
    relevantKnowledge.forEach(doc => {
      knowledgeContext += `Title: ${doc.title}\n`;
      if (doc.tags && doc.tags.length > 0) {
        knowledgeContext += `Tags: ${doc.tags.join(', ')}\n`;
      }
      if (doc.summary) {
        knowledgeContext += `Summary: ${doc.summary}\n`;
      }
      knowledgeContext += `Content: ${doc.body.substring(0, 500)}...\n\n`;
    });
  }

  // Determine if it's dark hours (6 PM - 10 AM CST)
  const now = new Date();
  const options = { timeZone: 'America/Chicago', hour: 'numeric', hour12: false };
  const currentHourCST = parseInt(new Intl.DateTimeFormat('en-US', options).format(now));
  const isDarkHours = currentHourCST >= 18 || currentHourCST < 10; // 6 PM to 10 AM CST

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
- Use the knowledge corpus above to inform your responses, but don't just quote it - synthesize it naturally.
- If you don't have relevant information in the corpus, be honest about it.

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

  // Try OpenAI first, fallback to simple error if it fails
  console.log('OpenAI API key present:', !!process.env.OPENAI_API_KEY);
  if (process.env.OPENAI_API_KEY) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message },
      ];

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: messages,
          max_tokens: 400,
          temperature: 0.7
        })
      });

      const data = await openaiResponse.json();
      console.log('OpenAI response status:', openaiResponse.status);
      
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
      console.error('OpenAI API error details:', error.message);
      // Fall through to simple error response
    }
  }

  // Simple fallback if OpenAI fails
  const fallbackResponse = "I'm having trouble connecting to my knowledge base right now. Please try again in a moment, or if this persists, you can contact Bart directly through the traditional site sections below.";
  
  return res.status(200).json({ 
    response: fallbackResponse,
    shouldEscalate: false,
    isDarkHours,
    suggestedButtons: [
      { text: "Go Analog", value: "go_analog" }
    ]
  });
}
