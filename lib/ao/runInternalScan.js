import { readFile } from 'fs/promises';
import { join } from 'path';
import { supabaseAdmin } from '../supabase-admin.js';
import { evaluateCandidate } from './evaluateCandidate.js';
import { analystDecision } from './analystDecision.js';
import {
  normalizeQuoteText,
  hashNormalized,
  isExactDuplicate,
  storeQuoteHash,
} from './duplicateDetection.js';
import { isDiscarded } from './discardMemory.js';

const MAX_EVALUATED_DEFAULT = 100;
const MAX_INSERTED_DEFAULT = 14;

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function docKind(doc) {
  return String(doc?.type || '').trim().toLowerCase();
}

function docSlug(doc) {
  return safeText(doc?.slug || doc?.id || doc?.title || 'unknown', 240);
}

function isScannableDocType(kind) {
  // Keep this conservative: focus on writing/corpus that behaves like "Bart content",
  // and avoid utility pages that flood Analyst with thin fragments.
  return ['devotional', 'journal-post', 'chapter', 'preface', 'article'].includes(String(kind || '').toLowerCase());
}

function buildInternalReference(doc) {
  const kind = docKind(doc);
  const slug = docSlug(doc);
  const title = safeText(doc?.title || slug, 240);
  return safeText(`${kind}:${slug} — ${title}`, 500);
}

function toPublicAoUrl(doc) {
  const kind = docKind(doc);
  const slug = safeText(doc?.slug, 240);
  if (!slug) return null;

  // Public AO posts live under /journal/:slug (the renderer decides devotional vs journal post).
  if (kind === 'devotional' || kind === 'journal-post') {
    return `https://www.archetypeoriginal.com/journal/${encodeURIComponent(slug)}`;
  }

  // Other internal corpus types may not have a public page. Keep them high-trust via internal reference.
  return null;
}

