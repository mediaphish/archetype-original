import { readFile } from 'fs/promises';
import { join } from 'path';

function tokenize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/g)
    .filter((w) => w.length >= 4)
    .slice(0, 400);
}

function scoreOverlap(aTokens, bTokens) {
  const a = new Set(aTokens);
  let score = 0;
  for (const t of bTokens) if (a.has(t)) score += 1;
  return score;
}

function toAoUrl(slug) {
  const s = String(slug || '').trim();
  if (!s) return null;
  return `https://www.archetypeoriginal.com/journal/${encodeURIComponent(s)}`;
}

/**
 * Pick a few relevant AO examples from public/knowledge.json to anchor voice.
 * Lightweight heuristic (keyword overlap).
 */
export async function getVoiceAnchors({ queryText, limit = 3 } = {}) {
  try {
    const qTokens = tokenize(queryText);
    if (qTokens.length === 0) return [];
    const path = join(process.cwd(), 'public', 'knowledge.json');
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw);
    const docs = Array.isArray(data.docs) ? data.docs : [];

    const scored = [];
    for (const d of docs) {
      const body = [d.title, d.summary, d.body].filter(Boolean).join(' ');
      if (!body) continue;
      const dTokens = tokenize(body);
      const s = scoreOverlap(qTokens, dTokens);
      if (s <= 1) continue;
      scored.push({ d, s });
    }
    scored.sort((x, y) => y.s - x.s);
    return scored.slice(0, limit).map(({ d }) => ({
      title: d.title || d.slug || 'AO post',
      slug: d.slug || null,
      url: d.slug ? toAoUrl(d.slug) : null,
      excerpt: String(d.summary || d.body || '').trim().slice(0, 280),
    }));
  } catch {
    return [];
  }
}

