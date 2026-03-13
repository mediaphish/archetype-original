import { supabaseAdmin } from '../supabase-admin.js';
import { getOpenAiKey } from '../openaiKey.js';
import { parseLooseJson } from './parseLooseJson.js';
import { XMLParser } from 'fast-xml-parser';

const FETCH_TIMEOUT_MS = 5500;
const AI_TIMEOUT_MS = 4500;

const FRONTIER_BATCH = 10;
const MAX_OUT_LINKS_PER_PAGE = 10;
const MAX_TOTAL_FRONTIER_ADDS = 40;
const MAX_RAW_TEXT_LEN = 12000;

const DAILY_CAP = 5; // conservative cap into Analyst (rolling 24h)

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function safeUrl(raw, base) {
  try {
    if (!raw) return null;
    const u = base ? new URL(String(raw), String(base)) : new URL(String(raw));
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

function normDomain(u) {
  try {
    const host = new URL(u).hostname.toLowerCase();
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return '';
  }
}

function looksPaywalled({ status, text }) {
  if (status === 401 || status === 402 || status === 403) return true;
  const s = String(text || '').toLowerCase();
  if (!s) return false;
  const markers = [
    'subscribe to continue',
    'subscribe to read',
    'already a subscriber',
    'sign in to continue',
    'to continue reading',
    'this content is for subscribers',
    'unlock this article',
    'purchase a subscription',
    'metered paywall',
    'paywall',
  ];
  return markers.some((m) => s.includes(m));
}

async function fetchText(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'archetype-original/ao-scout' },
    });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    return { ok: false, status: 0, text: '', error: e?.message || String(e) };
  } finally {
    clearTimeout(t);
  }
}

function stripHtml(input) {
  const s = String(input || '');
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<form[\s\S]*?<\/form>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPrimaryHtml(html) {
  const h = String(html || '');
  if (!h) return '';
  const article = h.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (article?.[1]) return article[1];
  const main = h.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (main?.[1]) return main[1];
  return h;
}

function leadershipSignalStrength(text) {
  const s = String(text || '').toLowerCase();
  if (!s) return { hasStrong: false, supportHits: 0 };
  const strong = ['leadership', 'leader', 'management', 'manager', 'executive'];
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
    'coaching',
    'collaboration',
    'communication',
    'conflict',
    'performance',
  ];
  const hasStrong = strong.some((k) => s.includes(k));
  const supportHits = support.reduce((n, k) => (s.includes(k) ? n + 1 : n), 0);
  return { hasStrong, supportHits };
}

function metaContent(html, prop) {
  const h = String(html || '');
  const re = new RegExp(`<meta[^>]+(?:property|name)=[\"']${prop}[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>`, 'i');
  const m = h.match(re);
  return m?.[1] ? String(m[1]).trim() : '';
}

function extractLinks(html, baseUrl) {
  const h = String(html || '');
  const out = [];
  const re = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(h))) {
    const href = m[1] || '';
    const abs = safeUrl(href, baseUrl);
    if (!abs) continue;
    const lower = abs.toLowerCase();
    if (lower.startsWith('mailto:') || lower.startsWith('javascript:')) continue;
    if (lower.endsWith('.pdf') || lower.endsWith('.jpg') || lower.endsWith('.png') || lower.endsWith('.gif')) continue;
    out.push(abs);
    if (out.length >= 300) break;
  }
  // Keep unique, preserve order.
  const seen = new Set();
  const uniq = [];
  for (const u of out) {
    if (seen.has(u)) continue;
    seen.add(u);
    uniq.push(u);
  }
  return uniq;
}