function sentenceScore(s) {
  const text = String(s || '').trim();
  if (!text) return 0;
  const lower = text.toLowerCase();

  // Prefer lines that read like a leadership principle.
  const strong = ['leadership', 'leader', 'leaders', 'team', 'culture', 'accountability', 'trust', 'discipline', 'decision', 'execution', 'ownership'];
  let score = 0;
  for (const k of strong) {
    if (lower.includes(k)) score += 2;
  }

  // Prefer punchy but not tiny.
  const len = text.length;
  if (len >= 80 && len <= 220) score += 3;
  else if (len >= 60 && len <= 320) score += 1;
  else score -= 1;

  // Prefer sentences that sound assertive and quotable.
  if (/[“”"]/.test(text)) score += 1;
  if (text.includes(':')) score += 1;
  if (/^(leaders?|leadership)\b/i.test(text)) score += 1;

  return score;
}

function pickTopSentences(body, max = 6) {
  const sentences = String(body || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 500);

  const scored = sentences
    .map((t, idx) => ({ t, idx, score: sentenceScore(t) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const out = [];
  const seen = new Set();
  for (const x of scored) {
    const key = x.t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
    if (out.length >= max) break;
  }
  return out;
}

function extractCandidatesFromDoc(doc) {
  const kind = docKind(doc);
  if (!isScannableDocType(kind)) return [];

  const body = [doc.body, doc.summary].filter(Boolean).join('\n\n');
  if (!body || body.length < 120) return [];

  const picks = pickTopSentences(body, 6);
  const slug = docSlug(doc);
  const sourceType = kind || 'knowledge';
  const title = safeText(doc?.title || slug, 240);

  return picks.map((p) => {
    // Expanded context: include a larger excerpt so Analyst can do real interpretation.
    const start = Math.max(0, p.idx - 2);
    const end = p.idx + 3;
    const sentences = String(body || '')
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const ctx = sentences.slice(start, end).join(' ').slice(0, 4000);
    return {
      text: p.t,
      raw_context: ctx || p.t,
      source_doc_slug: slug,
      source_type: sourceType,
      source_title: title,
      source_kind: kind,
      internal_reference: buildInternalReference(doc),
      public_url: toPublicAoUrl(doc),
    };
  });
}

/**
 * Run internal scan (capped for runtime safety).
 *
 * @param {{ maxEvaluated?: number, maxInserted?: number }} opts
 * @returns {Promise<{ ok: boolean, logId?: string, candidatesFound?: number, candidatesEvaluated?: number, candidatesInserted?: number, error?: string }>}
 */
export async function runInternalScan(opts = {}) {
  const ownerEmail = String(process.env.AO_OWNER_EMAIL || '').toLowerCase().trim() || null;
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
    let enriched = 0;
    for (const c of allCandidates) {
      if (evaluated >= maxEvaluated || inserted >= maxInserted) break;

      if (ownerEmail) {
        const discardHit = await isDiscarded({
          email: ownerEmail,
          canonicalUrl: c.public_url || null,
          canonicalSlug: c.source_doc_slug || c.internal_reference || null,
        });
        if (discardHit) continue;
      }

      const normalized = normalizeQuoteText(c.text);
      const hashed = hashNormalized(normalized);
      if (await isExactDuplicate(hashed)) continue;

      const scored = await evaluateCandidate(c);
      evaluated += 1;
      if (scored && scored.is_leadership_related === false) continue;

      let insertedRow = null;
      let insErr = null;

      try {
        const out = await supabaseAdmin
          .from('ao_quote_review_queue')
          .insert({
            ...(ownerEmail ? { created_by_email: ownerEmail } : {}),
            quote_text: c.text,
            author: null,
            source_slug_or_url: c.public_url || c.source_doc_slug || c.internal_reference,
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
            source_url: c.public_url || null,
            source_name: 'Archetype Original (Internal)',
            source_title: c.source_title || null,
            source_author: null,
            source_published_at: null,
            source_excerpt: safeText(c.text, 900) || null,
            raw_content: safeText(c.raw_context, 6000) || null,
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
              ...(ownerEmail ? { created_by_email: ownerEmail } : {}),
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

        // Enrich: generate the Analyst brief so items are decision-ready.
        // Keep this bounded for runtime safety.
        if (enriched < maxInserted) {
          enriched += 1;
          try {
            const rowForDecision = {
              is_internal: true,
              quote_text: c.text,
              source_slug_or_url: c.public_url || c.source_doc_slug || c.internal_reference,
              source_url: c.public_url || null,
              source_name: 'Archetype Original (Internal)',
              source_title: c.source_title || null,
              source_excerpt: safeText(c.text, 900) || null,
              raw_content: safeText(c.raw_context, 6000) || null,
            };
            const brief = await analystDecision(rowForDecision);
            if (brief?.ok) {
              const patch = {};
              if (brief.best_move) patch.best_move = brief.best_move;
              if (brief.objectives_by_channel) patch.objectives_by_channel = brief.objectives_by_channel;
              if (typeof brief.why_it_matters === 'string' && brief.why_it_matters.trim()) patch.why_it_matters = brief.why_it_matters.trim();
              if (typeof brief.pull_quote === 'string' && brief.pull_quote.trim()) patch.pull_quote = brief.pull_quote.trim();
              if (Array.isArray(brief.risk_flags)) patch.risk_flags = brief.risk_flags;
              if (typeof brief.summary_interpretation === 'string' && brief.summary_interpretation.trim()) patch.summary_interpretation = brief.summary_interpretation.trim();
              if (Array.isArray(brief.alt_moves) && brief.alt_moves.length) patch.alt_moves = brief.alt_moves;
              if (typeof brief.auto_discarded === 'boolean') patch.auto_discarded = brief.auto_discarded;
              if (brief.discard_reason) patch.discard_reason = brief.discard_reason;
              if (brief.content_kind) patch.content_kind = brief.content_kind;
              if (brief.ao_lane) patch.ao_lane = brief.ao_lane;
              if (Array.isArray(brief.topic_tags)) patch.topic_tags = brief.topic_tags;
              await supabaseAdmin.from('ao_quote_review_queue').update(patch).eq('id', insertedRow.id);
            }
          } catch (_) {}
        }
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

