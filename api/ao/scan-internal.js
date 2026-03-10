/**
 * AO Automation — Internal corpus scan.
 * POST /api/ao/scan-internal?email=xxx
 * Reads public/knowledge.json, extracts quote candidates, evaluates, dedupes, inserts into ao_quote_review_queue.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { requireOwnerEmail } from '../../lib/ao/requireOwnerEmail.js';
import { evaluateCandidate } from '../../lib/ao/evaluateCandidate.js';
import {
  normalizeQuoteText,
  hashNormalized,
  isExactDuplicate,
  storeQuoteHash,
} from '../../lib/ao/duplicateDetection.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireOwnerEmail(req, res);
  if (!auth) return;

  let logId = null;
  try {
    const { data: logRow } = await supabaseAdmin
      .from('ao_scan_log')
      .insert({
        scan_type: 'internal',
        started_at: new Date().toISOString(),
        candidates_found: 0,
        candidates_inserted: 0,
      })
      .select('id')
      .single();
    logId = logRow?.id;

    const path = join(process.cwd(), 'public', 'knowledge.json');
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw);
    const docs = Array.isArray(data.docs) ? data.docs : [];

    function extractCandidates(doc) {
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

    const allCandidates = docs.flatMap(extractCandidates);
    await supabaseAdmin
      .from('ao_scan_log')
      .update({ candidates_found: allCandidates.length })
      .eq('id', logId);

    let inserted = 0;
    for (const c of allCandidates) {
      const normalized = normalizeQuoteText(c.text);
      const hashed = hashNormalized(normalized);
      if (await isExactDuplicate(hashed)) continue;

      const evaluated = await evaluateCandidate(c);
      const { data: insertedRow, error: insErr } = await supabaseAdmin
        .from('ao_quote_review_queue')
        .insert({
          quote_text: c.text,
          author: null,
          source_slug_or_url: c.source_doc_slug,
          source_type: c.source_type,
          is_internal: true,
          alignment_score: evaluated.alignment_score,
          clarity_score: evaluated.clarity_score,
          shareability_score: evaluated.shareability_score,
          brand_fit_score: evaluated.brand_fit_score,
          depth_score: evaluated.depth_score,
          composite_score: evaluated.composite_score,
          classification: evaluated.classification,
          caption_suggestions: evaluated.caption_suggestions,
          status: 'pending',
        })
        .select('id')
        .single();

      if (!insErr && insertedRow) {
        await storeQuoteHash(hashed, insertedRow.id);
        inserted++;
      }
    }

    await supabaseAdmin
      .from('ao_scan_log')
      .update({
        finished_at: new Date().toISOString(),
        candidates_inserted: inserted,
      })
      .eq('id', logId);

    return res.status(200).json({
      ok: true,
      candidates_found: allCandidates.length,
      candidates_inserted: inserted,
      log_id: logId,
    });
  } catch (e) {
    console.error('[ao/scan-internal]', e);
    if (logId) {
      await supabaseAdmin
        .from('ao_scan_log')
        .update({ finished_at: new Date().toISOString(), error_message: e.message })
        .eq('id', logId);
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
}
