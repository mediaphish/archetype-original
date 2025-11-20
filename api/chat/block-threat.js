import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Get client IP from Vercel headers
function getClientIP(req) {
  // Vercel provides IP in x-forwarded-for or x-real-ip
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP.trim();
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, message, conversationHistory } = req.body;
  const clientIP = getClientIP(req);

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // Store threat report in database
    const threatData = {
      session_id: sessionId,
      client_ip: clientIP,
      threat_message: message,
      conversation_history: conversationHistory,
      created_at: new Date().toISOString(),
      blocked: true
    };

    // Store in threats table (we'll create this in Supabase)
    const { error: threatError } = await supabase
      .from('threats')
      .insert([threatData]);

    if (threatError) {
      console.error('Error storing threat:', threatError);
      // Continue even if storage fails - we still want to block
    }

    // Block the session ID
    const { error: blockError } = await supabase
      .from('blocked_sessions')
      .upsert([
        {
          session_id: sessionId,
          client_ip: clientIP,
          blocked_at: new Date().toISOString(),
          reason: 'threat_detected'
        }
      ], {
        onConflict: 'session_id'
      });

    if (blockError) {
      console.error('Error blocking session:', blockError);
    }

    // Optionally block IP address (for persistent threats)
    if (clientIP) {
      const { error: ipBlockError } = await supabase
        .from('blocked_ips')
        .upsert([
          {
            ip_address: clientIP,
            blocked_at: new Date().toISOString(),
            reason: 'threat_detected',
            session_id: sessionId
          }
        ], {
          onConflict: 'ip_address'
        });

      if (ipBlockError) {
        console.error('Error blocking IP:', ipBlockError);
      }
    }

    return res.status(200).json({ 
      ok: true, 
      message: 'Threat reported and blocked',
      sessionBlocked: true,
      ipBlocked: !!clientIP
    });
  } catch (error) {
    console.error('Error in block-threat handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

