import { supabaseAdmin } from '../supabase-admin.js';
import { evaluateCandidate } from './evaluateCandidate.js';
import {
  normalizeQuoteText,
  hashNormalized,
  isExactDuplicate,
  storeQuoteHash,
} from './duplicateDetection.js';
import { XMLParser } from 'fast-xml-parser';

const FETCH_TIMEOUT_MS = 12_000;

function stripHtml(input) {
  const s = String(input || '');
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSentences(text) {
  const t = String(text || '').trim();
  if (!t) return [];
  return t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 60 && s.length <= 420);
}

async function fetchText(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'archetype-original/ao-external-scan' },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(t);
  }
}

function parseFeed(xmlText) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
  });
  const obj = parser.parse(xmlText);

  const rssItems = obj?.rss?.channel?.item;
  if (Array.isArray(rssItems)) return rssItems;
  if (rssItems && typeof rssItems === 'object') return [rssItems];

  const atomEntries = obj?.feed?.entry;
  if (Array.isArray(atomEntries)) return atomEntries;
  if (atomEntries && typeof atomEntries === 'object') return [atomEntries];

  return [];
}

function entryLink(entry) {
  if (!entry) return '';
  if (typeof entry.link === 'string') return entry.link;
  if (entry.link && typeof entry.link === 'object') {
    if (typeof entry.link['@_href'] === 'string') return entry.link['@_href'];
    if (typeof entry.link.href === 'string') return entry.link.href;
  }
  if (Array.isArray(entry.link)) {
    const first = entry.link.find((l) => typeof l?.['@_href'] === 'string') || entry.link[0];
    return (first && (first['@_href'] || first.href)) || '';
  }
  return '';
}

function entryTitle(entry) {
  return stripHtml(entry?.title?.['#text'] ?? entry?.title ?? '');
}

function entrySummary(entry) {
  return stripHtml(
    entry?.description ??
    entry?.summary?.['#text'] ??
    entry?.summary ??
    entry?.content?.['#text'] ??
    entry?.content ??
    ''
  );
}

/**
 * Run allowlist-only external scan.
 *
 * @param {{ sourcesLimit?: number, entriesPerSource?: number, candidatesCap?: number, insertedCap?: number }} opts
 * @returns {Promise<{ ok: boolean, logId?: string, candidatesFound?: number, candidatesEvaluated?: number, candidatesInserted?: number, message?: string, error?: string }>}
 */
export async function runExternalScan(opts = {}) {
  const sourcesLimit = Math.max(1, Math.min(50, Number(opts.sourcesLimit || 25)));
  const entriesPerSource = Math.max(1, Math.min(20, Number(opts.entriesPerSource || 10)));
  const candidatesCap = Math.max(20, Math.min(400, Number(opts.candidatesCap || 120)));
  const insertedCap = Math.max(5, Math.min(100, Number(opts.insertedCap || 30)));

  let logId = null;
  try {
    const { data: logRow, error: logErr } = await supabaseAdmin
      .from('ao_scan_log')
      .insert({
        scan_type: 'external',
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

    const { data: sources, error: sourcesErr } = await supabaseAdmin
      .from('ao_external_sources')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(sourcesLimit);
    if (sourcesErr) {
      await supabaseAdmin
        .from('ao_scan_log')
        .update({ finished_at: new Date().toISOString(), error_message: sourcesErr.message })
        .eq('id', logId);
      return { ok: false, logId, error: sourcesErr.message };
    }

    const allowlist = sources || [];
    if (allowlist.length === 0) {
      await supabaseAdmin
        .from('ao_scan_log')
        .update({ finished_at: new Date().toISOString(), error_message: 'No external sources configured' })
        .eq('id', logId);
      return { ok: true, logId, candidatesFound: 0, candidatesEvaluated: 0, candidatesInserted: 0, message: 'No external sources configured' };
    }

    const candidates = [];
    for (const src of allowlist) {
      if (candidates.length >= candidatesCap) break;
      const url = String(src.url || '').trim();
      if (!url) continue;
      const sourceType = String(src.source_type || 'rss').toLowerCase();

      if (sourceType === 'rss') {
        try {
          const fetched = await fetchText(url);
          if (!fetched.ok) continue;
          const entries = parseFeed(fetched.text).slice(0, entriesPerSource);
          for (const entry of entries) {
            const link = entryLink(entry);
            const title = entryTitle(entry);
            const summary = entrySummary(entry);
            const combined = [title, summary].filter(Boolean).join('. ');
            const sentences = extractSentences(combined);
            for (const s of sentences.slice(0, 6)) {
              if (candidates.length >= candidatesCap) break;
              candidates.push({
                text: s,
                source_doc_slug: link || url,
                source_type: 'external_rss',
                source_title: title || src.name || url,
              });
            }
          }

          await supabaseAdmin
            .from('ao_external_sources')
            .update({ last_fetched_at: new Date().toISOString() })
            .eq('id', src.id);
        } catch (_) {}
      } else {
        try {
          const fetched = await fetchText(url);
          if (!fetched.ok) continue;
          const text = stripHtml(fetched.text);
          const sentences = extractSentences(text).slice(0, 12);
          for (const s of sentences) {
            if (candidates.length >= candidatesCap) break;
            candidates.push({
              text: s,
              source_doc_slug: url,
              source_type: 'external_article',
              source_title: src.name || url,
            });
          }
          await supabaseAdmin
            .from('ao_external_sources')
            .update({ last_fetched_at: new Date().toISOString() })
            .eq('id', src.id);
        } catch (_) {}
      }
    }

    await supabaseAdmin
      .from('ao_scan_log')
      .update({ candidates_found: candidates.length })
      .eq('id', logId);

    let inserted = 0;
    let evaluatedCount = 0;
    for (const c of candidates) {
      if (inserted >= insertedCap) break;
      const normalized = normalizeQuoteText(c.text);
      const hashed = hashNormalized(normalized);
      if (await isExactDuplicate(hashed)) continue;

      const evaluated = await evaluateCandidate(c);
      evaluatedCount += 1;

      const { data: insertedRow, error: insErr } = await supabaseAdmin
        .from('ao_quote_review_queue')
        .insert({
          quote_text: c.text,
          author: null,
          source_slug_or_url: c.source_doc_slug,
          source_type: c.source_type,
          is_internal: false,
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
      candidatesFound: candidates.length,
      candidatesEvaluated: evaluatedCount,
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

