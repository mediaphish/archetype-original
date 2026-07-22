/**
 * Vercel cron: backfill published docs missing from ao_corpus_embeddings.
 * skipExisting=true — only embeds gaps (e.g. fire-and-forget publish failures).
 * Secured by CRON_SECRET if set.
 *
 * Optional force re-embed of one document:
 *   POST/GET ?slug=the-saul-archetype
 * Reads that slug from knowledge.json and upserts a fresh embedding row.
 */

import { loadKnowledgeDocs } from '../../../lib/ao/corpusPullQuotes.js';
import { seedCorpusFromKnowledgeJson, embedAndStoreDocument } from '../../../lib/ao/corpusEmbeddings.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || req.query?.secret || '';
    const provided = auth.replace(/^Bearer\s+/i, '') || (req.query?.secret ?? '');
    if (provided !== cronSecret) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }

  let docs;
  try {
    docs = await loadKnowledgeDocs();
  } catch (err) {
    return res.status(500).json({ ok: false, error: `Could not load knowledge.json: ${err?.message || err}` });
  }

  if (!docs?.length) {
    return res.status(500).json({ ok: false, error: 'knowledge.json empty' });
  }

  // Single-slug force re-embed (upsert) — used to repair rows that drifted or went missing.
  const forceSlug = String(
    req.query?.slug || (req.body && req.body.slug) || ''
  ).trim();
  if (forceSlug) {
    const doc = docs.find((d) => String(d.slug || '').trim() === forceSlug);
    if (!doc) {
      return res.status(404).json({
        ok: false,
        error: `No document with slug "${forceSlug}" in knowledge.json`,
      });
    }
    try {
      const ok = await embedAndStoreDocument({
        slug: doc.slug,
        title: doc.title,
        type: doc.type || 'journal-post',
        categories: doc.categories || doc.tags || [],
        summary: doc.summary || '',
        body: doc.body || '',
      });
      if (!ok) {
        return res.status(500).json({
          ok: false,
          error: `embedAndStoreDocument failed for ${forceSlug}`,
        });
      }
      const { data: row } = await supabaseAdmin
        .from('ao_corpus_embeddings')
        .select('slug, title, categories, doc_type, token_count, updated_at')
        .eq('slug', forceSlug)
        .maybeSingle();
      return res.status(200).json({
        ok: true,
        forced: true,
        slug: forceSlug,
        row: row || null,
        message: `Re-embedded ${forceSlug}`,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: err?.message || `Force embed failed for ${forceSlug}`,
      });
    }
  }

  let beforeCount = 0;
  try {
    const { count } = await supabaseAdmin
      .from('ao_corpus_embeddings')
      .select('*', { count: 'exact', head: true });
    beforeCount = count || 0;
  } catch (_) {
    /* non-fatal */
  }

  let result;
  try {
    result = await seedCorpusFromKnowledgeJson(docs, {
      batchSize: 5,
      delayMs: 150,
      skipExisting: true,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Backfill failed' });
  }

  let afterCount = beforeCount;
  try {
    const { count } = await supabaseAdmin
      .from('ao_corpus_embeddings')
      .select('*', { count: 'exact', head: true });
    afterCount = count || 0;
  } catch (_) {
    /* non-fatal */
  }

  console.log(
    `[backfill-corpus-embeddings] succeeded=${result.succeeded} failed=${result.failed} skipped=${result.skipped || 0} before=${beforeCount} after=${afterCount}`
  );

  return res.status(200).json({
    ok: true,
    ...result,
    before_count: beforeCount,
    after_count: afterCount,
    message:
      result.succeeded > 0
        ? `Backfilled ${result.succeeded} missing corpus embedding(s).`
        : `No missing embeddings to backfill (${result.skipped || 0} already present).`,
  });
}
