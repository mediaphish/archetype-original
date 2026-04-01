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

export function toSourceUrl(slug, docType) {
  const t = String(docType || '').toLowerCase();
  if (t === 'faq') {
    return 'https://www.archetypeoriginal.com/faqs';
  }
  const s = String(slug || '').trim();
  if (!s) return null;
  return `https://www.archetypeoriginal.com/journal/${encodeURIComponent(s)}`;
}

/** @returns {Promise<object[]|null>} docs or null if file missing */
export async function loadKnowledgeDocs() {
  try {
    const path = join(process.cwd(), 'public', 'knowledge.json');
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.docs) ? data.docs : [];
  } catch {
    return null;
  }
}

/**
 * Rank knowledge docs by token overlap with query (same scoring as pull-quote search).
 * @returns {{ qTokens: string[], top: { d: object, s: number }[] }}
 */
export function rankDocumentsByQuery(docs, queryText, { topDocs = 25, preferTypes = null } = {}) {
  const qTokens = tokenize(queryText);
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
  return { qTokens, top: scoredDocs.slice(0, topDocs) };
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

/** Paragraphs from markdown-ish body: split on blank lines; split long blocks at sentences. */
function extractParagraphs(text, minLen, maxLen) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const blocks = raw.split(/\n\n+/).map((b) => b.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const out = [];

  const pushChunk = (chunk) => {
    const c = chunk.trim();
    if (c.length >= minLen && c.length <= maxLen) out.push(c);
    else if (c.length > maxLen) out.push(`${c.slice(0, maxLen - 1).trim()}…`);
  };

  for (const b of blocks) {
    if (b.length >= minLen && b.length <= maxLen) {
      out.push(b);
      continue;
    }
    if (b.length < minLen) continue;

    const sentences = b.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    let acc = '';
    for (const sent of sentences) {
      const next = acc ? `${acc} ${sent}` : sent;
      if (next.length <= maxLen) {
        acc = next;
      } else {
        if (acc.length >= minLen) pushChunk(acc);
        acc = sent.length > maxLen ? `${sent.slice(0, maxLen - 1).trim()}…` : sent;
      }
    }
    if (acc.length >= minLen) pushChunk(acc);
  }
  return out;
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
  const docs = await loadKnowledgeDocs();
  if (!docs) return { ok: false, error: 'knowledge_unavailable', quotes: [] };

  const { qTokens, top } = rankDocumentsByQuery(docs, queryText, { topDocs, preferTypes });

  const candidates = [];
  const seen = new Set();

  for (const { d } of top) {
    const fullText = [d.summary, d.body].filter(Boolean).join('\n\n');
    const sentences = extractSentences(fullText);
    const title = String(d.title || d.slug || 'Untitled').trim();
    const slug = d.slug ? String(d.slug).trim() : '';
    const url = toSourceUrl(slug, d.type);

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
    quotes.push({
      quote: c.quote,
      source_title: c.source_title,
      slug: c.slug,
      url: c.url,
      context: '',
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

/**
 * Paragraph-scale excerpts for thematic questions (“where did we discuss X”).
 * @param {object} opts
 * @param {string} opts.queryText
 * @param {number} [opts.limitSnippets=8]
 * @param {number} [opts.topDocs=30]
 * @param {number} [opts.maxCharsPerSnippet=680]
 * @param {number} [opts.minCharsPerParagraph=80]
 * @param {number} [opts.maxSnippetsPerDoc=2]
 */
export async function getCorpusTopicSnippets({
  queryText = '',
  limitSnippets = 8,
  topDocs = 30,
  maxCharsPerSnippet = 680,
  minCharsPerParagraph = 80,
  maxSnippetsPerDoc = 2,
  preferTypes = null,
} = {}) {
  const docs = await loadKnowledgeDocs();
  if (!docs) return { ok: false, error: 'knowledge_unavailable', snippets: [] };

  const { qTokens, top } = rankDocumentsByQuery(docs, queryText, { topDocs, preferTypes });

  const pool = [];
  for (const { d, s: docScore } of top) {
    const fullText = [d.summary, d.body].filter(Boolean).join('\n\n');
    const title = String(d.title || d.slug || 'Untitled').trim();
    const slug = d.slug ? String(d.slug).trim() : '';
    const url = toSourceUrl(slug, d.type);
    const paras = extractParagraphs(fullText, minCharsPerParagraph, maxCharsPerSnippet);

    for (const para of paras) {
      const pTokens = tokenize(para);
      let pScore = scoreOverlap(qTokens, pTokens) * 3 + docScore * 0.15;
      if (qTokens.length === 0) pScore = docScore;
      else if (scoreOverlap(qTokens, pTokens) === 0) continue;

      let excerpt = para;
      if (excerpt.length > maxCharsPerSnippet) excerpt = `${excerpt.slice(0, maxCharsPerSnippet - 1).trim()}…`;

      pool.push({
        excerpt,
        source_title: title,
        slug: slug || null,
        type: d.type || null,
        url,
        score: pScore,
        docKey: slug || title,
      });
    }
  }

  pool.sort((a, b) => b.score - a.score);

  const seen = new Set();
  const perDoc = new Map();
  const snippets = [];

  for (const item of pool) {
    const key = normalizeDedupeKey(item.excerpt);
    if (!key || seen.has(key)) continue;

    const n = perDoc.get(item.docKey) || 0;
    if (n >= maxSnippetsPerDoc) continue;

    seen.add(key);
    perDoc.set(item.docKey, n + 1);
    snippets.push({
      excerpt: item.excerpt,
      source_title: item.source_title,
      slug: item.slug,
      type: item.type,
      url: item.url,
    });
    if (snippets.length >= limitSnippets) break;
  }

  return { ok: true, snippets };
}
