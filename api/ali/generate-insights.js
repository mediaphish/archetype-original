import fs from 'fs';
import path from 'path';

export const config = { runtime: 'nodejs' };

// Load knowledge corpus (same as chat.js)
function loadKnowledgeCorpus() {
  try {
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
        const rawData = fs.readFileSync(knowledgePath, 'utf8');
        return JSON.parse(rawData);
      }
    }
  } catch (error) {
    console.error('[GENERATE_INSIGHTS] Error loading knowledge corpus:', error);
  }
  return { docs: [] };
}

export default async function handler(req, res) {
  // Log immediately to ensure we can see if function is called
  console.log('[GENERATE_INSIGHTS] Function called, method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    console.log('[GENERATE_INSIGHTS] Processing request...');
    const { metrics } = req.body;

    if (!metrics || !Array.isArray(metrics)) {
      console.error('[GENERATE_INSIGHTS] Missing or invalid metrics');
      return res.status(400).json({ ok: false, error: 'Metrics array is required' });
    }

    console.log('[GENERATE_INSIGHTS] Received', metrics.length, 'metrics');

    const knowledgeCorpus = loadKnowledgeCorpus();
    console.log('[GENERATE_INSIGHTS] Knowledge corpus:', knowledgeCorpus.docs?.length || 0, 'docs');
    
    // Search for relevant ALI/leadership content
    const relevantKnowledge = (knowledgeCorpus.docs || [])
      .filter(doc => {
        const title = (doc.title || '').toLowerCase();
        const tags = Array.isArray(doc.tags) ? doc.tags.join(' ').toLowerCase() : '';
        return title.includes('ali') || 
               title.includes('leadership') || 
               title.includes('culture') ||
               tags.includes('ali') ||
               tags.includes('leadership');
      })
      .slice(0, 5);

    console.log('[GENERATE_INSIGHTS] Found', relevantKnowledge.length, 'relevant docs');

    let knowledgeContext = '';
    if (relevantKnowledge.length > 0) {
      knowledgeContext = '\n\nRELEVANT KNOWLEDGE FROM BART PADEN\'S CORPUS:\n';
      relevantKnowledge.forEach(doc => {
        knowledgeContext += `Title: ${doc.title || 'Untitled'}\n`;
        if (doc.summary) {
          knowledgeContext += `Summary: ${doc.summary}\n`;
        }
        const body = doc.body || '';
        knowledgeContext += `Content: ${body.substring(0, 800)}${body.length > 800 ? '...' : ''}\n\n`;
      });
    }

    // This project uses OPEN_API_KEY (see `api/chat.js`)
    const openaiApiKey = process.env.OPEN_API_KEY;
    if (!openaiApiKey) {
      console.error('[GENERATE_INSIGHTS] OpenAI API key missing (OPEN_API_KEY)');
      return res.status(500).json({ ok: false, error: 'OpenAI API key not configured' });
    }

    console.log('[GENERATE_INSIGHTS] Building prompt...');
    
    // Generate insights for all metrics in one call
    const systemPrompt = `You are Archy, an AI leadership assistant helping leaders understand their ALI (Archetype Leadership Index) scores.

${knowledgeContext}

Generate brief, actionable insights (one sentence each) for each metric. Focus on:
- What the score means in practical leadership terms
- What it indicates about the leader's effectiveness
- What it suggests about team dynamics
- Actionable guidance, not just description

Do NOT just describe the relationship between scores (e.g., "Leader overestimates"). Instead, explain what the score means and what it suggests about leadership effectiveness.

Return ONLY a JSON object with metric keys and insight strings:
{
  "clarity": "Brief insight about what this clarity score means",
  "consistency": "Brief insight about what this consistency score means",
  "trust": "Brief insight about what this trust score means",
  "communication": "Brief insight about what this communication score means",
  "alignment": "Brief insight about what this alignment score means",
  "stability": "Brief insight about what this stability score means",
  "leadership_drift": "Brief insight about what this leadership alignment score means"
}

Metrics data:
${JSON.stringify(metrics, null, 2)}`;

    console.log('[GENERATE_INSIGHTS] Calling OpenAI API...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    console.log('[GENERATE_INSIGHTS] OpenAI response status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('[GENERATE_INSIGHTS] OpenAI API error:', errorText);
      return res.status(500).json({ ok: false, error: 'Failed to generate insights', details: errorText.substring(0, 200) });
    }

    const aiData = await openaiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    console.log('[GENERATE_INSIGHTS] Received AI response, length:', aiContent?.length || 0);

    if (!aiContent) {
      console.error('[GENERATE_INSIGHTS] No content in response');
      return res.status(500).json({ ok: false, error: 'No content in AI response' });
    }

    // Parse JSON from response
    let insights = {};
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
        console.log('[GENERATE_INSIGHTS] Successfully parsed insights for keys:', Object.keys(insights));
      } else {
        console.error('[GENERATE_INSIGHTS] No JSON found. Content preview:', aiContent.substring(0, 300));
        return res.status(500).json({ ok: false, error: 'No JSON found in AI response' });
      }
    } catch (e) {
      console.error('[GENERATE_INSIGHTS] JSON parse error:', e.message);
      console.error('[GENERATE_INSIGHTS] Content that failed to parse:', aiContent.substring(0, 300));
      return res.status(500).json({ ok: false, error: 'Failed to parse insights', details: e.message });
    }

    console.log('[GENERATE_INSIGHTS] Returning success with', Object.keys(insights).length, 'insights');
    return res.status(200).json({ ok: true, insights });
  } catch (error) {
    console.error('[GENERATE_INSIGHTS] Unexpected error:', error.message);
    console.error('[GENERATE_INSIGHTS] Stack:', error.stack);
    return res.status(500).json({ ok: false, error: 'Server error', details: error.message });
  }
}
