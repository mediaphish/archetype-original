/**
 * Prior series-part research for present_outline (Phase 3/4 waypoint).
 * For part_number > 1, outlines must be calibrated against real prior part depth.
 */

import fs from 'fs';
import path from 'path';
import { canonicalizeSlug, contentDrafts } from '../db/contentDrafts.js';

export function countWords(text) {
  const t = String(text || '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return 0;
  return t.split(' ').filter(Boolean).length;
}

export function countSections(text) {
  const matches = String(text || '').match(/^#{1,3}\s+\S+/gm);
  return matches ? matches.length : 0;
}

/**
 * Load prior journal parts (1 .. partNumber-1) from drafts and/or corpus files.
 * @returns {Promise<{ ok: boolean, parts: Array<object>, error?: string, summary?: string }>}
 */
export async function loadPriorSeriesParts({
  email,
  seriesSlug,
  partNumber,
  minPartsRequired = null,
} = {}) {
  const series = canonicalizeSlug(seriesSlug);
  const part = parseInt(partNumber, 10) || 0;
  if (!series || part < 2) {
    return { ok: true, parts: [], summary: '' };
  }

  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  const needed = [];
  for (let p = 1; p < part; p += 1) needed.push(p);

  const parts = [];

  if (emailNorm) {
    const { data: draftRows } = await contentDrafts()
      .select('slug, title, part_number, content, status')
      .eq('created_by_email', emailNorm)
      .eq('kind', 'journal')
      .eq('series_slug', series)
      .in('part_number', needed)
      .neq('status', 'abandoned');

    for (const row of draftRows || []) {
      const content = String(row.content || '').trim();
      if (!content) continue;
      parts.push({
        part_number: Number(row.part_number) || 0,
        slug: row.slug,
        title: row.title || row.slug,
        word_count: countWords(content),
        section_count: countSections(content),
        source: 'draft',
      });
    }
  }

  // Fill gaps from published corpus / journal markdown.
  const have = new Set(parts.map((p) => p.part_number));
  for (const p of needed) {
    if (have.has(p)) continue;
    const loaded = await loadCorpusSeriesPart(series, p);
    if (loaded) {
      parts.push(loaded);
      have.add(p);
    }
  }

  parts.sort((a, b) => a.part_number - b.part_number);

  const requiredCount =
    minPartsRequired != null ? minPartsRequired : Math.min(needed.length, 1);
  // Require at least the immediately prior part (or all if fewer exist in needed).
  const immediatePrior = part - 1;
  const hasImmediate = parts.some((p) => p.part_number === immediatePrior);
  if (!hasImmediate && parts.length < requiredCount) {
    return {
      ok: false,
      parts,
      error:
        `Cannot lock an outline for ${series} part ${part} without reading prior parts first. ` +
        `Fetch the full text of part ${immediatePrior} (and earlier parts when available), then call present_outline again.`,
      missing_part: immediatePrior,
    };
  }
  if (!hasImmediate) {
    return {
      ok: false,
      parts,
      error:
        `Cannot lock an outline for ${series} part ${part} without the immediately prior part (${immediatePrior}). ` +
        `Fetch that part's full text, then call present_outline again.`,
      missing_part: immediatePrior,
    };
  }

  const summary = formatPriorPartsDepthSummary(series, part, parts);
  return { ok: true, parts, summary };
}

function formatPriorPartsDepthSummary(series, part, parts) {
  const lines = parts.map(
    (p) =>
      `- Part ${p.part_number} (${p.slug}): ~${p.word_count} words, ${p.section_count} section heading(s) [${p.source}]`
  );
  const avgWords =
    parts.length > 0
      ? Math.round(parts.reduce((s, p) => s + p.word_count, 0) / parts.length)
      : 0;
  return (
    `Prior series depth for ${series} (calibrating part ${part}):\n` +
    `${lines.join('\n')}\n` +
    `Average prior depth: ~${avgWords} words. This outline should target similar depth — not a thin stub.`
  );
}

async function loadCorpusSeriesPart(seriesSlug, partNumber) {
  try {
    const root = process.cwd();
    const knowledgePath = path.join(root, 'public/knowledge.json');
    if (fs.existsSync(knowledgePath)) {
      const docs = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
      const list = Array.isArray(docs) ? docs : docs?.documents || docs?.entries || [];
      const hit = list.find((d) => {
        const slug = String(d?.slug || '');
        if (!slug.includes(seriesSlug)) return false;
        const m = slug.match(/-part-(\d+)/i);
        return m && parseInt(m[1], 10) === partNumber;
      });
      if (hit?.body || hit?.content) {
        const content = String(hit.body || hit.content).trim();
        return {
          part_number: partNumber,
          slug: hit.slug,
          title: hit.title || hit.slug,
          word_count: countWords(content),
          section_count: countSections(content),
          source: 'corpus',
        };
      }
    }

    const journalDir = path.join(root, 'ao-knowledge-hq-kit/journal');
    if (!fs.existsSync(journalDir)) return null;
    const files = fs.readdirSync(journalDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const slug = file.replace(/\.md$/i, '');
      if (!slug.includes(seriesSlug)) continue;
      const m = slug.match(/-part-(\d+)/i);
      if (!m || parseInt(m[1], 10) !== partNumber) continue;
      const raw = fs.readFileSync(path.join(journalDir, file), 'utf8');
      const fmEnd = raw.indexOf('\n---', 3);
      const body = fmEnd >= 0 ? raw.slice(fmEnd + 4).trim() : raw.trim();
      const title = ((raw.match(/^title:\s*(.+)$/m) || [])[1] || slug)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      return {
        part_number: partNumber,
        slug,
        title,
        word_count: countWords(body),
        section_count: countSections(body),
        source: 'journal_file',
      };
    }
  } catch (err) {
    console.warn('[priorSeriesParts] corpus load failed:', err?.message || err);
  }
  return null;
}

/**
 * Pure gate used by present_outline + tests.
 * @returns {{ allowed: boolean, error?: string }}
 */
export function evaluatePriorPartsOutlineGate({ partNumber, priorPartsResult }) {
  const part = parseInt(partNumber, 10) || 0;
  if (part < 2) return { allowed: true };
  if (!priorPartsResult) {
    return {
      allowed: false,
      error: 'Prior series parts must be loaded before locking this outline.',
    };
  }
  if (!priorPartsResult.ok) {
    return { allowed: false, error: priorPartsResult.error || 'Prior parts unavailable' };
  }
  return { allowed: true };
}
