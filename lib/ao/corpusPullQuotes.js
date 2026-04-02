import { readFile } from 'fs/promises';
import { join } from 'path';
import { getOpenAiKey } from '../openaiKey.js';
import { parseLooseJson } from './parseLooseJson.js';

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

/**
 * Full manuscripts stored as one book (RemAIning Human) or many chapter docs (Accidental CEO).
 * These are always merged into retrieval so top-N ranking cannot hide entire books behind journal matches.
 */
export function isBookManuscriptDoc(d) {
  if (!d) return false;
  const t = String(d.type || '').toLowerCase();
  const slug = String(d.slug || '').trim();
  const tags = Array.isArray(d.tags) ? d.tags.map((x) => String(x).toLowerCase()) : [];
  if (t === 'book' && slug === 'remaining-human') return true;
  if (tags.includes('accidental-ceo') && (t === 'chapter' || t === 'preface')) return true;
  return false;
}

function docKeyForDedupe(d) {
  return String(d.slug || d.id || d.title || '').trim();
}

/** Put every manuscript doc first, then ranked hits (by slug dedupe). */
function mergeManuscriptsWithRanked(manuscriptDocs, rankedTop) {
  const seen = new Set();
  const out = [];
  for (const d of manuscriptDocs) {
    const k = docKeyForDedupe(d);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({ d, rankedScore: null });
  }
  for (const row of rankedTop) {
    const k = docKeyForDedupe(row.d);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({ d: row.d, rankedScore: row.s });
  }
  return out;
}

