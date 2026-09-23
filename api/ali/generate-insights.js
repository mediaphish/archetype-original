/**
 * ALI — Generate per-metric insights.
 *
 * This runs on Claude through lib/ao/textModel.js. It called OpenAI directly
 * until 2026-09-23, and Bart's rule is that OpenAI is for image creation only,
 * so every text call in the platform goes through the shared helper now.
 */

import fs from 'fs';
import path from 'path';
import { CONDITION_KEYS, CONDITION_LABELS } from '../../lib/ali-conditions.js';
import { requireAliSession } from '../../lib/ali-session.js';
import { completeJson, textModelConfigured } from '../../lib/ao/textModel.js';

export const config = { runtime: 'nodejs' };

const INSIGHT_KEY_HINTS = {
  clarity: 'Brief insight about what this clarity score means',
  communication: 'Brief insight about what this communication score means',
  consistency: 'Brief insight about what this consistency score means',
  trust: 'Brief insight about what this trust score means',
  alignment: 'Brief insight about what this alignment score means',
  stability: 'Brief insight about what this stability score means',
  leadership_drift: 'Brief insight about what this Drift score means (mismatch between stated leadership and team experience; lower is better)',
};

function buildInsightSchemaBlock() {
  const lines = CONDITION_KEYS.map((key, idx) => {
    const value = INSIGHT_KEY_HINTS[key] || `Brief insight about what this ${CONDITION_LABELS[key] || key} score means`;
    const trailingComma = idx === CONDITION_KEYS.length - 1 ? '' : ',';
    return `  "${key}": "${value}"${trailingComma}`;
  });
  return `{\n${lines.join('\n')}\n}`;
}

// Load knowledge corpus (same as chat.js)
function loadKnowledgeCorpus() {
  try {
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'knowledge.json'),
      '/var/task/public/knowledge.json',
      path.join(process.cwd(), 'knowledge.json'),
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

  const session = await requireAliSession(req, res);
  if (!session) return;

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

    if (!textModelConfigured()) {
      console.error('[GENERATE_INSIGHTS] Text model not configured (ANTHROPIC_API_KEY)');
      return res.status(500).json({ ok: false, error: 'Text model not configured' });
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
${buildInsightSchemaBlock()}

Metrics data:
${JSON.stringify(metrics, null, 2)}`;

    console.log('[GENERATE_INSIGHTS] Calling the text model...');
    const insights = await completeJson({ prompt: systemPrompt, task: 'analysis', maxTokens: 1500 });

    if (!insights) {
      console.error('[GENERATE_INSIGHTS] No JSON found in AI response');
      return res.status(500).json({ ok: false, error: 'No JSON found in AI response' });
    }

    console.log('[GENERATE_INSIGHTS] Successfully parsed insights for keys:', Object.keys(insights));

    console.log('[GENERATE_INSIGHTS] Returning success with', Object.keys(insights).length, 'insights');
    return res.status(200).json({ ok: true, insights });
  } catch (error) {
    console.error('[GENERATE_INSIGHTS] Unexpected error:', error.message);
    console.error('[GENERATE_INSIGHTS] Stack:', error.stack);
    return res.status(500).json({ ok: false, error: 'Server error', details: error.message });
  }
}
