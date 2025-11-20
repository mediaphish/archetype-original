import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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

// Use AI to assess if message is a real threat vs just casual/unprofessional language
async function assessThreatWithAI(message, conversationHistory) {
  if (!process.env.OPEN_API_KEY) {
    // Fallback: only flag obvious threats
    const obviousThreats = [
      /(kill|murder|harm|hurt)\s+(you|yourself|your|me|myself)/i,
      /(hope|wish)\s+(you|they|he|she)\s+(die|kill|hurt|suffer)/i,
      /(threat|threaten|violence|attack)/i
    ];
    return obviousThreats.some(pattern => pattern.test(message));
  }

  try {
    const assessmentPrompt = `You are a threat assessment system. Analyze this message and determine if it contains:
1. A REAL THREAT (violence, harm, illegal activity directed at someone)
2. HARASSMENT (repeated negative behavior, trolling, abuse)
3. CASUAL LANGUAGE (swearing, unprofessional but not threatening)
4. NORMAL CONVERSATION

Message: "${message}"

Recent conversation context:
${conversationHistory.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Respond with ONLY one word: THREAT, HARASSMENT, CASUAL, or NORMAL

Do not flag casual language, swearing, or unprofessional speech unless it's actually threatening or harassing.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPEN_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a threat assessment system. Respond with only one word: THREAT, HARASSMENT, CASUAL, or NORMAL.' },
          { role: 'user', content: assessmentPrompt }
        ],
        max_tokens: 10,
        temperature: 0.3
      })
    });

    const data = await response.json();
    const assessment = data.choices?.[0]?.message?.content?.trim().toUpperCase();
    
    return {
      isThreat: assessment === 'THREAT',
      isHarassment: assessment === 'HARASSMENT',
      isCasual: assessment === 'CASUAL',
      assessment
    };
  } catch (error) {
    console.error('Error in AI threat assessment:', error);
    // Fallback to conservative assessment
    return { isThreat: false, isHarassment: false, isCasual: true, assessment: 'ERROR' };
  }
}

// Check message pattern over recent conversation
async function checkMessagePattern(sessionId) {
  try {
    // Get recent messages from this session
    const { data: recentMessages } = await supabase
      .from('conversations')
      .select('user_message, assistant_response, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!recentMessages || recentMessages.length < 2) {
      return { pattern: 'normal', negativeCount: 0 };
    }

    // Count negative/unprofessional messages in recent history
    let negativeCount = 0;
    for (const msg of recentMessages.slice(0, 5)) {
      const messageLower = msg.user_message?.toLowerCase() || '';
      // Simple heuristic: check for patterns of negativity
      const negativePatterns = [
        /(fuck|shit|damn|hate)\s+(you|this|that|it)/i,
        /(you're|you are)\s+(an?\s+)?(idiot|stupid|dumb|worthless|useless|asshole)/i,
        /(go|get)\s+(fuck|die|away)/i
      ];
      
      if (negativePatterns.some(pattern => pattern.test(messageLower))) {
        negativeCount++;
      }
    }

    return {
      pattern: negativeCount >= 3 ? 'relentless' : negativeCount >= 2 ? 'negative' : 'normal',
      negativeCount
    };
  } catch (error) {
    console.error('Error checking message pattern:', error);
    return { pattern: 'normal', negativeCount: 0 };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, message, conversationHistory = [] } = req.body;
  const clientIP = getClientIP(req);

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'Session ID and message are required' });
  }

  try {
    // Use AI to assess if this is a real threat
    const aiAssessment = await assessThreatWithAI(message, conversationHistory);
    
    // Check message pattern over recent conversation
    const patternCheck = await checkMessagePattern(sessionId);

    // Decision logic:
    // - Real threat: Permanent block
    // - Harassment + relentless pattern (3+ negative messages): 24-hour block
    // - Otherwise: Allow through
    
    if (aiAssessment.isThreat) {
      // REAL THREAT - Permanent block
      const threatData = {
        session_id: sessionId,
        client_ip: clientIP,
        threat_message: message,
        conversation_history: conversationHistory,
        created_at: new Date().toISOString(),
        blocked: true,
        block_type: 'permanent',
        assessment: aiAssessment.assessment
      };

      await supabase.from('threats').insert([threatData]);
      
      await supabase.from('blocked_sessions').upsert([{
        session_id: sessionId,
        client_ip: clientIP,
        blocked_at: new Date().toISOString(),
        reason: 'real_threat',
        expires_at: null // Permanent
      }], { onConflict: 'session_id' });

      if (clientIP) {
        await supabase.from('blocked_ips').upsert([{
          ip_address: clientIP,
          blocked_at: new Date().toISOString(),
          reason: 'real_threat',
          session_id: sessionId,
          expires_at: null // Permanent
        }], { onConflict: 'ip_address' });
      }

      return res.status(200).json({
        blocked: true,
        blockType: 'permanent',
        reason: 'real_threat',
        assessment: aiAssessment.assessment
      });
    }

    if (aiAssessment.isHarassment && patternCheck.pattern === 'relentless') {
      // HARASSMENT + RELENTLESS PATTERN - 24-hour temporary block
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await supabase.from('blocked_sessions').upsert([{
        session_id: sessionId,
        client_ip: clientIP,
        blocked_at: new Date().toISOString(),
        reason: 'harassment_pattern',
        expires_at: expiresAt.toISOString()
      }], { onConflict: 'session_id' });

      return res.status(200).json({
        blocked: true,
        blockType: 'temporary',
        reason: 'harassment_pattern',
        expiresAt: expiresAt.toISOString(),
        assessment: aiAssessment.assessment,
        negativeCount: patternCheck.negativeCount
      });
    }

    // Not a threat - allow through
    return res.status(200).json({
      blocked: false,
      assessment: aiAssessment.assessment,
      pattern: patternCheck.pattern,
      negativeCount: patternCheck.negativeCount
    });
  } catch (error) {
    console.error('Error in assess-threat handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

