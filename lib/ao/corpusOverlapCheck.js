/**
 * Pre-publish overlap checks against public/knowledge.json (slug + title similarity).
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenSet(s) {
  return new Set(norm(s).split(/\s+/).filter((w) => w.length > 2));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  return inter / (a.size + b.size - inter);
}

/**
 * @param {{ slug: string, title: string, summary?: string }} incoming
 * @returns {Promise<{ ok: boolean, conflicts: Array<{ reason: string, slug?: string, title?: string }>, error?: string }>}
 */
export async function checkCorpusPublishOverlap(incoming) {
  const slug = String(incoming?.slug || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  const title = String(incoming?.title || '').trim();
  if (!slug || !title) {
    return { ok: false, conflicts: [{ reason: 'Title and slug are required.' }] };
  }

  let docs = [];
  try {
    const path = join(process.cwd(), 'public', 'knowledge.json');
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw);
    docs = Array.isArray(data.docs) ? data.docs : [];
  } catch (e) {
    return { ok: false, conflicts: [], error: 'Could not load published library index for overlap check.' };
  }

  const conflicts = [];
  const titleTokens = tokenSet(title);
  const summaryTokens = tokenSet(incoming?.summary || '');

  for (const d of docs) {
    const ds = String(d.slug || '').toLowerCase();
    if (ds === slug) {
      conflicts.push({ reason: 'Same slug as an existing piece.', slug: ds, title: d.title });
      continue;
    }
    if (jaccard(titleTokens, tokenSet(d.title)) >= 0.55) {
      conflicts.push({ reason: 'Very similar title to existing piece.', slug: ds, title: d.title });
    } else if (incoming?.summary && d.summary && jaccard(summaryTokens, tokenSet(d.summary)) >= 0.5) {
      conflicts.push({ reason: 'Summary overlaps strongly with an existing piece.', slug: ds, title: d.title });
    }
  }

  return { ok: conflicts.length === 0, conflicts };
}
