import { readFile } from 'fs/promises';
import { join } from 'path';

function tokenize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/g)
    .filter((w) => w.length >= 3)
    .slice(0, 400);
}

function scoreOverlap(aTokens, bTokens) {
  const a = new Set(aTokens);
  let score = 0;
  for (const t of bTokens) if (a.has(t)) score += 1;
  return score;
}

function toSourceUrl(slug, docType) {
  const t = String(docType || '').toLowerCase();
  if (t === 'faq') {
    return 'https://www.archetypeoriginal.com/faqs';
  }
  const s = String(slug || '').trim();
  if (!s) return null;
  return `https://www.archetypeoriginal.com/journal/${encodeURIComponent(s)}`;
}

/** Split body into sentence-like chunks for scoring. */
function extractSentences(text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return [];
  const parts = raw.split(/(?<=[.!?])\s+/).map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (p.length >= 20 && p.length <= 420) out.push(p);
  }
  return out;
}

function normalizeDedupeKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[""'']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

/**
 * Rank docs from public/knowledge.json and extract 3–5 pull-quote candidates with source + context.
 * @param {object} opts
 * @param {string} opts.queryText - User message (themes / scope)
 * @param {number} [opts.limit=5]
 * @param {number} [opts.topDocs=25]
 * @param {string[]} [opts.preferTypes] - e.g. ['article'] to weight journal-like content
 */
export async function getCorpusPullQuotes({
  queryText = '',
  limit = 5,
  topDocs = 25,
  preferTypes = null,
} = {}) {
  const qTokens = tokenize(queryText);
  const path = join(process.cwd(), 'public', 'knowledge.json');
  let docs = [];
  try {
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw);
    docs = Array.isArray(data.docs) ? data.docs : [];
  } catch {
    return { ok: false, error: 'knowledge_unavailable', quotes: [] };
  }

  const prefer = preferTypes && preferTypes.length ? new Set(preferTypes.map((x) => String(x).toLowerCase())) : null;

  const scoredDocs = [];
  for (const d of docs) {
    const body = [d.title, d.summary, d.body].filter(Boolean).join('\n\n');
    if (!body || body.length < 40) continue;
    const dTokens = tokenize(body);
    let s = scoreOverlap(qTokens, dTokens);
    if (prefer && d.type && prefer.has(String(d.type).toLowerCase())) s += 3;
    if (qTokens.length === 0) {
      s = 1 + Math.min(body.length, 8000) / 8000;
    } else if (s <= 0) continue;
    scoredDocs.push({ d, s });
  }
  scoredDocs.sort((a, b) => b.s - a.s);
  const top = scoredDocs.slice(0, topDocs);

  const candidates = [];
  const seen = new Set();

  for (const { d } of top) {
    const fullText = [d.summary, d.body].filter(Boolean).join('\n\n');
    const sentences = extractSentences(fullText);
    const title = String(d.title || d.slug || 'Untitled').trim();
    const slug = d.slug ? String(d.slug).trim() : '';
    const url = toSourceUrl(slug, d.type);
    const st = tokenize(`${title} ${fullText}`);

    for (const sentence of sentences) {
      const stSent = tokenize(sentence);
      const lineScore = scoreOverlap(qTokens, stSent) * 2 + Math.min(sentence.length, 200) / 200;
      const key = normalizeDedupeKey(sentence);
      if (!key || seen.has(key)) continue;
      if (sentence.length < 28) continue;

      candidates.push({
        quote: sentence.replace(/^["']|["']$/g, '').trim(),
        source_title: title,
        slug: slug || null,
        type: d.type || null,
        url,
        score: lineScore,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const quotes = [];
  for (const c of candidates) {
    const key = normalizeDedupeKey(c.quote);
    if (seen.has(key)) continue;
    seen.add(key);
    const ctx = '';
    quotes.push({
      quote: c.quote,
      source_title: c.source_title,
      slug: c.slug,
      url: c.url,
      context: ctx,
    });
    if (quotes.length >= limit) break;
  }

  if (quotes.length < limit && top.length) {
    for (const { d } of top) {
      if (quotes.length >= limit) break;
      const body = String(d.body || d.summary || '').trim();
      if (body.length < 40) continue;
      const fallback = body.slice(0, Math.min(280, body.length)).trim();
      const key = normalizeDedupeKey(fallback);
      if (seen.has(key)) continue;
      seen.add(key);
      quotes.push({
        quote: fallback.endsWith('.') ? fallback : `${fallback}…`,
        source_title: String(d.title || d.slug || 'Untitled').trim(),
        slug: d.slug ? String(d.slug).trim() : null,
        type: d.type || null,
        url: toSourceUrl(d.slug ? String(d.slug).trim() : '', d.type),
        context: '',
      });
    }
  }

  return { ok: true, quotes: quotes.slice(0, limit) };
}