function scoreDocMatchQuery(d, qTokens) {
  const body = [d.title, d.summary, d.body].filter(Boolean).join('\n\n');
  if (!body || body.length < 20) return 0;
  if (!qTokens.length) return 1;
  return scoreOverlap(qTokens, tokenize(body));
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

/**
 * True if the line probably needs the surrounding article to make sense (not valid as a solo graphic).
 * Examples: "And when that belief takes hold…" (what belief?), meta setup ("I used to say…").
 */
export function likelyDependsOnSurroundingContext(s) {
  const t = stripLeadingMarkdownImage(String(s || '').trim());
  if (!t) return true;
  if (/^and when (that|this)\b/i.test(t)) return true;
  if (/^when that (belief|shift|idea|dynamic|pattern|story|happens)\b/i.test(t)) return true;
  if (/^if you (haven'?t|have not) (read|seen)\b/i.test(t)) return true;
  if (/^i used to\b/i.test(t)) return true;
  if (/^i remember (when|that)\b/i.test(t)) return true;
  if (/throw around the phrase|without really knowing what it meant|beyond the logic you can pull from the words/i.test(t)) {
    return true;
  }
  if (/^as (mentioned|discussed|noted) (above|earlier|before)\b/i.test(t)) return true;
  if (/^(in|from) (the )?(previous|last) (chapter|section|post|part)\b/i.test(t)) return true;
  if (/^this (chart|figure|table|example) (shows|illustrates)\b/i.test(t)) return true;
  if (/^the (former|latter) (argues|shows|means)\b/i.test(t)) return true;
  return false;
}

/** Extra weight for lines that tend to land with tension, stakes, or contrast (not merely pleasant). */
function impactHeuristicBonus(s) {
  const t = String(s || '');
  let b = 0;
  if (/[—–]/.test(t)) b += 0.14;
  if (/\b(you have to|you can't|you cannot|without .{8,80}(stall|break|matter|room|trust))\b/i.test(t)) b += 0.18;
  if (/^(and )?if you\b/i.test(t)) b += 0.1;
  if (/\b(even if|still|worse|or worse|paradox|breaks you|isn'?t in the room)\b/i.test(t)) b += 0.12;
  if (/\b(responsibility|accountability|culture|trust|drift|pressure)\b/i.test(t)) b += 0.06;
  return Math.min(0.45, b);
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
  const manuscriptDocs = publicDocs.filter(isBookManuscriptDoc);
  const otherPublic = publicDocs.filter((d) => !isBookManuscriptDoc(d));
  const { qTokens, top } = rankDocumentsByQuery(otherPublic, queryText, { topDocs, preferTypes: prefer });
  const mergedDocs = mergeManuscriptsWithRanked(manuscriptDocs, top);

  const candidates = [];
  const seen = new Set();

  for (const { d } of mergedDocs) {
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

      if (likelyDependsOnSurroundingContext(cleaned)) continue;

      const qm = quoteQualityMultiplier(cleaned);
      const base = qTokens.length === 0 ? 0.35 : overlap * 2.2 + 0.08;
      const lineScore = base * qm + Math.min(cleaned.length, 220) / 550 + impactHeuristicBonus(cleaned);

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

  const pool = candidates.slice(0, Math.max(limit * 8, 24)).map((c) => ({
    quote: c.quote,
    source_title: c.source_title,
    slug: c.slug,
    type: c.type,
    url: c.url,
    context: '',
  }));

  const refined = await refinePullQuotesWithLlm(pool, { queryText, limit });
  const quotes = refined.map((row) => ({
    quote: row.quote,
    source_title: row.source_title,
    slug: row.slug,
    url: row.url,
    context: row.context || '',
  }));

  return { ok: true, quotes };
}

/**
 * Re-rank sentence candidates with an LLM: stand-alone thought, memorability / impact, not generic.
 * Falls back to input order if the API is unavailable or parsing fails.
 */
export async function refinePullQuotesWithLlm(candidates, { queryText = '', limit = 5 } = {}) {
  const apiKey = getOpenAiKey();
  const cap = Math.min(22, Math.max(limit * 4, 12));
  const pool = (Array.isArray(candidates) ? candidates : []).slice(0, cap);
  if (!apiKey || pool.length <= limit) {
    return pool.slice(0, limit);
  }

  const numbered = pool.map((c, idx) => ({
    n: idx + 1,
    quote: String(c.quote || '').slice(0, 420),
    source: String(c.source_title || '').slice(0, 160),
  }));

  const prompt = `You pick lines for square "pull quote" graphics. The reader will NOT see the article—only this one line on an image.

Reject or rank LOW if any apply:
- The line depends on earlier sentences (unclear "that belief", "when that", "this shift", "it" with no clear referent inside the same line).
- Meta/setup ("I used to say…", "I didn't know what it meant…") instead of a sharp insight.
- True but forgettable: no tension, no contrast, no stake—just a polite observation.

Rank HIGH if:
- The line is a complete, self-contained leadership thought.
- It has impact: emotional weight, contrast, a named risk, a challenge, or a memorable tension.

User theme (may be empty): ${JSON.stringify(String(queryText || '').slice(0, 380))}

Candidates (JSON):
${JSON.stringify(numbered)}

Return ONLY JSON like {"indices":[3,1,7,2,5]}: up to ${limit} entries, the candidate numbers ("n") in priority order (best first). Use only numbers that exist in the list.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AO_CORPUS_PULLQUOTE_MODEL || process.env.AO_AUTO_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.25,
      }),
    });
    if (!res.ok) return pool.slice(0, limit);
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    const parsed = parseLooseJson(content);
    const indices = Array.isArray(parsed?.indices) ? parsed.indices : [];
    const seen = new Set();
    const out = [];
    for (const raw of indices) {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 1 || n > pool.length || seen.has(n)) continue;
      seen.add(n);
      out.push(pool[n - 1]);
      if (out.length >= limit) break;
    }
    if (out.length) return out;
  } catch {
    // fall through
  }
  return pool.slice(0, limit);
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

  const manuscriptDocs = docs.filter(isBookManuscriptDoc);
  const otherDocs = docs.filter((d) => !isBookManuscriptDoc(d));
  const { qTokens, top } = rankDocumentsByQuery(otherDocs, queryText, { topDocs, preferTypes });
  const mergedDocs = mergeManuscriptsWithRanked(manuscriptDocs, top);

  const pool = [];
  for (const row of mergedDocs) {
    const d = row.d;
    const docScore = row.rankedScore != null ? row.rankedScore : scoreDocMatchQuery(d, qTokens);
    const fullText =
      String(d.body || '').trim() || String(d.summary || '').trim();
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
