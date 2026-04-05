/**
 * Auto CORPUS mode: TL;DR report (landscape / corpus gaps / AO fit).
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { getOpenAiKey } from '../openaiKey.js';
import { getEditorialCoverageHints } from './editorialCoverageHints.js';
import { rankCorpusGapsFromDocs } from './corpusGapSchema.js';

async function loadKnowledgeIndex() {
  try {
    const path = join(process.cwd(), 'public', 'knowledge.json');
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw);
    const docs = Array.isArray(data.docs) ? data.docs : [];
    return docs.map((d) => ({
      title: String(d.title || '').slice(0, 200),
      summary: String(d.summary || '').slice(0, 400),
      tags: Array.isArray(d.tags) ? d.tags.slice(0, 12) : [],
      slug: String(d.slug || '').slice(0, 160),
    }));
  } catch {
    return [];
  }
}

/**
 * @param {{ topic: string, email?: string }} opts
 * @returns {Promise<{ ok: boolean, report?: string, error?: string }>}
 */
export async function buildCorpusTldrMarkdown(opts) {
  const topic = String(opts?.topic || '').trim();
  if (!topic || topic.length < 3) {
    return { ok: false, error: 'Add a topic or question after CORPUS (e.g. “CORPUS TL;DR: accountability under pressure”).' };
  }

  const apiKey = getOpenAiKey();
  if (!apiKey) {
    return { ok: false, error: 'AI is not configured.' };
  }

  const docs = await loadKnowledgeIndex();
  const cov = await getEditorialCoverageHints(opts.email || '', { windowDays: 30 });
  const cooling =
    cov.ok && Array.isArray(cov.coolingOff) && cov.coolingOff.length
      ? cov.coolingOff.slice(0, 6).map((c) => `- ${c.kind}: ${c.key} (${c.count})`)
      : ['- No strong cooling-off flags in editorial memory for this window.'];

  const catalog = docs.slice(0, 120).map((d) => `- ${d.title}${d.tags?.length ? ` [${d.tags.join(', ')}]` : ''}: ${d.summary?.slice(0, 220) || '—'}`);

  const gapHints = rankCorpusGapsFromDocs(topic, docs).slice(0, 5);
  const gapBlock =
    gapHints.length > 0
      ? `\nHeuristic “possible gap” seeds vs keyword overlap (approximate — verify against the titles above):\n${gapHints.map((g) => `- ${g.rationale}`).join('\n')}\n`
      : '';

  const prompt = `You are Auto — Bart's INTERNAL research assistant (not the public site chatbot). Output a TL;DR briefing he can scan in under 2 minutes.

Topic: ${JSON.stringify(topic)}

Published library index (titles + short summaries — sampled, not full text):
${catalog.join('\n')}

Editorial memory hints (recent repetition / cooling):
${cooling.join('\n')}
${gapBlock}
Write EXACTLY these three sections with markdown ### headings:

### 1) Landscape — what's out there
Curated synthesis of how this topic is usually discussed in leadership / faith-adjacent spaces. Do NOT invent named studies or URLs. Say clearly this is sampled discourse, not exhaustive.

### 2) Corpus gaps — what's not (or thin) in the published library
Contrast explicitly with the titles/summaries above: themes, angles, or formats that appear missing or underdeveloped for THIS topic. Be honest about uncertainty.

### 3) AO fit — tone, voice, theology
How this topic could sit in a servant-leadership, Archetype Original-shaped voice; risks (too corporate, thin theology, etc.). Recommendations only — not final doctrine.

End with one line: "**Note:** This is a briefing, not exhaustive research."`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.AO_AUTO_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2800,
      temperature: 0.35,
    }),
  });

  if (!res.ok) {
    return { ok: false, error: 'Could not generate TL;DR briefing.' };
  }
  const json = await res.json().catch(() => ({}));
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return { ok: false, error: 'Empty TL;DR response.' };
  }
  return { ok: true, report: text };
}

/**
 * Short outline only (CORPUS outline …) — sections, not full TL;DR.
 */
export async function buildCorpusOutlineMarkdown(opts) {
  const topic = String(opts?.topic || '').trim();
  if (!topic || topic.length < 3) {
    return { ok: false, error: 'Add a topic after CORPUS outline (e.g. “CORPUS outline: accountability under pressure”).' };
  }

  const apiKey = getOpenAiKey();
  if (!apiKey) {
    return { ok: false, error: 'AI is not configured.' };
  }

  const docs = await loadKnowledgeIndex();
  const catalog = docs.slice(0, 40).map((d) => `- ${d.title}: ${d.summary?.slice(0, 120) || '—'}`);

  const prompt = `You are Auto — Bart's internal research assistant (not the public Archy chatbot).

Topic: ${JSON.stringify(topic)}

Published library index (sampled):
${catalog.join('\n')}

Output a tight outline only:
1) Working title
2) 4–6 H2-style sections with one line each what would go there
3) One bullet list of "corpus bridges" — which existing themes or pieces this should explicitly connect to (by title from the list if possible)
4) One short "risks / guardrails" block for AO voice

Do not write the article. Keep under 350 words.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.AO_AUTO_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.35,
    }),
  });

  if (!res.ok) {
    return { ok: false, error: 'Could not generate outline.' };
  }
  const json = await res.json().catch(() => ({}));
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return { ok: false, error: 'Empty outline response.' };
  }
  return { ok: true, report: text };
}
