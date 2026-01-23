import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export const config = { runtime: 'nodejs' };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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
    console.error('Error loading knowledge corpus:', error);
  }
  return { docs: [] };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { metrics } = req.body;

    if (!metrics || !Array.isArray(metrics)) {
      return res.status(400).json({ ok: false, error: 'Metrics array is required' });
    }

    const knowledgeCorpus = loadKnowledgeCorpus();
    
    // Search for relevant ALI/leadership content
    const relevantKnowledge = knowledgeCorpus.docs
      .filter(doc => {
        const title = (doc.title || '').toLowerCase();
        const tags = (doc.tags || []).join(' ').toLowerCase();
        return title.includes('ali') || 
               title.includes('leadership') || 
               title.includes('culture') ||
               tags.includes('ali') ||
               tags.includes('leadership');
      })
      .slice(0, 5);

    let knowledgeContext = '';
    if (relevantKnowledge.length > 0) {
      knowledgeContext = '\n\nRELEVANT KNOWLEDGE FROM BART PADEN\'S CORPUS:\n';
      relevantKnowledge.forEach(doc => {
        knowledgeContext += `Title: ${doc.title}\n`;
        if (doc.summary) {
          knowledgeContext += `Summary: ${doc.summary}\n`;
        }
        knowledgeContext += `Content: ${doc.body.substring(0, 800)}...\n\n`;
      });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ ok: false, error: 'OpenAI API key not configured' });
    }

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

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return res.status(500).json({ ok: false, error: 'Failed to generate insights' });
    }

    const aiData = await openaiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    // Parse JSON from response
    let insights = {};
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Error parsing insights JSON:', e);
      return res.status(500).json({ ok: false, error: 'Failed to parse insights' });
    }

    return res.status(200).json({ ok: true, insights });
  } catch (error) {
    console.error('[GENERATE_INSIGHTS] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
