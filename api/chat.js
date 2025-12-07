import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
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

// Get client IP from Vercel headers
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP.trim();
  }
  return null;
}

// Check if session or IP is blocked (including expiration checks)
async function checkBlocked(sessionId, clientIP) {
  try {
    const now = new Date().toISOString();
    
    // Check session block (including expiration)
    if (sessionId) {
      const { data: sessionBlocks } = await supabase
        .from('blocked_sessions')
        .select('*')
        .eq('session_id', sessionId);
      
      if (sessionBlocks && sessionBlocks.length > 0) {
        const block = sessionBlocks[0];
        // Check if block has expired
        if (block.expires_at && new Date(block.expires_at) < new Date()) {
          // Block expired - remove it
          await supabase.from('blocked_sessions').delete().eq('session_id', sessionId);
          return { blocked: false };
        }
        // Block is still active
        return { blocked: true, reason: 'session_blocked', expiresAt: block.expires_at };
      }
    }

    // Check IP block (including expiration)
    if (clientIP) {
      const { data: ipBlocks } = await supabase
        .from('blocked_ips')
        .select('*')
        .eq('ip_address', clientIP);
      
      if (ipBlocks && ipBlocks.length > 0) {
        const block = ipBlocks[0];
        // Check if block has expired
        if (block.expires_at && new Date(block.expires_at) < new Date()) {
          // Block expired - remove it
          await supabase.from('blocked_ips').delete().eq('ip_address', clientIP);
          return { blocked: false };
        }
        // Block is still active (only if permanent - don't block IP for temporary session blocks)
        if (!block.expires_at) {
          return { blocked: true, reason: 'ip_blocked', expiresAt: null };
        }
      }
    }

    return { blocked: false };
  } catch (error) {
    console.error('Error checking blocks:', error);
    // Don't block on error - allow through
    return { blocked: false };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, conversationHistory = [], sessionId, context } = req.body;
  const clientIP = getClientIP(req);

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Check if session or IP is blocked
  const blockStatus = await checkBlocked(sessionId, clientIP);
  if (blockStatus.blocked) {
    return res.status(403).json({ 
      error: 'Access denied',
      blocked: true,
      reason: blockStatus.reason
    });
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
  
  // Track start time for response time measurement
  const startTime = Date.now();

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
- If someone asks for Bart's email or wants to contact Bart directly → add [SUGGEST_CONTACT] to your response
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
  if (process.env.OPEN_API_KEY) {
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
            'Authorization': `Bearer ${process.env.OPEN_API_KEY}`,
          },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: messages,
          max_tokens: 400,
          temperature: 0.7
        })
      });

      console.log('OpenAI response status:', openaiResponse.status);
      console.log('OpenAI response headers:', Object.fromEntries(openaiResponse.headers.entries()));
      
      const data = await openaiResponse.json();
      console.log('OpenAI response data:', data);
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      if (data.choices && data.choices[0]) {
        let response = data.choices[0].message.content;
        
        // Detect if Archy cannot answer the question
        // Check for indicators that Archy is uncertain or doesn't have the answer
        const cannotAnswerIndicators = [
          /i (don't|do not) (know|have|understand)/i,
          /i'm (not sure|uncertain|unable)/i,
          /i (can't|cannot) (answer|help|provide)/i,
          /(don't|do not) have (that|this) (information|answer|knowledge)/i,
          /(not|outside) (in|of) (my|the) (knowledge|corpus|experience)/i,
          /i (don't|do not) have (access|information) (to|about)/i,
        ];
        
        const responseLower = response.toLowerCase();
        const hasLowKnowledge = relevantKnowledge.length === 0 || 
          (relevantKnowledge.length > 0 && relevantKnowledge.every(doc => {
            const docText = (doc.title + ' ' + doc.summary + ' ' + doc.body).toLowerCase();
            const messageWords = message.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            return messageWords.every(word => !docText.includes(word));
          }));
        
        const indicatesCannotAnswer = cannotAnswerIndicators.some(pattern => pattern.test(responseLower)) ||
          responseLower.includes("i'm having trouble") ||
          responseLower.includes("i'm not able to") ||
          (hasLowKnowledge && responseLower.includes("don't have"));
        
        // Detect nonsensical/trolling questions
        const nonsensicalPatterns = [
          /quantum.*(physics|mechanics|entanglement).*(espresso|coffee|dairy|milk|latte|cappuccino)/i,
          /(espresso|coffee|dairy|milk).*(quantum|physics|mechanics)/i,
          /(philosophy|philosophical).*(quantum|physics|espresso|coffee|dairy)/i,
          /(compare|comparing).*(philosophy|philosophical).*(quantum|physics|espresso|coffee)/i,
          /(what.*color.*horse|how many.*angels.*pinhead|if.*tree.*falls)/i, // Classic nonsensical questions
          /(meaning.*life.*universe.*everything.*42)/i, // Hitchhiker's Guide reference (if used nonsensically)
        ];
        
        let isNonsensical = nonsensicalPatterns.some(pattern => pattern.test(message));
        
        // Use AI to detect nonsensical questions that don't match patterns
        if (!isNonsensical && message.length > 20) {
          try {
            const nonsensicalCheckPrompt = `You are checking if a question asked to Archy (an AI assistant for Bart Paden, a leadership consultant) is nonsensical, off-topic, or clearly trolling.

Question: "${message}"

A question is nonsensical if it:
- Combines completely unrelated topics (e.g., quantum physics + coffee, philosophy + dairy ratios)
- Is clearly testing/trolling the AI
- Has no connection to leadership, culture, business, teams, or organizational health
- Is a joke or prank question

Respond with ONLY a JSON object:
{
  "isNonsensical": true/false,
  "reason": "brief explanation"
}`;

            const nonsensicalCheckResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPEN_API_KEY}`,
              },
              body: JSON.stringify({
                model: 'gpt-4',
                messages: [{ role: 'user', content: nonsensicalCheckPrompt }],
                max_tokens: 100,
                temperature: 0.3
              })
            });

            if (nonsensicalCheckResponse.ok) {
              const checkData = await nonsensicalCheckResponse.json();
              const checkText = checkData.choices?.[0]?.message?.content;
              if (checkText) {
                try {
                  const check = JSON.parse(checkText);
                  isNonsensical = check.isNonsensical === true;
                  if (isNonsensical) {
                    console.log('AI detected nonsensical question:', check.reason);
                  }
                } catch (parseError) {
                  // If parsing fails, fall back to pattern matching only
                  console.error('Error parsing nonsensical check:', parseError);
                }
              }
            }
          } catch (checkError) {
            console.error('Error checking for nonsensical question:', checkError);
            // Fall back to pattern matching only
          }
        }
        
        // Playful responses for nonsensical questions
        const playfulResponses = [
          "You know, that's a good question for a different AI. If you'd like to get back on topic, I'm here for it. If not, let's part friends.",
          "I appreciate the creativity, but I'm focused on leadership, culture, and building things that last. Want to talk about that instead?",
          "That's... quite a question. I'm more of a leadership and culture kind of AI. If you want to explore those topics, I'm all in.",
          "I think you might have me confused with a different AI. I'm here to talk about leadership, teams, and building healthy organizations. Interested?",
          "That's outside my wheelhouse. I'm here for leadership, culture, and helping people build what matters. Want to try again?",
          "I'm going to be honest—that's not really my thing. But if you want to talk about leadership, teams, or building something real, I'm your AI.",
          "That's a fascinating question, but probably better suited for a physics or coffee AI. I'm here for leadership and culture. Want to pivot?",
          "I'm not the right AI for that one. But if you're interested in leadership, building teams, or creating healthy cultures, I'm all ears.",
          "That's creative, but I'm focused on leadership and organizational health. If you want to explore those topics, let's do it.",
          "I think we might be on different wavelengths. I'm here to help with leadership, culture, and building things that last. Want to give that a shot?",
          "That's not really my area of expertise. I'm more about leadership, teams, and helping people build what matters. Interested?",
          "I appreciate the curveball, but I'm here for leadership and culture conversations. If you want to explore those, I'm ready.",
          "That's a question for another time—and another AI. I'm here for leadership, culture, and building healthy organizations. Want to talk about that?",
          "I'm going to pass on that one. But if you want to discuss leadership, building teams, or creating cultures people actually want to belong to, I'm here.",
          "That's outside my scope. I'm focused on leadership, organizational health, and helping people build what lasts. Want to try a different question?",
          "I think you might be testing me. That's fine—but I'm here for real conversations about leadership and culture. Want to have one?",
          "That's not my thing, but I respect the creativity. If you want to talk about leadership, teams, or building something meaningful, I'm all in.",
          "I'm going to be straight with you—that's not what I do. But leadership, culture, and building healthy organizations? That's my jam.",
          "That's a question for a different AI entirely. I'm here for leadership and culture. If you want to explore those, let's go.",
          "I appreciate the originality, but I'm focused on leadership, teams, and organizational health. Want to talk about that instead?",
        ];
        
        // If nonsensical, return a playful response immediately
        if (isNonsensical) {
          const randomResponse = playfulResponses[Math.floor(Math.random() * playfulResponses.length)];
          
          // Still log the question for analysis
          try {
            const questionLower = message.toLowerCase();
            let topicCategory = 'nonsensical';
            
            await supabase
              .from('archy_questions')
              .insert([
                {
                  session_id: sessionId,
                  question: message,
                  response: randomResponse,
                  context: context || 'default',
                  knowledge_docs_used: [],
                  knowledge_docs_count: 0,
                  response_length: randomResponse.length,
                  was_answered: false,
                  is_valuable: false,
                  topic_category: topicCategory,
                  response_time_ms: Date.now() - startTime,
                  created_at: new Date().toISOString()
                }
              ]);
          } catch (error) {
            console.error('Error logging nonsensical question:', error);
          }
          
          return res.status(200).json({ 
            response: randomResponse,
            shouldEscalate: false,
            isDarkHours,
            cannotAnswer: false,
            suggestedButtons: undefined
          });
        }
        
        // Assess if the question is valuable (not spam, potentially a client, or adds to canon)
        let isValuableQuestion = false;
        if (indicatesCannotAnswer) {
          // Check for spam/abuse patterns first
          const spamPatterns = [
            /(buy|sell|purchase|discount|deal|offer|promo|promotion|cheap|free money|get rich)/i,
            /(click here|visit|sign up|register now|limited time)/i,
            /(viagra|pills|pharmacy|medication|drug)/i,
            /(casino|gambling|lottery|winner|prize)/i,
            /(nigerian prince|inheritance|lottery winner)/i,
            /(bitcoin|crypto|investment|trading|forex)/i,
            /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i, // Just an email address
            /^(http|https|www\.)/i, // Just a URL
            /^[^\w\s]{10,}$/, // Mostly special characters
          ];
          
          const isSpam = spamPatterns.some(pattern => pattern.test(message)) ||
            message.length < 10 || // Too short to be meaningful
            message.split(/\s+/).length < 3; // Less than 3 words
          
          if (!isSpam) {
            // Use AI to assess if question is valuable (potential client or canon-worthy)
            try {
              const assessmentPrompt = `You are assessing a question that Archy (an AI assistant representing Bart Paden, a leadership consultant) couldn't answer.

Question: "${message}"

Assess if this question is:
1. From a potential client (shows interest in services, has business/leadership context, asks about working together)
2. Valuable for the knowledge corpus (adds new perspective, reveals gaps, is professionally relevant)
3. Legitimate and not spam/abuse

Respond with ONLY a JSON object:
{
  "isValuable": true/false,
  "reason": "brief explanation",
  "category": "potential_client" | "canon_worthy" | "neither"
}`;

              const assessmentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.OPEN_API_KEY}`,
                },
                body: JSON.stringify({
                  model: 'gpt-4',
                  messages: [{ role: 'user', content: assessmentPrompt }],
                  max_tokens: 150,
                  temperature: 0.3
                })
              });

              if (assessmentResponse.ok) {
                const assessmentData = await assessmentResponse.json();
                const assessmentText = assessmentData.choices?.[0]?.message?.content;
                if (assessmentText) {
                  try {
                    const assessment = JSON.parse(assessmentText);
                    isValuableQuestion = assessment.isValuable === true;
                    console.log('Question assessment:', assessment);
                  } catch (parseError) {
                    console.error('Error parsing assessment:', parseError);
                    // Fallback: check for keywords that suggest value
                    const valuableKeywords = [
                      'consulting', 'mentorship', 'leadership', 'team', 'company', 'business',
                      'culture', 'organization', 'help', 'guidance', 'advice', 'work together',
                      'services', 'pricing', 'how much', 'cost', 'schedule', 'meeting', 'call'
                    ];
                    isValuableQuestion = valuableKeywords.some(keyword => 
                      message.toLowerCase().includes(keyword)
                    );
                  }
                }
              }
            } catch (assessmentError) {
              console.error('Error assessing question value:', assessmentError);
              // Fallback: check for keywords that suggest value
              const valuableKeywords = [
                'consulting', 'mentorship', 'leadership', 'team', 'company', 'business',
                'culture', 'organization', 'help', 'guidance', 'advice', 'work together',
                'services', 'pricing', 'how much', 'cost', 'schedule', 'meeting', 'call'
              ];
              isValuableQuestion = valuableKeywords.some(keyword => 
                message.toLowerCase().includes(keyword)
              );
            }
          }
        }
        
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
        if (response.includes('[SUGGEST_CONTACT]')) {
          suggestedButtons.push({ text: "Contact Bart", value: "show_contact_form" });
          response = response.replace('[SUGGEST_CONTACT]', '');
        }
        
        // If Archy cannot answer AND the question is valuable, modify response and flag it
        let cannotAnswer = false;
        if (indicatesCannotAnswer && isValuableQuestion) {
          cannotAnswer = true;
          // Update response to ask for contact info
          response = "Hey, that's a great question, but I'm having trouble answering it. Can I get your contact information, so I can go talk to Bart and see what his thoughts are?";
          
          // Generate unique ID for this question notification
          const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const siteUrl = process.env.PUBLIC_SITE_URL || process.env.VERCEL_URL || 'https://www.archetypeoriginal.com';
          const feedbackUrl = `${siteUrl}/api/chat/question-feedback`;
          
          // Store the question in Supabase for tracking
          try {
            await supabase
              .from('unanswered_questions')
              .insert([
                {
                  question_id: questionId,
                  question: message,
                  session_id: sessionId,
                  created_at: new Date().toISOString(),
                  feedback: null,
                  is_valuable: null
                }
              ]);
          } catch (dbError) {
            console.error('Error storing question:', dbError);
            // Continue even if DB insert fails
          }
          
          // Send notification email immediately (even before user provides contact info)
          try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const bartEmail = process.env.BART_EMAIL || process.env.CONTACT_EMAIL || "bart@archetypeoriginal.com";
            
            await resend.emails.send({
              from: "Archy <noreply@archetypeoriginal.com>",
              to: bartEmail,
              subject: `Archy Can't Answer: Valuable Question (No Contact Info Yet)`,
              html: `
                <p>Archy encountered a valuable question he couldn't answer. The user may or may not provide contact information.</p>
                
                <h3>Question:</h3>
                <p>${message.replace(/\n/g, '<br>')}</p>
                
                <p><em>If the user provides contact info, you'll receive another email with their details. Consider adding this to the knowledge corpus if it's relevant.</em></p>
                
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                
                <p style="font-size: 12px; color: #666;">
                  <strong>Help improve Archy:</strong> Was this question actually valuable?
                  <br>
                  <a href="${feedbackUrl}?id=${questionId}&feedback=valuable" style="color: #C85A3C; margin-right: 10px;">✓ Yes, valuable</a>
                  <a href="${feedbackUrl}?id=${questionId}&feedback=not_valuable" style="color: #C85A3C;">✗ No, not valuable</a>
                </p>
              `,
            });
          } catch (emailError) {
            console.error("Error sending cannot-answer notification:", emailError);
            // Don't fail the request if email fails
          }
        } else if (indicatesCannotAnswer && !isValuableQuestion) {
          // Still acknowledge we can't answer, but don't offer contact form or send notification
          // Just give a helpful response without the escalation
          console.log('Question detected as not valuable - no notification sent:', message.substring(0, 50));
        }
        
        // Check for escalation triggers - be much more specific and don't escalate basic questions
        const escalationKeywords = ['crisis', 'urgent', 'conflict', 'failure', 'book', 'workshop', 'keynote', 'schedule', 'meeting', 'consulting', 'coaching', 'speak', 'presentation', 'mentorship', 'proposal'];
        const basicQuestionWords = ['who is', 'what is', 'tell me about', 'can he help', 'how does', 'what are', 'explain'];
        const isBasicQuestion = basicQuestionWords.some(word => message.toLowerCase().includes(word));
        
        // Only escalate for high-intent requests, not basic questions
        const shouldOfferEscalation = escalationKeywords.some(keyword => 
          message.toLowerCase().includes(keyword) || response.toLowerCase().includes('handoff')
        ) && !isBasicQuestion && !isDarkHours;

        // Store conversation in Supabase (legacy table)
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
        
        // Log all questions for corpus building analysis
        try {
          // Extract topic category from question (simple keyword matching)
          const questionLower = message.toLowerCase();
          let topicCategory = null;
          if (questionLower.includes('leadership') || questionLower.includes('leader')) {
            topicCategory = 'leadership';
          } else if (questionLower.includes('culture') || questionLower.includes('cultural')) {
            topicCategory = 'culture';
          } else if (questionLower.includes('team') || questionLower.includes('teams')) {
            topicCategory = 'teams';
          } else if (questionLower.includes('consulting') || questionLower.includes('consultant')) {
            topicCategory = 'consulting';
          } else if (questionLower.includes('mentor') || questionLower.includes('mentorship')) {
            topicCategory = 'mentorship';
          } else if (questionLower.includes('speaking') || questionLower.includes('speech') || questionLower.includes('seminar')) {
            topicCategory = 'speaking';
          } else if (questionLower.includes('fractional') || questionLower.includes('cco')) {
            topicCategory = 'fractional';
          } else if (questionLower.includes('training') || questionLower.includes('education')) {
            topicCategory = 'training';
          } else if (questionLower.includes('philosophy') || questionLower.includes('principle')) {
            topicCategory = 'philosophy';
          } else if (questionLower.includes('bart') || questionLower.includes('about')) {
            topicCategory = 'about';
          }
          
          await supabase
            .from('archy_questions')
            .insert([
              {
                session_id: sessionId,
                question: message,
                response: response,
                context: context || 'default',
                knowledge_docs_used: relevantKnowledge.map(doc => doc.title),
                knowledge_docs_count: relevantKnowledge.length,
                response_length: response.length,
                was_answered: !cannotAnswer,
                is_valuable: cannotAnswer ? isValuableQuestion : null, // Only set for cannot-answer questions
                topic_category: topicCategory,
                response_time_ms: responseTime,
                created_at: new Date().toISOString()
              }
            ]);
        } catch (error) {
          console.error('Error logging question for corpus analysis:', error);
          // Don't fail the request if logging fails
        }

        return res.status(200).json({ 
          response,
          shouldEscalate: shouldOfferEscalation,
          isDarkHours,
          cannotAnswer: cannotAnswer,
          suggestedButtons: suggestedButtons.length > 0 ? suggestedButtons : undefined
        });
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      console.error('OpenAI API error details:', error.message);
      console.error('OpenAI API error stack:', error.stack);
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