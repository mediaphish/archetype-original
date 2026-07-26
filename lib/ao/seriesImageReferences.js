/**
 * seriesImageReferences.js
 *
 * Gives Auto real visual memory of prior header images in a series — not just
 * a text description, but the actual image bytes, attached as vision input.
 *
 * Root problem this fixes: the text-based "VISUAL SERIES CONTEXT" system
 * (loadImageSeriesContext in autoV2.js) only ever works for series that share
 * an explicit series_slug/part_number convention (e.g. power-vs-authority-part-1,
 * part-2, part-3). "The Archetype Series" (Judas, Saul, Joseph, Nehemiah) was
 * never built that way — each entry has its own independent slug, unified only
 * by a shared category tag ("The Archetype Series"). No slug-matching scheme
 * can retroactively connect them. This module sidesteps that entirely: it
 * detects series membership by real, already-populated corpus category data,
 * then reads the actual published header images off disk and hands them to
 * the model as real vision input. No historical style data has to have been
 * saved anywhere for this to work — it reads the real files that already exist.
 */

import fs from 'fs';
import path from 'path';

const MAX_REFERENCE_IMAGES = 2;
const MAX_IMAGE_WIDTH = 1024;
const JPEG_QUALITY = 78;

let cachedKnowledgeDocs = null;

function loadKnowledgeDocs() {
  if (cachedKnowledgeDocs) return cachedKnowledgeDocs;
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'public/knowledge.json'), 'utf8');
    const parsed = JSON.parse(raw);
    cachedKnowledgeDocs = Array.isArray(parsed) ? parsed : parsed?.docs || [];
  } catch (err) {
    console.error('[seriesImageReferences] Failed to load knowledge.json:', err?.message || err);
    cachedKnowledgeDocs = [];
  }
  return cachedKnowledgeDocs;
}

/**
 * Groups published corpus docs by any category value that looks like a
 * named series (contains "series", case-insensitive). Returns a map of
 * lowercase category label -> array of docs, sorted by publish_date ascending.
 */
function buildSeriesGroups() {
  const docs = loadKnowledgeDocs();
  const groups = {};

  for (const doc of docs) {
    const categories = Array.isArray(doc.categories) ? doc.categories : [];
    for (const cat of categories) {
      if (typeof cat !== 'string' || !/series/i.test(cat)) continue;
      const key = cat.trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    }
  }

  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => String(a.publish_date || '').localeCompare(String(b.publish_date || '')));
  }

  return groups;
}

/**
 * Detects whether the current conversation is about a known series, by
 * checking the current message and recent messages against real category
 * labels and real member titles/slugs pulled from the corpus — never a
 * generic word-guessing regex.
 *
 * Returns { key, label, members } or null.
 */
export function detectSeriesMatch(userMessageText, recentUserMessages = []) {
  const texts = [userMessageText, ...recentUserMessages]
    .map((t) => String(t || '').toLowerCase().trim())
    .filter(Boolean);
  if (!texts.length) return null;

  const groups = buildSeriesGroups();
  const groupKeys = Object.keys(groups);
  if (!groupKeys.length) return null;

  for (const text of texts) {
    for (const key of groupKeys) {
      const label = key;
      const labelWords = label.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 3);
      const labelHit = labelWords.length > 0 && labelWords.every((w) => text.includes(w));

      const members = groups[key];
      const memberHit = members.some((m) => {
        const title = String(m.title || '').toLowerCase().trim();
        const slug = String(m.slug || '').toLowerCase().trim();
        if (title && text.includes(title)) return true;
        if (slug && text.includes(slug.replace(/-/g, ' '))) return true;
        return false;
      });

      if (labelHit || memberHit) {
        return { key, label, members };
      }
    }
  }

  return null;
}

function resolveImagePath(doc) {
  const raw = String(doc.image || doc.featured_image || '').trim();
  const slug = String(doc.slug || '').trim();
  const candidates = [];
  if (raw) {
    const base = path.basename(raw);
    candidates.push(path.join(process.cwd(), 'public/images', base));
  }
  if (slug) {
    candidates.push(path.join(process.cwd(), 'public/images', `${slug}.jpg`));
    candidates.push(path.join(process.cwd(), 'public/images', `${slug}.png`));
  }
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Reads and downsizes an image file for use as vision input. Keeps token
 * cost bounded — full-resolution source JPEGs here run 2-3MB each, which is
 * unnecessary and expensive for style reference. Resizes to a max width and
 * moderate JPEG quality. Falls back to the raw file if sharp is unavailable
 * or resizing fails, rather than skipping the reference entirely.
 */
async function readAndDownsizeImage(filePath) {
  try {
    const sharp = (await import('sharp')).default;
    const buffer = await sharp(filePath)
      .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return { data: buffer.toString('base64'), mediaType: 'image/jpeg' };
  } catch (err) {
    console.error('[seriesImageReferences] Resize failed, falling back to raw file:', err?.message || err);
    try {
      const stat = fs.statSync(filePath);
      // Hard safety cap: without resizing, an unbounded raw file could balloon token
      // cost unpredictably. 1.5MB raw (~2MB base64) is a reasonable worst-case ceiling;
      // above that, skip this reference entirely rather than risk an expensive request.
      const MAX_RAW_BYTES = 1_500_000;
      if (stat.size > MAX_RAW_BYTES) {
        console.error(`[seriesImageReferences] Raw file too large without resize (${stat.size} bytes) — skipping reference for ${filePath}`);
        return null;
      }
      const raw = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg';
      return { data: raw.toString('base64'), mediaType };
    } catch (readErr) {
      console.error('[seriesImageReferences] Raw read also failed:', readErr?.message || readErr);
      return null;
    }
  }
}

/**
 * Main entry point. When the conversation is about a known series, resolves
 * the most recent published members' real header images, downsizes them,
 * and returns them as Anthropic-API-ready image content blocks plus a short
 * text note — or null if no series match or no images could be resolved.
 *
 * Never throws — any failure returns null so a missing/broken image reference
 * never blocks the chat response.
 */
export async function loadSeriesImageReferenceBlocks(userMessageText, recentUserMessages = []) {
  try {
    const match = detectSeriesMatch(userMessageText, recentUserMessages);
    if (!match) return null;

    const recentMembers = match.members.slice(-MAX_REFERENCE_IMAGES);
    const blocks = [];
    const resolvedTitles = [];

    for (const doc of recentMembers) {
      const imagePath = resolveImagePath(doc);
      if (!imagePath) continue;
      const encoded = await readAndDownsizeImage(imagePath);
      if (!encoded) continue;
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: encoded.mediaType, data: encoded.data },
      });
      resolvedTitles.push(doc.title || doc.slug);
    }

    if (!blocks.length) return null;

    const noteBlock = {
      type: 'text',
      text: `## REAL PRIOR HEADER IMAGES — ${match.label}\n\nThe image(s) above are the actual published header images for prior entries in this series (${resolvedTitles.join(', ')}), attached directly — not a text description. Look at them before writing or discussing the next header image prompt. Match the real rendering style, palette, and composition approach you can see, rather than guessing from memory or asking to be shown one.`,
    };

    return [...blocks, noteBlock];
  } catch (err) {
    console.error('[seriesImageReferences] loadSeriesImageReferenceBlocks failed:', err?.message || err);
    return null;
  }
}
