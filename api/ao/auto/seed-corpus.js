/**
 * POST /api/ao/auto/seed-corpus
 *
 * Seeds the ao_corpus_embeddings table with embeddings for all documents
 * in public/knowledge.json. Requires authenticated AO session.
 *
 * This is a one-time operation to populate the vector corpus.
 * After this runs, new documents embed automatically on publish.
 *
 * Returns:
 * { ok: true, processed, succeeded, failed, total, message }
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { loadKnowledgeDocs } from '../../../lib/ao/corpusPullQuotes.js';
import { seedCorpusFromKnowledgeJson } from '../../../lib/ao/corpusEmbeddings.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Check current count before seeding
  let existingCount = 0;
  try {
    const { count } = await supabaseAdmin
      .from('ao_corpus_embeddings')
      .select('*', { count: 'exact', head: true });
    existingCount = count || 0;
  } catch (_) {
    // Non-fatal
  }

  // Load all documents from knowledge.json
  let docs;
  try {
    docs = await loadKnowledgeDocs();
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: `Could not load knowledge.json: ${err?.message || err}`,
    });
  }

  if (!docs || docs.length === 0) {
    return res.status(500).json({
      ok: false,
      error: 'knowledge.json is empty or could not be read. Deploy the site first to rebuild the knowledge base.',
    });
  }

  console.log(`[seed-corpus] Starting seed: ${docs.length} documents. Existing embeddings: ${existingCount}`);

  // Run the seeding with rate limiting
  // With maxDuration 300s, a full corpus (~500 docs) can complete in one pass.
  // Each run skips already-embedded slugs so retries only process failures/new docs.
  let result;
  try {
    result = await seedCorpusFromKnowledgeJson(docs, {
      batchSize: 5,
      delayMs: 150,
      skipExisting: true,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: `Seeding failed: ${err?.message || err}`,
    });
  }

  // Get final count after seeding
  let finalCount = 0;
  try {
    const { count } = await supabaseAdmin
      .from('ao_corpus_embeddings')
      .select('*', { count: 'exact', head: true });
    finalCount = count || 0;
  } catch (_) {
    // Non-fatal
  }

  console.log(`[seed-corpus] Complete: ${result.succeeded}/${result.processed} succeeded. Skipped: ${result.skipped || 0}. Total in DB: ${finalCount}`);

  return res.status(200).json({
    ok: true,
    processed: result.processed,
    succeeded: result.succeeded,
    failed: result.failed,
    skipped: result.skipped || 0,
    total: docs.length,
    final_count: finalCount,
    message:
      result.failed === 0
        ? `All ${result.succeeded} documents embedded${result.skipped ? ` (${result.skipped} already present)` : ''}. Corpus is ready.`
        : `${result.succeeded} of ${result.processed} documents embedded. ${result.failed} failed — run again to retry.`,
  });
}
