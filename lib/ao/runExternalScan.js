import { supabaseAdmin } from '../supabase-admin.js';
import { evaluateCandidate } from './evaluateCandidate.js';
import { analystDecision } from './analystDecision.js';
import { isDiscarded } from './discardMemory.js';
import {
  normalizeQuoteText,
  hashNormalized,
  isExactDuplicate,
  storeQuoteHash,
} from './duplicateDetection.js';
import { XMLParser } from 'fast-xml-parser';

const FETCH_TIMEOUT_MS = 12_000;
const LISTING_LINKS_CAP = 10;

function leadershipRelevanceScore(input) {
  const s = String(input || '').toLowerCase();
  if (!s) return 0;

  // Strong signals (worth extra points)
  const strong = [
    'leadership',
    'leader',
    'management',
    'manager',
    'servant leadership',
    'executive',
    'workplace',
    'organization',
    'organisational',
  ];
  let score = 0;
  for (const k of strong) {
    if (s.includes(k)) score += 2;
  }

  // Supporting signals
  const support = [
    'culture',
    'team',
    'accountability',
    'trust',
    'discipline',
    'strategy',
    'execution',
    'decision',
    'responsibility',
    'ownership',
    'integrity',
    'authority',
    'power',
    'coaching',
    'conflict',
    'collaboration',
    'communication',
    'psychological safety',
    'hiring',
    'performance',
  ];
  for (const k of support) {
    if (s.includes(k)) score += 1;
  }

  return score;
}

function isLeadershipRelevant(candidate) {
  const combined = [
    candidate?.source_title,
    candidate?.source_excerpt,
    candidate?.raw_content,
    candidate?.text,
  ].filter(Boolean).join(' ');

  const lower = combined.toLowerCase();

  const strong = [
    'leadership',
    'leader',
    'management',
    'manager',
    'servant leadership',
    'executive',
    'workplace',
    'organization',
    'organisational',
  ];

  const support = [
    'culture',
    'team',
    'accountability',
    'trust',
    'discipline',
    'strategy',
    'execution',
    'decision',
    'responsibility',
    'ownership',
    'integrity',
    'authority',
    'power',
    'coaching',
    'conflict',
    'collaboration',
    'communication',
    'psychological safety',
    'hiring',
    'performance',
  ];

  const hasStrong = strong.some((k) => lower.includes(k));
  const supportHits = support.reduce((n, k) => (lower.includes(k) ? n + 1 : n), 0);

  // Strict gate: either explicitly leadership/management, or multiple strong leadership-adjacent signals.
  return hasStrong || supportHits >= 3;
}

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

function stripLayoutHtml(input) {
  const s = String(input || '');
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<form[\s\S]*?<\/form>/gi, ' ');
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

function entryAuthor(entry) {
  const a =
    entry?.author?.name?.['#text'] ??
    entry?.author?.name ??
    entry?.author?.['#text'] ??
    entry?.author ??
    entry?.['dc:creator'] ??
    '';
  const s = stripHtml(a);
  return s ? s.slice(0, 140) : null;
}

