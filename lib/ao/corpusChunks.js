/**
 * Chunked corpus retrieval for Archetype Original.
 *
 * One row per passage in ao_corpus_chunks, with the passage stored whole.
 * Search returns the part of a document that answers the question instead of
 * the document's opening.
 *
 * Replaces, for new callers, the document-level retrieval in
 * lib/ao/corpusEmbeddings.js — which caps returned text at 3000 chars per
 * document (BODY_PREVIEW_CHARS) and so cannot surface anything past the first
 * page of a long essay. That module stays in place; Auto still uses it.
 *
 * generateEmbedding is imported rather than reimplemented on purpose: this
 * codebase has been bitten by having several copies of one operation.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { generateEmbedding } from './corpusEmbeddings.js';
import { chunkText, CHUNK_DEFAULTS } from './chunkText.js';

const SIMILARITY_THRESHOLD = 0.3;
const MAX_RESULTS = 12;
const MAX_PER_DOC = 3;
const EMBED_CONCURRENCY = 8;

/** Prefix a passage with its document title so the embedding carries context. */
function embeddingTextFor(doc, chunkContent) {
  const title = String(doc.title || doc.slug || '').trim();
  return title ? `${title}\n\n${chunkContent}` : chunkContent;
}

function normalizeDoc(doc) {
  return {
    slug: String(doc?.slug || '').trim(),
    title: String(doc?.title || doc?.slug || '').trim(),
    summary: String(doc?.summary || '').trim(),
    body: String(doc?.body || '').trim(),
    docType: String(doc?.type || 'journal-post').toLowerCase(),
    categories: Array.isArray(doc?.categories)
      ? doc.categories.map(String)
      : Array.isArray(doc?.tags)
        ? doc.tags.map(String)
        : [],
  };
}

/**
 * Chunk one corpus document, embed every passage, and upsert them.
 *
 * Chunk rows left over from a previous, longer version of the document are
 * deleted so a shortened document cannot keep serving stale passages.
 *
 * @returns {Promise<{ ok: boolean, slug: string, chunks: number, failed: number }>}
 */
export async function embedAndStoreChunks(doc, options = {}) {
  const { slug, title, summary, body, docType, categories } = normalizeDoc(doc);
  if (!slug || !body) return { ok: false, slug, chunks: 0, failed: 0 };

  const chunks = chunkText(body, {
    maxChars: options.maxChars ?? CHUNK_DEFAULTS.maxChars,
    overlapChars: options.overlapChars ?? CHUNK_DEFAULTS.overlapChars,
  });
  if (chunks.length === 0) return { ok: false, slug, chunks: 0, failed: 0 };

  // Embed concurrently. This runs inline on the publish path, where
  // api/ao/auto/publish-journal.js has maxDuration 30 (vercel.json) — a long
  // essay is 20+ passages, and one-at-a-time would not finish in time.
  const concurrency = Math.max(1, Number(options.concurrency) || EMBED_CONCURRENCY);
  const rows = [];
  let failed = 0;

  const queue = [...chunks];
  async function embedWorker() {
    for (;;) {
      const chunk = queue.shift();
      if (!chunk) return;
      const embedding = await generateEmbedding(embeddingTextFor({ title }, chunk.content));
      if (!embedding) {
        failed++;
        continue;
      }
      rows.push({
        slug,
        chunk_index: chunk.index,
        title,
        doc_type: docType,
        categories,
        summary: summary.slice(0, 500),
        content: chunk.content,
        embedding,
        token_count: Math.ceil(chunk.content.length / 4),
        updated_at: new Date().toISOString(),
      });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, chunks.length) }, embedWorker));
  rows.sort((a, b) => a.chunk_index - b.chunk_index);

  if (rows.length === 0) return { ok: false, slug, chunks: 0, failed };

  try {
    const { error } = await supabaseAdmin
      .from('ao_corpus_chunks')
      .upsert(rows, { onConflict: 'slug,chunk_index', ignoreDuplicates: false });

    if (error) {
      console.error(`[corpusChunks] Upsert failed for ${slug}:`, error.message);
      return { ok: false, slug, chunks: 0, failed: failed + rows.length };
    }

    // Drop any trailing chunks from a previous, longer revision.
    const { error: pruneError } = await supabaseAdmin
      .from('ao_corpus_chunks')
      .delete()
      .eq('slug', slug)
      .gte('chunk_index', chunks.length);

    if (pruneError) {
      console.error(`[corpusChunks] Prune failed for ${slug}:`, pruneError.message);
    }

    return { ok: failed === 0, slug, chunks: rows.length, failed };
  } catch (err) {
    console.error(`[corpusChunks] embedAndStoreChunks error for ${slug}:`, err?.message || err);
    return { ok: false, slug, chunks: 0, failed: failed + rows.length };
  }
}

/**
 * Semantic search over corpus passages.
 *
 * @param {string} queryText
 * @param {{threshold?: number, maxResults?: number, maxPerDoc?: number}} [options]
 * @returns {Promise<Array<{slug, chunk_index, title, doc_type, categories, summary, content, similarity}>>}
 *          Empty array on any failure — callers fall back rather than break.
 */
export async function searchCorpusChunks(queryText, options = {}) {
  if (!queryText || !queryText.trim()) return [];

  const queryEmbedding = await generateEmbedding(queryText);
  if (!queryEmbedding) {
    console.warn('[corpusChunks] Could not embed query — returning empty');
    return [];
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('search_corpus_chunks', {
      query_embedding: queryEmbedding,
      similarity_threshold: options.threshold ?? SIMILARITY_THRESHOLD,
      max_results: options.maxResults ?? MAX_RESULTS,
      max_per_doc: options.maxPerDoc ?? MAX_PER_DOC,
    });

    if (error) {
      console.error('[corpusChunks] Search RPC failed:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[corpusChunks] searchCorpusChunks error:', err?.message || err);
    return [];
  }
}

/**
 * Group passage hits back into per-document results, preserving relevance
 * order and keeping passages in document order within each document.
 */
export function groupChunksByDocument(hits) {
  const byDoc = new Map();
  for (const hit of hits || []) {
    if (!byDoc.has(hit.slug)) {
      byDoc.set(hit.slug, {
        slug: hit.slug,
        title: hit.title,
        doc_type: hit.doc_type,
        categories: hit.categories,
        summary: hit.summary,
        similarity: hit.similarity,
        passages: [],
      });
    }
    const entry = byDoc.get(hit.slug);
    entry.passages.push({ chunk_index: hit.chunk_index, content: hit.content, similarity: hit.similarity });
    if (hit.similarity > entry.similarity) entry.similarity = hit.similarity;
  }

  const docs = [...byDoc.values()];
  for (const doc of docs) doc.passages.sort((a, b) => a.chunk_index - b.chunk_index);
  docs.sort((a, b) => b.similarity - a.similarity);
  return docs;
}

export const CORPUS_CHUNK_DEFAULTS = {
  similarityThreshold: SIMILARITY_THRESHOLD,
  maxResults: MAX_RESULTS,
  maxPerDoc: MAX_PER_DOC,
};
