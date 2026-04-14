/**
 * Rapid Write — corpus style context: lightweight fingerprint + short passages
 * from published AO content (knowledge.json). Statistical guide only; stories still adapt.
 */

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

/** Strip minimal markdown for measurement only. */
function stripMdLight(md) {
  let s = String(md || '');
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/!\[[^\]]*]\([^)]+\)/g, ' ');
  s = s.replace(/\[([^\]]+)]\([^)]+\)/g, '$1');
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function sentencesFromParagraph(p) {
  const t = String(p || '').trim();
  if (!t) return [];
  return t
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter((x) => x.split(/\s+/).filter(Boolean).length >= 5);
}

/** Content between HTML comment markers only — keeps setup instructions out of the model prompt. */
function extractGoldExemplarSection(raw) {
  const m = String(raw || '').match(/<!--\s*BEGIN_GOLD_EXEMPLARS\s*-->([\s\S]*?)<!--\s*END_GOLD_EXEMPLARS\s*-->/i);
  if (!m) return '';
  return m[1].trim();
}

/** Optional owner-curated paragraphs (highest priority for voice level). */
async function loadOptionalGoldExemplars() {
  try {
    const path = join(process.cwd(), 'notes', 'ao-rapid-write-gold-exemplars.md');
    const raw = await readFile(path, 'utf-8');
    const t = extractGoldExemplarSection(raw);
    if (t.length < 80) return '';
    return `**Owner-curated exemplars (highest priority for voice level; do not copy sentences):**\n\n${t.slice(0, 12000)}`;
  } catch {
    return '';
  }
}

/**
 * @param {{ queryText?: string, passageCharLimit?: number, fingerprintArticleMax?: number }} opts
 * @returns {Promise<{ fingerprintBlock: string, passageBlock: string, goldBlock: string }>}
 */
export async function buildRapidWriteStyleContext(opts = {}) {
  const queryText = String(opts.queryText || '');
  const passageCharLimit = typeof opts.passageCharLimit === 'number' ? opts.passageCharLimit : 520;
  const fingerprintArticleMax =
    typeof opts.fingerprintArticleMax === 'number' ? opts.fingerprintArticleMax : 22;

  let fingerprintBlock =
    'Published AO library context unavailable; default to narrative-first professional prose.';
  let passageBlock = '';
  const goldBlock = await loadOptionalGoldExemplars();

  try {
    const path = join(process.cwd(), 'public', 'knowledge.json');
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw);
    const docs = Array.isArray(data.docs) ? data.docs : [];

    const articles = docs.filter((d) => d?.type === 'article' && String(d.body || '').length > 400);
    const pool = articles.length >= 10 ? articles : docs.filter((d) => String(d.body || '').length > 350);

    const sample = pool.slice(0, Math.max(8, Math.min(fingerprintArticleMax, pool.length)));
    let totalSents = 0;
    let totalWords = 0;
    let paraCount = 0;
    let singleSentParas = 0;

    for (const d of sample) {
      const text = stripMdLight(String(d.body || ''));
      const paras = text.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 50);
      for (const p of paras) {
        paraCount += 1;
        const sents = sentencesFromParagraph(p);
        if (sents.length <= 1) singleSentParas += 1;
        for (const s of sents) {
          const wc = s.split(/\s+/).filter(Boolean).length;
          totalSents += 1;
          totalWords += wc;
        }
      }
    }

    const avgSentLen = totalSents ? Math.round(totalWords / totalSents) : 22;
    const singleSentRatio = paraCount ? Math.round((100 * singleSentParas) / paraCount) : 0;

    fingerprintBlock = `Published AO library fingerprint (sampled ${sample.length} pieces; **statistical guide only**—do not imitate mechanically; let this seed decide intensity, heat, and shape):
- Typical substantive sentence length in the sample: about **${avgSentLen}** words on average.
- Paragraphs in the sample usually carry **multiple sentences**; single-sentence paragraphs are a **minor** share (~${singleSentRatio}% in this rough sample). Prefer **narrative paragraphs** over social-style one-line stacking unless a rare beat needs a short line.
- **Adapt** formality and lyricism to what **this** story requires; there is no single universal style lane across all posts.`;

    const qTokens = tokenize(queryText);
    if (qTokens.length && pool.length) {
      const scored = [];
      for (const d of pool) {
        const body = [d.title, d.summary, d.body].filter(Boolean).join(' ');
        if (!body) continue;
        const dTokens = tokenize(body);
        const s = scoreOverlap(qTokens, dTokens);
        if (s <= 1) continue;
        scored.push({ d, s });
      }
      scored.sort((x, y) => y.s - x.s);
      const top = scored.slice(0, 4);
      const snippets = [];
      for (const { d } of top) {
        const plain = stripMdLight(String(d.body || ''));
        const chunk = plain.slice(0, passageCharLimit).trim();
        if (chunk.length > 120) {
          snippets.push(`— From **${d.title || d.slug || 'AO'}** (excerpt, do not copy phrasing):\n${chunk}${plain.length > passageCharLimit ? '…' : ''}`);
        }
      }
      if (snippets.length) {
        passageBlock = `Corpus voice references (match **level and seriousness**, not wording):\n\n${snippets.join('\n\n')}`;
      }
    }
  } catch {
    /* keep defaults */
  }

  return { fingerprintBlock, passageBlock, goldBlock };
}
