import { readFile } from 'fs/promises';
import { join } from 'path';
import { supabaseAdmin } from '../supabase-admin.js';
import { evaluateCandidate } from './evaluateCandidate.js';
import {
  normalizeQuoteText,
  hashNormalized,
  isExactDuplicate,
  storeQuoteHash,
} from './duplicateDetection.js';

const MAX_EVALUATED_DEFAULT = 200;
const MAX_INSERTED_DEFAULT = 60;

function extractCandidatesFromDoc(doc) {
  const body = [doc.body, doc.summary].filter(Boolean).join(' ');
  if (!body || body.length < 40) return [];
  const sentences = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 500);
  const slug = doc.slug || doc.id || doc.title || 'unknown';
  const sourceType = doc.type || 'knowledge';
  const title = doc.title || slug;
  return sentences.map((text) => ({
    text,
    source_doc_slug: slug,
    source_type: sourceType,
    source_title: title,
  }));
}

function toAoUrl(slug) {
  const s = String(slug || '').trim();
  if (!s) return null;
  return `https://www.archetypeoriginal.com/journal/${encodeURIComponent(s)}`;
}

/**
 * Run internal scan (capped for runtime safety).
 *
 * @param {{ maxEvaluated?: number, maxInserted?: number }} opts
 * @returns {Promise<{ ok: boolean, logId?: string, candidatesFound?: number, candidatesEvaluated?: number, candidatesInserted?: number, error?: string }>}
 */
export async function runInternalScan(opts = {}) {
  const maxEvaluated = Math.max(20, Math.min(1000, Number(opts.maxEvaluated || MAX_EVALUATED_DEFAULT)));
  const maxInserted = Math.max(10, Math.min(300, Number(opts.maxInserted || MAX_INSERTED_DEFAULT)));

  let logId = null;
  try {
    const { data: logRow, error: logErr } = await supabaseAdmin
      .from('ao_scan_log')
      .insert({
        scan_type: 'internal',
        started_at: new Date().toISOString(),
        candidates_found: 0,
        candidates_inserted: 0,
      })
      .select('id')
      .single();
    if (logErr) {
      return { ok: false, error: logErr.message };
    }
    logId = logRow?.id || null;

    const path = join(process.cwd(), 'public', 'knowledge.json');
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw);
    const docs = Array.isArray(data.docs) ? data.docs : [];

    // Build candidate list and cap it (runtime safety)
    const allCandidates = docs.flatMap(extractCandidatesFromDoc);

    await supabaseAdmin
      .from('ao_scan_log')
      .update({ candidates_found: allCandidates.length })
      .eq('id', logId);

    let inserted = 0;
    let evaluated = 0;
    for (const c of allCandidates) {
      if (evaluated >= maxEvaluated || inserted >= maxInserted) break;

      const normalized = normalizeQuoteText(c.text);
      const hashed = hashNormalized(normalized);
      if (await isExactDuplicate(hashed)) continue;

      const scored = await evaluateCandidate(c);
      evaluated += 1;

      let insertedRow = null;
      let insErr = null;

      try {
        const out = await supabaseAdmin
          .from('ao_quote_review_queue')
          .insert({
            quote_text: c.text,
            author: null,
            source_slug_or_url: c.source_doc_slug,
            source_type: c.source_type,
            is_internal: true,
            alignment_score: scored.alignment_score,
            clarity_score: scored.clarity_score,
            shareability_score: scored.shareability_score,
            brand_fit_score: scored.brand_fit_score,
            depth_score: scored.depth_score,
            composite_score: scored.composite_score,
            classification: scored.classification,
            caption_suggestions: scored.caption_suggestions,
            status: 'pending',

            // Intelligence-layer source context (if columns exist)
            source_url: toAoUrl(c.source_doc_slug),
            source_name: 'Archetype Original',
            source_title: c.source_title || null,
            source_author: null,
            source_published_at: null,
            source_excerpt: null,
            raw_content: null,
          })
          .select('id')
          .single();
        insertedRow = out.data || null;
        insErr = out.error || null;
      } catch (e2) {
        insErr = e2;
      }

      if (insErr) {
        const msg = String(insErr?.message || insErr || '');
        const looksLikeMissingColumn =
          msg.includes('source_url') ||
          msg.includes('source_name') ||
          msg.includes('source_title') ||
          msg.includes('source_excerpt') ||
          msg.includes('raw_content');
        if (looksLikeMissingColumn) {
          const out2 = await supabaseAdmin
            .from('ao_quote_review_queue')
            .insert({
              quote_text: c.text,
              author: null,
              source_slug_or_url: c.source_doc_slug,
              source_type: c.source_type,
              is_internal: true,
              alignment_score: scored.alignment_score,
              clarity_score: scored.clarity_score,
              shareability_score: scored.shareability_score,
              brand_fit_score: scored.brand_fit_score,
              depth_score: scored.depth_score,
              composite_score: scored.composite_score,
              classification: scored.classification,
              caption_suggestions: scored.caption_suggestions,
              status: 'pending',
            })
            .select('id')
            .single();
          insertedRow = out2.data || null;
          insErr = out2.error || null;
        }
      }

      if (!insErr && insertedRow) {
        await storeQuoteHash(hashed, insertedRow.id);
        inserted += 1;
      }
    }

    await supabaseAdmin
      .from('ao_scan_log')
      .update({
        finished_at: new Date().toISOString(),
        candidates_inserted: inserted,
        error_message: null,
      })
      .eq('id', logId);

    return {
      ok: true,
      logId,
      candidatesFound: allCandidates.length,
      candidatesEvaluated: evaluated,
      candidatesInserted: inserted,
    };
  } catch (e) {
    if (logId) {
      try {
        await supabaseAdmin
          .from('ao_scan_log')
          .update({ finished_at: new Date().toISOString(), error_message: e.message })
          .eq('id', logId);
      } catch (_) {}
    }
    return { ok: false, logId, error: e.message };
  }
}

