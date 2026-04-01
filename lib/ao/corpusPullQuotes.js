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

/**
 * Public page for a knowledge doc. Avoids /journal/... links that do not exist (e.g. internal Culture Science chunks).
 * Pass `doc` when available so Accidental CEO chapters link to the book landing page.
 */
export function toSourceUrl(slug, docType, doc = null) {
  const t = String(docType || '').toLowerCase();
  const s = String(slug || '').trim();
  const tags = doc && Array.isArray(doc.tags) ? doc.tags.map((x) => String(x).toLowerCase()) : [];

  if (t === 'faq') {
    return 'https://www.archetypeoriginal.com/faqs';
  }

  if (tags.includes('accidental-ceo') && (t === 'chapter' || t === 'preface')) {
    return 'https://www.archetypeoriginal.com/accidental-ceo';
  }

  if (t === 'book' && s === 'remaining-human') {
    return 'https://www.archetypeoriginal.com/remaining-human';
  }

  if (t === 'journal-post' || t === 'devotional') {
    if (!s) return null;
    return `https://www.archetypeoriginal.com/journal/${encodeURIComponent(s)}`;
  }

  if (t === 'culture-science' || t === 'article') {
    return 'https://www.archetypeoriginal.com/culture-science';
  }

  return null;
}

/**
 * Pull-quote retrieval: journal posts, devotionals, RemAIning Human ebook, and Accidental CEO (preface + chapters) from the corpus.
 * Excludes FAQs and internal canon even when tagged accidental-ceo.
 */
export function isPullQuoteSourceDoc(d) {
  if (!d) return false;
  const t = String(d.type || '').toLowerCase();
  const slug = String(d.slug || '').trim();
  const tags = Array.isArray(d.tags) ? d.tags.map((x) => String(x).toLowerCase()) : [];

  if (t === 'journal-post' || t === 'devotional') return true;
  if (t === 'book' && slug === 'remaining-human') return true;
  if (tags.includes('accidental-ceo') && (t === 'chapter' || t === 'preface')) return true;
  return false;
}

function stripMarkdownNoiseForQuotes(text) {
  let raw = String(text || '');
  raw = raw.replace(/\r\n/g, '\n');
  const lines = raw.split('\n');
  const kept = [];
  for (const line of lines) {
    const L = line.trim();
    if (/^#{1,6}\s+/.test(L)) continue;
    if (/^!\[/.test(L)) continue;
    if (/^([-*•]|\d+\.)\s+/.test(L) && L.length < 120) continue;
    if (/^#{3,}\s*[^#]+/.test(L)) continue;
    kept.push(line);
  }
  return kept.join('\n').replace(/\n{3,}/g, '\n\n');
}

/** Remove leading markdown image from a sentence so pull quotes are readable lines. */
function stripLeadingMarkdownImage(s) {
  let t = String(s || '').trim();
  t = t.replace(/^!\[[^\]]*]\([^)]+\)\s*/g, '');
  return t.replace(/\s+/g, ' ').trim();
}

function isLowQualityPullQuoteLine(s) {
  let t = stripLeadingMarkdownImage(s);
  if (!t) return true;
  if (/!\[|]\([^)]+\)/.test(t)) return true;
  if (
    /^(an editorial|a brief|a reflection on|a conclusion to|drawing from|building on|this (post|article|piece) |post \d+ of\b|an applied [a-z]+ examination of|an examination of why)/i.test(
      t
    )
  ) {
    return true;
  }
  if (
    /\bthese writings explore\b|\bmarks the pivot from\b|\bshifting focus from\b|\bseries,\s+shifting\b|\bexamining how\b.*\bseries\b/i.test(
      t
    )
  ) {
    return true;
  }
  if (t.length < 26 || t.length > 360) return true;
  const words = t.split(/\s+/).filter(Boolean);
  const wc = words.length;
  if (wc < 9 || wc > 44) return true;
  if (/#{2,}/.test(t)) return true;
  if (/\*\*/.test(t)) return true;
  if (/^\s*[#>*•\-–—]/.test(t)) return true;
  if (/\t/.test(t)) return true;
  const everyMatches = t.match(/\bevery\b/gi) || [];
  if (everyMatches.length >= 3) return true;
  if (/\n\s*[-*•]/.test(t)) return true;
  if (/MASTER SPEC|DASHBOARD MASTER SPEC|You are building the ALI Dashboard/i.test(t)) return true;
  return false;
}

function quoteQualityMultiplier(s) {
  const t = String(s || '');
  const words = t.split(/\s+/).filter(Boolean);
  const wc = words.length;
  let m = 1;
  if (wc >= 12 && wc <= 30) m += 0.35;
  else if (wc >= 10 && wc <= 36) m += 0.2;
  if (/[—–]/.test(t)) m += 0.2;
  const everyN = (t.match(/\bevery\b/gi) || []).length;
  if (everyN >= 1) m -= 0.25 * everyN;
  if (/[:;].*[:;]/.test(t) && wc > 35) m -= 0.15;
  return Math.max(0.25, m);
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

  const publicDocs = docs.filter(isPullQuoteSourceDoc);
  if (!publicDocs.length) return { ok: true, quotes: [] };

  const prefer = preferTypes?.length ? preferTypes : ['journal-post', 'devotional', 'book', 'chapter', 'preface'];
  const { qTokens, top } = rankDocumentsByQuery(publicDocs, queryText, { topDocs, preferTypes: prefer });

  const candidates = [];
  const seen = new Set();

  for (const { d } of top) {
    const rawText =
      String(d.body || '').trim() || String(d.summary || '').trim();
    const fullText = stripMarkdownNoiseForQuotes(rawText);
    const sentences = extractSentences(fullText);
    const title = String(d.title || d.slug || 'Untitled').trim();
    const slug = d.slug ? String(d.slug).trim() : '';
    const url = toSourceUrl(slug, d.type, d);

    for (const sentence of sentences) {
      let cleaned = stripLeadingMarkdownImage(sentence);
      cleaned = cleaned.replace(/^["'\u201c\u201d]|["'\u201c\u201d]$/g, '').trim();
      if (isLowQualityPullQuoteLine(cleaned)) continue;

      const stSent = tokenize(cleaned);
      const overlap = scoreOverlap(qTokens, stSent);
      if (qTokens.length > 0 && overlap <= 0) continue;

      const qm = quoteQualityMultiplier(cleaned);
      const base = qTokens.length === 0 ? 0.35 : overlap * 2.2 + 0.08;
      const lineScore = base * qm + Math.min(cleaned.length, 220) / 550;

      const key = normalizeDedupeKey(cleaned);
      if (!key || seen.has(key)) continue;

      candidates.push({
        quote: cleaned,
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
    const url = toSourceUrl(slug, d.type, d);
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