function entryPublishedAt(entry) {
  const raw = entry?.pubDate ?? entry?.published ?? entry?.updated ?? entry?.['dc:date'] ?? null;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function buildRawContent({ title, summary, body } = {}) {
  const combined = [title, summary, body].filter(Boolean).join('\n\n');
  return combined ? combined.slice(0, 10_000) : null;
}

function tryExtractHtmlTitle(html) {
  const m = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return '';
  return stripHtml(m[1] || '').slice(0, 200);
}

function tryExtractMeta(html, name) {
  const h = String(html || '');
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // og:... / property=
  const og = h.match(new RegExp(`<meta[^>]+property=["']${n}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'));
  if (og && og[1]) return stripHtml(og[1]).slice(0, 400);
  const meta = h.match(new RegExp(`<meta[^>]+name=["']${n}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'));
  if (meta && meta[1]) return stripHtml(meta[1]).slice(0, 400);
  return '';
}

function removeBoilerplateText(text) {
  const t = String(text || '');
  if (!t) return '';
  const lines = t
    .split(/\n+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const bad = [
    'skip to',
    'subscribe',
    'sign in',
    'register',
    'cookie',
    'privacy',
    'terms',
    'newsletter',
    'open search',
    'close search',
    'open side navigation',
    'toggle navigation',
    'menu',
    'accessibility',
    'accept all',
    'manage preferences',
  ];

  const kept = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    const isBad = bad.some((b) => lower.includes(b));
    if (isBad) continue;
    if (line.length < 40) continue;
    kept.push(line);
    if (kept.length >= 30) break;
  }
  return kept.join(' ');
}

function looksLikeJunk(text) {
  const s = String(text || '').toLowerCase();
  if (!s) return true;
  if (s.includes('skip to navigation') || s.includes('skip to main content')) return true;
  if (s.includes('subscribe') && s.includes('sign in') && s.includes('search')) return true;
  return false;
}

function pickExcerpt(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  const sentences = t.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  return sentences.slice(0, 2).join(' ').slice(0, 700);
}

function safeUrl(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) return '';
  try {
    const u = new URL(s);
    u.hash = '';
    return u.toString();
  } catch {
    return '';
  }
}

function extractListingLinks(html, baseUrl) {
  const base = safeUrl(baseUrl);
  if (!base) return [];
  const out = [];
  const seen = new Set();
  const h = String(html || '');

  const re = /<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(h))) {
    const rawHref = String(m[1] || '').trim();
    if (!rawHref) continue;
    if (rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) continue;
    let abs = '';
    try {
      abs = new URL(rawHref, base).toString();
    } catch {
      continue;
    }
    abs = safeUrl(abs);
    if (!abs) continue;
    if (abs === base) continue;

    // Heuristics: prefer likely article URLs; avoid obvious section/listing URLs.
    const u = new URL(abs);
    const path = u.pathname.toLowerCase();
    if (path === '/' || path.length < 2) continue;
    if (path.includes('/tag/') || path.includes('/tags/') || path.includes('/topic/') || path.includes('/topics/')) continue;
    if (path.includes('/category/') || path.includes('/categories/')) continue;
    if (path.includes('/author/') || path.includes('/authors/')) continue;
    if (path.includes('/about') || path.includes('/privacy') || path.includes('/terms')) continue;
    if (path.includes('/login') || path.includes('/signin') || path.includes('/subscribe') || path.includes('/account')) continue;

    const looksArticle =
      path.includes('/blogs/') ||
      path.includes('/blog/') ||
      path.includes('/article') ||
      path.includes('/articles/') ||
      path.includes('/posts/') ||
      /\/20\d{2}\//.test(path);
    if (!looksArticle) continue;

    const key = abs.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(abs);
    if (out.length >= LISTING_LINKS_CAP) break;
  }

  return out;
}

function looksLikeListingPage(html, url) {
  const links = extractListingLinks(html, url);
  if (links.length >= 5) return true;
  return false;
}

async function tryFetchAndExtractArticle(url) {
  const pageUrl = safeUrl(url);
  if (!pageUrl) return null;
  const fetched = await fetchText(pageUrl);
  if (!fetched.ok) return null;
  const html = fetched.text || '';

  const metaTitle = tryExtractMeta(html, 'og:title') || tryExtractMeta(html, 'twitter:title');
  const metaDesc =
    tryExtractMeta(html, 'og:description') ||
    tryExtractMeta(html, 'description') ||
    tryExtractMeta(html, 'twitter:description');
  const metaAuthor = tryExtractMeta(html, 'author') || null;
  const metaPublished =
    tryExtractMeta(html, 'article:published_time') ||
    tryExtractMeta(html, 'og:article:published_time') ||
    '';

  const title = (metaTitle || tryExtractHtmlTitle(html) || '').slice(0, 220);
  const articleMatch = String(html).match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainBlock = articleMatch?.[1] || '';
  const cleanedHtml = stripLayoutHtml(mainBlock || html);
  const stripped = stripHtml(cleanedHtml);
  const deBoiler = removeBoilerplateText(stripped);
  const excerpt = pickExcerpt(metaDesc || deBoiler || stripped);
  const raw_body = (deBoiler || stripped).slice(0, 10_000);
  const raw_content = buildRawContent({ title, summary: excerpt, body: raw_body });

  return {
    title: title || null,
    author: metaAuthor ? String(metaAuthor).slice(0, 140) : null,
    published_at: metaPublished ? new Date(metaPublished).toISOString() : null,
    excerpt: excerpt || null,
    raw_content: raw_content || null,
    html,
  };
}

/**
 * Run allowlist-only external scan.
 *
 * @param {{ sourcesLimit?: number, entriesPerSource?: number, candidatesCap?: number, insertedCap?: number, enrichAnalyst?: boolean, enrichLimit?: number, fetchFullText?: boolean }} opts
 * @returns {Promise<{ ok: boolean, logId?: string, candidatesFound?: number, candidatesEvaluated?: number, candidatesInserted?: number, message?: string, error?: string }>}
 */
export async function runExternalScan(opts = {}) {
  const ownerEmail = String(process.env.AO_OWNER_EMAIL || '').toLowerCase().trim() || null;
  const sourcesLimit = Math.max(1, Math.min(50, Number(opts.sourcesLimit || 25)));
  const entriesPerSource = Math.max(1, Math.min(20, Number(opts.entriesPerSource || 10)));
  const candidatesCap = Math.max(20, Math.min(400, Number(opts.candidatesCap || 120)));
  const insertedCap = Math.max(5, Math.min(100, Number(opts.insertedCap || 30)));
  const enrichAnalyst = !!opts.enrichAnalyst;
  const enrichLimit = Math.max(1, Math.min(25, Number(opts.enrichLimit || 6)));
  const fetchFullText = opts.fetchFullText !== false; // default true

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
            if (candidates.length >= candidatesCap) break;
            const link = String(entryLink(entry) || '').trim();
            const title = entryTitle(entry);
            const summary = entrySummary(entry);
            if (!link && !title) continue;

            candidates.push({
              // One candidate per article
              source_url: link || url,
              source_name: src.name || url,
              source_type: 'external_rss',
              source_title: title || src.name || url,
              source_author: entryAuthor(entry),
              source_published_at: entryPublishedAt(entry),
              source_excerpt: summary || null,
              raw_content: buildRawContent({ title, summary }),
              scout_watched_source_url: url,
              scout_discovered_from_url: url,
              scout_depth: 0,
              // Scoring input
              text: [title, summary].filter(Boolean).join('. ').slice(0, 2000),
              source_doc_slug: link || url,
            });
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
          if (candidates.length >= candidatesCap) break;
          const html = fetched.text || '';

          // If this is a topic/landing/list page, treat it as a seed and pull real article URLs from it.
          if (looksLikeListingPage(html, url)) {
            const listingLinks = extractListingLinks(html, url).slice(0, entriesPerSource);
            for (const link of listingLinks) {
              if (candidates.length >= candidatesCap) break;
              const extracted = await tryFetchAndExtractArticle(link);
              if (!extracted) continue;
              const title = (extracted.title || String(src.name || link)).slice(0, 220);
              const excerpt = extracted.excerpt || '';
              const raw_content = extracted.raw_content || '';
              if (looksLikeJunk([title, excerpt, raw_content].join(' '))) continue;
              if (excerpt.length < 120) continue;

              candidates.push({
                source_url: link,
                source_name: src.name || url,
                source_type: 'external_article',
                source_title: title || src.name || link,
                source_author: extracted.author,
                source_published_at: extracted.published_at,
                source_excerpt: excerpt || null,
                raw_content: raw_content || null,
                scout_watched_source_url: url,
                scout_discovered_from_url: url,
                scout_depth: 1,
                text: [title, excerpt].filter(Boolean).join('. ').slice(0, 2000),
                source_doc_slug: link,
              });
            }

            await supabaseAdmin
              .from('ao_external_sources')
              .update({ last_fetched_at: new Date().toISOString() })
              .eq('id', src.id);
            continue;
          }

          const metaTitle = tryExtractMeta(html, 'og:title') || tryExtractMeta(html, 'twitter:title');
          const metaDesc = tryExtractMeta(html, 'og:description') || tryExtractMeta(html, 'description') || tryExtractMeta(html, 'twitter:description');
          const metaAuthor = tryExtractMeta(html, 'author') || null;
          const metaPublished = tryExtractMeta(html, 'article:published_time') || tryExtractMeta(html, 'og:article:published_time') || '';

          const title = (metaTitle || tryExtractHtmlTitle(html) || String(src.name || url)).slice(0, 220);

          const articleMatch = String(html).match(/<article[^>]*>([\s\S]*?)<\/article>/i);
          const mainBlock = articleMatch?.[1] || '';
          const cleanedHtml = stripLayoutHtml(mainBlock || html);
          const stripped = stripHtml(cleanedHtml);
          const deBoiler = removeBoilerplateText(stripped);
          const excerpt = pickExcerpt(metaDesc || deBoiler || stripped);
          const raw_content = (deBoiler || stripped).slice(0, 10_000);

          if (looksLikeJunk([title, excerpt, raw_content].join(' '))) continue;
          if (excerpt.length < 120) continue;

          candidates.push({
            source_url: url,
            source_name: src.name || url,
            source_type: 'external_article',
            source_title: title || src.name || url,
            source_author: metaAuthor ? String(metaAuthor).slice(0, 140) : null,
            source_published_at: metaPublished ? new Date(metaPublished).toISOString() : null,
            source_excerpt: excerpt || null,
            raw_content: buildRawContent({ title, summary: excerpt, body: raw_content }),
            scout_watched_source_url: url,
            scout_discovered_from_url: url,
            scout_depth: 0,
            text: [title, excerpt].filter(Boolean).join('. ').slice(0, 2000),
            source_doc_slug: url,
          });
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
    let enrichedCount = 0;
    for (const c of candidates) {
      if (inserted >= insertedCap) break;
      if (!isLeadershipRelevant(c)) continue;

      // If you previously rejected/deleted this exact URL, skip it entirely.
      if (ownerEmail && c?.source_url) {
        if (await isDiscarded({ email: ownerEmail, canonicalUrl: c.source_url })) continue;
      }
      // Hard stop on exact URL duplicates (prevents spam repeats if a source feed is noisy).
      if (c?.source_url) {
        try {
          const out = await supabaseAdmin
            .from('ao_quote_review_queue')
            .select('id', { head: true, count: 'exact' })
            .eq('source_url', c.source_url)
            .limit(1);
          if (!out.error && typeof out.count === 'number' && out.count > 0) {
            continue;
          }
        } catch (_) {}
      }

      // If we want Analyst to "actually read the post", attempt to pull the full article text before evaluation.
      // This converts "found via feed/landing page" into a real article-level extract when possible.
      if (fetchFullText && c?.source_url && String(c.source_url).startsWith('http')) {
        const rawLen = String(c.raw_content || '').length;
        if (rawLen < 2500) {
          const extracted = await tryFetchAndExtractArticle(c.source_url);
          if (extracted?.raw_content && String(extracted.raw_content).length > rawLen) {
            c.source_title = extracted.title || c.source_title;
            c.source_author = extracted.author || c.source_author;
            c.source_published_at = extracted.published_at || c.source_published_at;
            c.source_excerpt = extracted.excerpt || c.source_excerpt;
            c.raw_content = extracted.raw_content || c.raw_content;
            c.text = [c.source_title, c.source_excerpt].filter(Boolean).join('. ').slice(0, 2000);
          }
        }
      }

      const normalized = normalizeQuoteText(c.text);
      const hashed = hashNormalized(normalized);
      if (await isExactDuplicate(hashed)) continue;

      const evaluated = await evaluateCandidate(c);
      evaluatedCount += 1;
      if (evaluated && evaluated.is_leadership_related === false) continue;

      let insertedRow = null;
      let insErr = null;

      try {
        const out = await supabaseAdmin
          .from('ao_quote_review_queue')
          .insert({
            ...(ownerEmail ? { created_by_email: ownerEmail } : {}),
            quote_text: c.source_excerpt || c.source_title || c.text,
            author: null,
            source_slug_or_url: c.source_url || c.source_doc_slug,
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

            // Intelligence-layer source context (if columns exist)
            source_url: c.source_url || null,
            source_name: c.source_name || null,
            source_title: c.source_title || null,
            source_author: c.source_author || null,
            source_published_at: c.source_published_at || null,
            source_excerpt: c.source_excerpt || null,
            raw_content: c.raw_content || null,

            // Scout trail (if columns exist)
            scout_run_id: logId,
            scout_depth: c.scout_depth ?? null,
            scout_discovered_from_url: c.scout_discovered_from_url || null,
            scout_watched_source_url: c.scout_watched_source_url || null,
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
          msg.includes('source_excerpt') ||
          msg.includes('raw_content');
        if (looksLikeMissingColumn) {
          const out2 = await supabaseAdmin
            .from('ao_quote_review_queue')
            .insert({
              ...(ownerEmail ? { created_by_email: ownerEmail } : {}),
              quote_text: c.source_excerpt || c.source_title || c.text,
              author: null,
              source_slug_or_url: c.source_url || c.source_doc_slug,
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
          insertedRow = out2.data || null;
          insErr = out2.error || null;
        }
      }

      if (!insErr && insertedRow) {
        await storeQuoteHash(hashed, insertedRow.id);
        inserted += 1;

        // Optional: enrich with Analyst brief immediately (so the card is decision-ready right away).
        if (enrichAnalyst && enrichedCount < enrichLimit) {
          enrichedCount += 1;
          try {
            const rowForDecision = {
              is_internal: false,
              quote_text: c.source_excerpt || c.source_title || c.text,
              source_slug_or_url: c.source_url || c.source_doc_slug,
              source_url: c.source_url || null,
              source_name: c.source_name || null,
              source_title: c.source_title || null,
              source_author: c.source_author || null,
              source_published_at: c.source_published_at || null,
              source_excerpt: c.source_excerpt || null,
              raw_content: c.raw_content || null,
            };
            const brief = await analystDecision(rowForDecision);
            if (brief?.ok) {
              const patch = {
                best_move: brief.best_move || null,
                objectives_by_channel: brief.objectives_by_channel || null,
                why_it_matters: brief.why_it_matters || null,
                pull_quote: brief.pull_quote || null,
                risk_flags: Array.isArray(brief.risk_flags) ? brief.risk_flags : null,
                summary_interpretation: brief.summary_interpretation || null,
                alt_moves: brief.alt_moves || null,
                auto_discarded: !!brief.auto_discarded,
                discard_reason: brief.discard_reason || null,
                content_kind: brief.content_kind || null,
                ao_lane: brief.ao_lane || null,
                topic_tags: Array.isArray(brief.topic_tags) ? brief.topic_tags : null,
                studio_playbook: brief.studio_playbook || null,
              };
              if (brief.auto_discarded || brief.best_move === 'discard') {
                patch.status = 'rejected';
              }
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

