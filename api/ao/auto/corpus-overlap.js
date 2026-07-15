/**
 * POST /api/ao/auto/corpus-overlap
 *
 * Takes a proposed title, summary, or body text and returns corpus documents
 * that cover similar ground, ranked by semantic similarity.
 *
 * Auto calls this during content generation to flag overlap before writing.
 * The Library page uses it to show similarity neighbors for any document.
 *
 * Request body:
 * {
 *   query: string,        // proposed title, summary, or excerpt
 *   threshold: number,    // optional, default 0.5 (higher = more strict)
 *   max_results: number,  // optional, default 10
 *   exclude_slug: string  // optional, exclude a specific doc from results
 * }
 *
 * Response:
 * {
 *   ok: true,
 *   results: [{ slug, title, doc_type, categories, similarity, summary }],
 *   query: string
 * }
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { searchCorpus } from '../../../lib/ao/corpusEmbeddings.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { query, threshold = 0.5, max_results = 10, exclude_slug = '' } = req.body || {};

  if (!String(query || '').trim()) {
    return res.status(400).json({ ok: false, error: 'query required' });
  }

  try {
    const results = await searchCorpus(String(query).trim(), {
      threshold: Math.min(Math.max(Number(threshold) || 0.5, 0.1), 0.99),
      maxResults: Math.min(Math.max(Number(max_results) || 10, 1), 20),
    });

    const filtered = exclude_slug
      ? results.filter((r) => r.slug !== String(exclude_slug).trim())
      : results;

    return res.status(200).json({
      ok: true,
      results: filtered.map((r) => ({
        slug: r.slug,
        title: r.title,
        doc_type: r.doc_type,
        categories: r.categories || [],
        similarity: r.similarity,
        summary: String(r.summary || '').slice(0, 200),
      })),
      query: String(query).trim(),
    });
  } catch (err) {
    console.error('[corpus-overlap]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
