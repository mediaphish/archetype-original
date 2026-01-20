import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../../lib/supabase-admin.js';

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

function searchKnowledge(query, corpus) {
  if (!query || !corpus.docs) return [];

  const searchTerm = query.toLowerCase();
  const words = searchTerm.split(' ').filter(word => word.length > 2);
  if (words.length === 0) return [];

  const scoredDocs = corpus.docs.map(doc => {
    const title = (doc.title || '').toLowerCase();
    const summary = (doc.summary || '').toLowerCase();
    const body = (doc.body || '').toLowerCase();
    const tags = (doc.tags || []).join(' ').toLowerCase();

    let score = 0;

    const isCanonical =
      title.includes('section') ||
      title.includes('canon') ||
      title.includes('doctrine') ||
      title.includes('philosophy') ||
      tags.includes('canon') ||
      tags.includes('doctrine') ||
      summary?.includes('canonical') ||
      summary?.includes('doctrine');

    if (isCanonical) score += 25;
    if (title.includes('faq') || tags.includes('faq')) score += 10;

    if (title.includes(searchTerm)) score += 10;
    if (summary.includes(searchTerm)) score += 8;
    if (body.includes(searchTerm)) score += 6;
    if (tags.includes(searchTerm)) score += 5;

    words.forEach(word => {
      if (title.includes(word)) score += 3;
      if (summary.includes(word)) score += 2;
      if (body.includes(word)) score += 1;
      if (tags.includes(word)) score += 2;
    });

    return { doc, score };
  });

  return scoredDocs
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => item.doc);
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, zone, aliScore, lowestPatterns, largestGap, responseCount } = req.body || {};

    if (!email) return res.status(400).json({ error: 'email is required' });
    if (!zone) return res.status(400).json({ error: 'zone is required' });

    // Basic auth check: must map to an ALI contact
    const normalizedEmail = String(email).trim().toLowerCase();
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('ali_contacts')
      .select('company_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (contactError) {
      console.error('zone-recommendations: contact lookup error', contactError);
      return res.status(500).json({ error: 'Failed to resolve account' });
    }
    if (!contact?.company_id) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const corpus = loadKnowledgeCorpus();
    const query = [
      'ALI',
      'zone',
      zone,
      ...(Array.isArray(lowestPatterns) ? lowestPatterns : []),
      'consistency',
      'clarity',
      'trust',
      'alignment'
    ].join(' ');
    const relevantKnowledge = searchKnowledge(query, corpus);

    let knowledgeContext = '';
    if (relevantKnowledge.length > 0) {
      knowledgeContext += '\n\nRELEVANT KNOWLEDGE (AUTHORITATIVE):\n';
      relevantKnowledge.forEach(doc => {
        knowledgeContext += `Title: ${doc.title}\n`;
        if (doc.summary) knowledgeContext += `Summary: ${doc.summary}\n`;
        if (doc.body) knowledgeContext += `Body: ${String(doc.body).slice(0, 1400)}\n`;
        knowledgeContext += '\n';
      });
    }

    const system = [
      'You are Archy, an AI leadership assistant.',
      'Goal: generate one highly practical, low-friction “first move” a leader can do this week based on ALI zone evidence.',
      'Audience: busy leader, not bought into the ideology, needs clarity and proof.',
      'Constraints:',
      '- Be specific. Avoid vague advice.',
      '- Keep it short and actionable.',
      '- Provide: (1) a concrete behavior experiment, (2) a short script to say to the team, (3) what to watch for.',
      '- Do NOT assume the user knows ALI terms.',
      '- Use the provided knowledge context as the primary source of philosophy/definitions.',
      '',
      'Return STRICT JSON only (no markdown) in this shape:',
      '{ "title": string, "behavior_experiment": string, "team_script": string, "watch_for": string, "why_this": string }'
    ].join('\n');

    const user = [
      `Context: ALI Current Zone = ${zone}`,
      `ALI score = ${typeof aliScore === 'number' ? aliScore.toFixed(1) : aliScore}`,
      `Lowest patterns = ${Array.isArray(lowestPatterns) ? lowestPatterns.join(', ') : String(lowestPatterns || '')}`,
      `Largest gap = ${largestGap || ''}`,
      `Response count = ${responseCount ?? ''}`,
      '',
      'Generate the recommended first move now.',
      knowledgeContext
    ].join('\n');

    const openaiKey = requireEnv('OPENAI_API_KEY');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    const data = await openaiResponse.json();
    if (!openaiResponse.ok) {
      console.error('zone-recommendations: openai error', data);
      return res.status(500).json({ error: 'Failed to generate recommendation' });
    }

    const text = data?.choices?.[0]?.message?.content || '';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Fallback: return raw text for debugging, but still avoid crashing UI
      return res.status(200).json({
        recommendation: null,
        raw: text
      });
    }

    return res.status(200).json({
      recommendation: parsed
    });
  } catch (err) {
    console.error('zone-recommendations error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