function isLikelyArticleUrl(u) {
  const url = safeUrl(u);
  if (!url) return false;
  try {
    const p = new URL(url).pathname.toLowerCase();
    if (!p || p === '/' || p.length < 2) return false;
    // Common non-article routes (avoid)
    if (p.includes('/topic/') || p.includes('/topics/')) return false;
    if (p.includes('/tag/') || p.includes('/tags/')) return false;
    if (p.includes('/category/') || p.includes('/categories/')) return false;
    if (p.includes('/author/') || p.includes('/authors/')) return false;
    if (p.includes('/about') || p.includes('/privacy') || p.includes('/terms')) return false;
    if (p.includes('/login') || p.includes('/signin') || p.includes('/subscribe') || p.includes('/account')) return false;
    // Strong article signals
    if (
      p.includes('/blogs/') ||
      p.includes('/blog/') ||
      p.includes('/article') ||
      p.includes('/articles/') ||
      p.includes('/posts/') ||
      p.includes('/review/') ||
      p.includes('/insights/') ||
      /\/20\d{2}\//.test(p)
    ) return true;

    // Soft signal: looks like a slug (not a section root)
    const parts = p.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1] || '';
      const hasSlug = last.length >= 10 && (last.includes('-') || /[0-9]/.test(last));
      if (hasSlug) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function seenSourceUrlRecently(url) {
  const u = safeUrl(url);
  if (!u) return false;
  try {
    const out = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('id', { head: true, count: 'exact' })
      .eq('source_url', u)
      .limit(1);
    if (out.error) return false;
    return typeof out.count === 'number' && out.count > 0;
  } catch {
    return false;
  }
}

function pickArticleLinksFromPage(html, pageUrl) {
  const page = safeUrl(pageUrl);
  if (!page) return [];
  const pageDomain = normDomain(page);
  const links = extractLinks(html, page);
  const scored = [];
  for (const u of links) {
    if (!u) continue;
    if (normDomain(u) !== pageDomain) continue;
    if (!isLikelyArticleUrl(u)) continue;
    const p = new URL(u).pathname.toLowerCase();
    let score = 0;
    if (p.includes('/blogs/')) score += 4;
    if (p.includes('/articles/')) score += 3;
    if (p.includes('/blog/')) score += 2;
    if (/\/20\d{2}\//.test(p)) score += 1;
    scored.push({ u, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const out = [];
  const seen = new Set();
  for (const x of scored) {
    const k = x.u.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x.u);
    if (out.length >= 20) break;
  }
  return out;
}

function parseRssEntryLinks(xmlText) {
  const xml = String(xmlText || '');
  if (!xml.trim()) return [];
  try {
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
    const arr = Array.isArray(items) ? items : [items].filter(Boolean);
    const links = [];
    for (const it of arr) {
      const link = it?.link?.['@_href'] || it?.link || it?.guid || '';
      const u = safeUrl(link);
      if (u) links.push(u);
      if (links.length >= 25) break;
    }
    return links;
  } catch {
    return [];
  }
}

async function aiAssess({ url, title, excerpt, rawText }) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;

  const payload = {
    url: safeText(url, 800),
    title: safeText(title, 220),
    excerpt: safeText(excerpt, 900),
    raw_text: safeText(rawText, 6000),
  };

  const prompt = `You are AO Scout — a conservative reporter on the leadership beat.\n\nHard rules:\n- If this is paywalled, irrelevant, or too thin to trust, return relevant=false.\n- No politics. No rage bait. No dunking.\n- Prefer practical leadership signals: leadership, teams, culture, accountability, trust, execution, decision-making.\n\nInput JSON:\n${JSON.stringify(payload)}\n\nReturn ONLY JSON with exactly these keys:\n- relevant (boolean)\n- pull_quote (string, <= 25 words, or empty)\n- why_it_matters (string, 2-4 sentences)\n- summary_interpretation (string, 4-8 sentences)\n- risk_flags (string[])\n- content_kind (string: quote|research|framework|story|trend|other)\n- ao_lane (string)\n- topic_tags (string[])\n- recommended_next_stage (string: studio|publisher)\n`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AO_SCOUT_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.2,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    const parsed = parseLooseJson(content);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function getScoutDiscoveriesCountRolling24h() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('id', { count: 'exact', head: true })
      .not('scout_run_id', 'is', null)
      .gte('created_at', since);
    return typeof count === 'number' ? count : 0;
  } catch {
    return 0;
  }
}

async function upsertPendingDomain(domain, exampleUrl) {
  const d = String(domain || '').trim().toLowerCase();
  if (!d) return;
  try {
    await supabaseAdmin
      .from('ao_scout_pending_sources')
      .insert({ domain: d, example_url: exampleUrl || null, status: 'pending', first_seen_at: new Date().toISOString() });
  } catch (_) {
    // Ignore duplicates
  }
}

async function isWatchedDomain(domain) {
  const d = String(domain || '').trim().toLowerCase();
  if (!d) return false;
  try {
    const { data } = await supabaseAdmin
      .from('ao_external_sources')
      .select('id,url')
      .limit(200);
    const rows = Array.isArray(data) ? data : [];
    return rows.some((r) => normDomain(r?.url || '') === d);
  } catch {
    return false;
  }
}

async function seedFrontierIfEmpty(runId) {
  const { count } = await supabaseAdmin
    .from('ao_scout_frontier')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  const pending = typeof count === 'number' ? count : 0;
  if (pending > 0) return { seeded: 0 };

  const { data: sources } = await supabaseAdmin
    .from('ao_external_sources')
    .select('id,url,source_type,name')
    .order('created_at', { ascending: false })
    .limit(30);

  const rows = [];
  for (const s of Array.isArray(sources) ? sources : []) {
    const url = safeUrl(s?.url);
    if (!url) continue;
    if (String(s?.source_type || '').toLowerCase() === 'rss') {
      const fetched = await fetchText(url);
      const links = fetched.ok ? parseRssEntryLinks(fetched.text) : [];
      for (const l of links.slice(0, 6)) {
        rows.push({
          url: l,
          discovered_from_url: url,
          depth: 0,
          priority: 2,
          status: 'pending',
          reason: 'seed_from_rss',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      rows.push({
        url,
        discovered_from_url: null,
        depth: 0,
        priority: 1,
        status: 'pending',
        reason: 'seed_from_source',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    if (rows.length >= 60) break;
  }

  if (!rows.length) return { seeded: 0 };
  try {
    await supabaseAdmin.from('ao_scout_frontier').insert(rows);
  } catch (_) {}
  return { seeded: rows.length };
}

/**
 * Run one conservative Scout pass.
 */
export async function runScoutPass() {
  const runStart = new Date().toISOString();
  const runStartMs = Date.now();
  let runId = null;

  const runRow = await supabaseAdmin
    .from('ao_scout_runs')
    .insert({ started_at: runStart, pages_fetched: 0, leads_followed: 0, discoveries_created: 0 })
    .select('id')
    .single()
    .catch(() => ({ data: null }));
  runId = runRow?.data?.id || null;

  let pagesFetched = 0;
  let leadsFollowed = 0;
  let discoveriesCreated = 0;
  let frontierAdds = 0;

  try {
    await seedFrontierIfEmpty(runId);

    // Conservative cap (rolling 24h). Compute once and track locally for this run.
    let usedInWindow = await getScoutDiscoveriesCountRolling24h();

    const { data: frontier } = await supabaseAdmin
      .from('ao_scout_frontier')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(FRONTIER_BATCH);

    const batch = Array.isArray(frontier) ? frontier : [];
    if (!batch.length) {
      if (runId) {
        await supabaseAdmin
          .from('ao_scout_runs')
          .update({ finished_at: new Date().toISOString(), pages_fetched: 0, leads_followed: 0, discoveries_created: 0 })
          .eq('id', runId);
      }
      return { ok: true, runId, pagesFetched: 0, discoveriesCreated: 0, message: 'Nothing to scan right now.' };
    }

    for (const f of batch) {
      const frontierUrl = safeUrl(f?.url);
      if (!frontierUrl) continue;

      // Mark in progress
      await supabaseAdmin
        .from('ao_scout_frontier')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', f.id);

      const fetched = await fetchText(frontierUrl);
      pagesFetched += 1;

      const paywalled = looksPaywalled({ status: fetched.status, text: fetched.text });

      const title =
        safeText(metaContent(fetched.text, 'og:title'), 220)
        || safeText(metaContent(fetched.text, 'twitter:title'), 220)
        || safeText((fetched.text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || ''), 220);

      const excerpt =
        safeText(metaContent(fetched.text, 'og:description'), 600)
        || safeText(metaContent(fetched.text, 'description'), 600);

      const primaryHtml = extractPrimaryHtml(fetched.text);
      const rawText = safeText(stripHtml(primaryHtml), MAX_RAW_TEXT_LEN);

      // Save page record (best effort)
      try {
        await supabaseAdmin.from('ao_scout_pages').upsert({
          url: frontierUrl,
          final_url: frontierUrl,
          title: title || null,
          author: null,
          published_at: null,
          excerpt: excerpt || null,
          raw_text: rawText || null,
          is_paywalled: paywalled,
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'url' });
      } catch (_) {}

      if (paywalled) {
        await supabaseAdmin
          .from('ao_scout_frontier')
          .update({ status: 'skipped', reason: 'paywalled', updated_at: new Date().toISOString() })
          .eq('id', f.id);
        continue;
      }

      // If this looks like a topic/landing/listing page, treat it as a seed and push the real articles into the frontier.
      // We do NOT want to send listing pages to Analyst.
      const allLinksCount = extractLinks(fetched.text, frontierUrl).length;
      const seedLinks = pickArticleLinksFromPage(fetched.text, frontierUrl);
      const looksLikeListing = (seedLinks.length >= 2) || (seedLinks.length >= 1 && allLinksCount >= 40 && rawText.length < 900);
      if (looksLikeListing && frontierAdds < MAX_TOTAL_FRONTIER_ADDS) {
        const adds = [];
        for (const u of seedLinks.slice(0, MAX_OUT_LINKS_PER_PAGE)) {
          if (frontierAdds >= MAX_TOTAL_FRONTIER_ADDS) break;
          adds.push({
            url: u,
            discovered_from_url: frontierUrl,
            depth: Math.min(50, Number(f?.depth || 0) + 1),
            priority: 3,
            status: 'pending',
            reason: 'listing_seed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          frontierAdds += 1;
        }
        if (adds.length) {
          try { await supabaseAdmin.from('ao_scout_frontier').insert(adds); } catch (_) {}
          leadsFollowed += adds.length;
        }

        // Also immediately open 1–2 best articles (same run) so results show up faster.
        // Stay conservative: stop if we're near the daily cap or we've already spent a while in this run.
        const inlineMax = 2;
        let inlineDone = 0;
        for (const u of seedLinks.slice(0, inlineMax)) {
          if (usedInWindow >= DAILY_CAP) break;
          if (Date.now() - runStartMs > 22_000) break;
          if (await seenSourceUrlRecently(u)) continue;
          const fetched2 = await fetchText(u);
          pagesFetched += 1;
          const pay2 = looksPaywalled({ status: fetched2.status, text: fetched2.text });
          if (pay2) continue;

          const title2 =
            safeText(metaContent(fetched2.text, 'og:title'), 220)
            || safeText(metaContent(fetched2.text, 'twitter:title'), 220)
            || safeText((fetched2.text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || ''), 220);
          const excerpt2 =
            safeText(metaContent(fetched2.text, 'og:description'), 600)
            || safeText(metaContent(fetched2.text, 'description'), 600);
          const raw2 = safeText(stripHtml(extractPrimaryHtml(fetched2.text)), MAX_RAW_TEXT_LEN);

          const assess2 = await aiAssess({ url: u, title: title2, excerpt: excerpt2, rawText: raw2 });
          const relevant2 = !!assess2?.relevant;
          if (!relevant2) continue;

          const pullQuote = safeText(assess2?.pull_quote, 260);
          const why = safeText(assess2?.why_it_matters, 900);
          const summary = safeText(assess2?.summary_interpretation, 3000);
          const riskFlags = Array.isArray(assess2?.risk_flags) ? assess2.risk_flags.slice(0, 8).map((x) => safeText(x, 80)).filter(Boolean) : [];
          const lane = safeText(assess2?.ao_lane, 80) || 'Leadership clarity';
          const tags = Array.isArray(assess2?.topic_tags) ? assess2.topic_tags.slice(0, 8).map((x) => safeText(x, 24).toLowerCase()).filter(Boolean) : [];
          const kind = safeText(assess2?.content_kind, 24) || 'other';
          const nextStage = String(assess2?.recommended_next_stage || '').toLowerCase() === 'publisher' ? 'publisher' : 'studio';

          try {
            const { error } = await supabaseAdmin.from('ao_quote_review_queue').insert({
              quote_text: excerpt2 || title2 || raw2.slice(0, 240) || 'Scout item',
              author: null,
              source_slug_or_url: u,
              source_type: 'article',
              is_internal: false,
              status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),

              source_url: u,
              source_title: title2 || null,
              source_excerpt: excerpt2 || null,
              raw_content: raw2 || null,
              content_kind: kind,
              ao_lane: lane,
              topic_tags: tags,
              pull_quote: pullQuote || null,
              why_it_matters: why || null,
              summary_interpretation: summary || null,
              risk_flags: riskFlags,
              next_stage: nextStage,

              scout_run_id: runId,
              scout_depth: Math.min(50, Number(f?.depth || 0) + 1),
              scout_discovered_from_url: frontierUrl,
              scout_watched_source_url: frontierUrl,
            });
            if (!error) {
              discoveriesCreated += 1;
              usedInWindow += 1;
              inlineDone += 1;
            }
          } catch (_) {}
        }

        await supabaseAdmin
          .from('ao_scout_frontier')
          .update({ status: 'done', reason: 'listing_page_seeded_articles', updated_at: new Date().toISOString() })
          .eq('id', f.id);
        continue;
      }

      const capReached = usedInWindow >= DAILY_CAP;

      // Ask AI if it’s a leadership-relevant discovery
      const assessment = await aiAssess({ url: frontierUrl, title, excerpt, rawText });
      const relevant = !!assessment?.relevant;

      if (relevant && !capReached) {
        if (await seenSourceUrlRecently(frontierUrl)) {
          await supabaseAdmin
            .from('ao_scout_frontier')
            .update({ status: 'done', reason: 'duplicate_url', updated_at: new Date().toISOString() })
            .eq('id', f.id);
          continue;
        }
        const pullQuote = safeText(assessment?.pull_quote, 260);
        const why = safeText(assessment?.why_it_matters, 900);
        const summary = safeText(assessment?.summary_interpretation, 3000);
        const riskFlags = Array.isArray(assessment?.risk_flags) ? assessment.risk_flags.slice(0, 8).map((x) => safeText(x, 80)).filter(Boolean) : [];
        const lane = safeText(assessment?.ao_lane, 80) || 'Leadership clarity';
        const tags = Array.isArray(assessment?.topic_tags) ? assessment.topic_tags.slice(0, 8).map((x) => safeText(x, 24).toLowerCase()).filter(Boolean) : [];
        const kind = safeText(assessment?.content_kind, 24) || 'other';
        const nextStage = String(assessment?.recommended_next_stage || '').toLowerCase() === 'publisher' ? 'publisher' : 'studio';

        const baseInsert = {
          quote_text: excerpt || title || rawText.slice(0, 240) || 'Scout item',
          author: null,
          source_slug_or_url: frontierUrl,
          source_type: 'article',
          is_internal: false,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Best-effort insert with rich fields if the intelligence migrations were applied.
        let insertedOk = false;
        try {
          const { error } = await supabaseAdmin.from('ao_quote_review_queue').insert({
            ...baseInsert,
            source_url: frontierUrl,
            source_title: title || null,
            source_excerpt: excerpt || null,
            raw_content: rawText || null,
            content_kind: kind,
            ao_lane: lane,
            topic_tags: tags,
            pull_quote: pullQuote || null,
            why_it_matters: why || null,
            summary_interpretation: summary || null,
            risk_flags: riskFlags,
            next_stage: nextStage,
            scout_run_id: runId,
            scout_depth: Number(f?.depth || 0),
            scout_discovered_from_url: safeText(f?.discovered_from_url, 900) || null,
            scout_watched_source_url: safeText(f?.discovered_from_url, 900) || null,
          });
          if (!error) insertedOk = true;
        } catch (_) {}

        if (!insertedOk) {
          // Fallback: minimal insert
          try {
            const { error } = await supabaseAdmin.from('ao_quote_review_queue').insert(baseInsert);
            if (!error) insertedOk = true;
          } catch (_) {}
        }

        if (insertedOk) discoveriesCreated += 1;
        if (insertedOk) usedInWindow += 1;
      }

      // Follow leads (links) conservatively: only from pages that look relevant OR have enough leadership signals.
      const sig = leadershipSignalStrength(rawText);
      const shouldFollow = relevant || sig.hasStrong || sig.supportHits >= 2;
      if (shouldFollow && frontierAdds < MAX_TOTAL_FRONTIER_ADDS) {
        const links = extractLinks(fetched.text, frontierUrl).slice(0, 120);
        const adds = [];
        for (const u of links) {
          if (frontierAdds >= MAX_TOTAL_FRONTIER_ADDS) break;
          const d = normDomain(u);
          if (!d) continue;

          const watched = await isWatchedDomain(d);
          if (!watched) await upsertPendingDomain(d, u);

          adds.push({
            url: u,
            discovered_from_url: frontierUrl,
            depth: Math.min(50, Number(f?.depth || 0) + 1),
            priority: watched ? 2 : 1,
            status: 'pending',
            reason: watched ? 'follow_lead_watched' : 'follow_lead_new_domain',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          frontierAdds += 1;
        }
        if (adds.length) {
          try { await supabaseAdmin.from('ao_scout_frontier').insert(adds); } catch (_) {}
          leadsFollowed += adds.length;
        }
      }

      await supabaseAdmin
        .from('ao_scout_frontier')
        .update({ status: fetched.ok ? 'done' : 'skipped', updated_at: new Date().toISOString(), reason: fetched.ok ? null : 'fetch_failed' })
        .eq('id', f.id);
    }

    if (runId) {
      await supabaseAdmin
        .from('ao_scout_runs')
        .update({
          finished_at: new Date().toISOString(),
          pages_fetched: pagesFetched,
          leads_followed: leadsFollowed,
          discoveries_created: discoveriesCreated,
        })
        .eq('id', runId);
    }

    return {
      ok: true,
      runId,
      pagesFetched,
      leadsFollowed,
      discoveriesCreated,
    };
  } catch (e) {
    if (runId) {
      try {
        await supabaseAdmin
          .from('ao_scout_runs')
          .update({
            finished_at: new Date().toISOString(),
            pages_fetched: pagesFetched,
            leads_followed: leadsFollowed,
            discoveries_created: discoveriesCreated,
            error_message: safeText(e?.message || String(e), 900),
          })
          .eq('id', runId);
      } catch (_) {}
    }
    return { ok: false, runId, error: e?.message || String(e) };
  }
}

