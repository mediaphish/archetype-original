import { getOpenAiKey } from '../openaiKey.js';
import { parseLooseJson } from './parseLooseJson.js';

// Keep this extremely fast — the rebuild runs inside a short-lived server request.
const FETCH_TIMEOUT_MS = 2_500;
const MAX_REBUILD_TOTAL_MS = 8_000;
const DISCOVERY_CONCURRENCY = 6;
const OPENAI_TIMEOUT_MS = 9_000;

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function safeUrl(raw) {
  try {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;
    // Be forgiving: if the AI returns "example.com/rss", treat it as https://example.com/rss
    const withScheme = s.startsWith('http://') || s.startsWith('https://') ? s : `https://${s.replace(/^\/+/, '')}`;
    const u = new URL(withScheme);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.toString();
  } catch {
    return null;
  }
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

function looksLikeFeed(xmlText) {
  const t = String(xmlText || '').trim().slice(0, 2000).toLowerCase();
  if (!t) return false;
  return t.includes('<rss') || t.includes('<feed') || t.includes('<rdf:rdf');
}

function extractAlternateFeedUrls(html, baseUrl) {
  const h = String(html || '');
  const out = [];
  const re = /<link[^>]+rel=["']alternate["'][^>]*>/gi;
  const tags = h.match(re) || [];
  for (const tag of tags) {
    const typeMatch = tag.match(/type=["']([^"']+)["']/i);
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    const type = (typeMatch?.[1] || '').toLowerCase();
    const href = hrefMatch?.[1] || '';
    if (!href) continue;
    const isFeedType = type.includes('rss') || type.includes('atom') || type.includes('xml');
    if (!isFeedType) continue;
    try {
      const abs = new URL(href, baseUrl).toString();
      const u = safeUrl(abs);
      if (u) out.push(u);
    } catch (_) {}
  }
  return Array.from(new Set(out));
}

async function validateFeedUrl(feedUrl) {
  const u = safeUrl(feedUrl);
  if (!u) return null;
  const fetched = await fetchText(u);
  if (!fetched.ok) return null;
  if (!looksLikeFeed(fetched.text)) return null;
  return u;
}

async function discoverFeedUrl(homepageUrl) {
  const u = safeUrl(homepageUrl);
  if (!u) return null;

  // If the input already looks like a feed URL, try it first.
  if (u.toLowerCase().includes('rss') || u.toLowerCase().includes('feed') || u.toLowerCase().endsWith('.xml')) {
    const direct = await validateFeedUrl(u);
    if (direct) return direct;
  }

  const fetched = await fetchText(u);
  if (fetched.ok) {
    const alternates = extractAlternateFeedUrls(fetched.text, u);
    for (const alt of alternates.slice(0, 6)) {
      const valid = await validateFeedUrl(alt);
      if (valid) return valid;
    }
  }

  // Common feed patterns on same origin
  try {
    const base = new URL(u);
    const origin = base.origin;
    const common = [
      '/feed',
      '/feed/',
      '/feed.xml',
      '/rss',
      '/rss/',
      '/rss.xml',
      '/atom.xml',
      '/blog/feed',
      '/blog/feed/',
      '/blog/rss',
      '/blog/rss.xml',
      '/insights/rss',
      '/insights/rss.xml',
      '/articles/rss',
      '/articles/rss.xml',
    ];
    for (const path of common) {
      const candidate = origin + path;
      const valid = await validateFeedUrl(candidate);
      if (valid) return valid;
    }
  } catch (_) {}

  return null;
}

async function openAiJson(prompt) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;
  const model = process.env.AO_SCOUT_MODEL || 'gpt-4o-mini';
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 900,
        temperature: 0.2,
      }),
    });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const content = json.choices?.[0]?.message?.content?.trim() || '';
  if (!content) return null;
  return parseLooseJson(content);
}

export const DEFAULT_SCOUT_SOURCES_PROMPT = `You are AO Scout.

Goal: propose a tight, high-trust set of sources for leadership content.

Quality bar:
- Prefer sources that publish thoughtful leadership, culture, accountability, trust, execution, and decision-making content.
- Prefer sources with an RSS or Atom feed, but it is OK to include high-quality sites that do not publish feeds (use homepage_url for those).
- Avoid generic business news hubs unless there is a specific leadership channel/topic page.
- Avoid politics, rage bait, dunking, and gossip.
- Avoid low-signal “inspiration” sites.

Return ONLY JSON with exactly this shape:
{
  "candidates": [
    { "name": "string", "feed_url": "https://...rss-or-atom... (optional)", "homepage_url": "https://... (required)" }
  ]
}

Notes:
- Return raw JSON only (no markdown, no fenced code blocks).
- Prefer including a direct feed_url for each source (RSS or Atom), but do not skip strong sources just because feed_url is unknown.
- 30-50 candidates is fine.
`;

async function runPool({ items, concurrency, worker }) {
  const limit = Math.max(1, Math.min(12, Number(concurrency || 4)));
  let idx = 0;
  const runners = Array.from({ length: limit }, async () => {
    while (idx < items.length) {
      const current = items[idx++];
      await worker(current);
    }
  });
  await Promise.all(runners);
}

/**
 * Build a working RSS allowlist from a Scout prompt.
 *
 * This function does NOT write to the database; it returns verified feeds ready to insert.
 */
export async function buildExternalSourcesFromPrompt({
  promptText,
  maxCandidates = 50,
  targetCount = 20,
  onVerified,
} = {}) {
  if (!getOpenAiKey()) {
    return { ok: false, error: 'AI is not configured (missing OPEN_API_KEY).' };
  }
  const startedAtMs = Date.now();
  const deadlineMs = startedAtMs + MAX_REBUILD_TOTAL_MS;
  const prompt = safeText(promptText, 8000) || DEFAULT_SCOUT_SOURCES_PROMPT;
  const parsed = await openAiJson(prompt);
  const raw = parsed?.candidates;
  const candidates = (Array.isArray(raw) ? raw : []).slice(0, Math.max(1, Math.min(200, Number(maxCandidates || 50))));

  const verified = [];
  const seen = new Set();

  const cleanTarget = Math.max(4, Math.min(25, Number(targetCount || 12)));
  const trimmed = candidates.slice(0, Math.max(8, Math.min(60, Number(maxCandidates || 30))));

  await runPool({
    items: trimmed,
    concurrency: DISCOVERY_CONCURRENCY,
    worker: async (c) => {
      if (Date.now() >= deadlineMs) return;
      if (verified.length >= cleanTarget) return;

      const name = safeText(c?.name, 120);
      const homepage = safeUrl(c?.homepage_url);
      const feedHint = safeUrl(c?.feed_url);
      const feed = feedHint ? await validateFeedUrl(feedHint) : (homepage ? await discoverFeedUrl(homepage) : null);
      if (!feed) return;
      if (seen.has(feed)) return;
      seen.add(feed);

      if (verified.length < cleanTarget) {
        const v = {
          name: name || homepage || feed,
          feed_url: feed,
          homepage_url: homepage || null,
        };
        verified.push(v);
        if (typeof onVerified === 'function') {
          try { await onVerified(v); } catch (_) {}
        }
      }
    },
  });

  const hitDeadline = Date.now() >= deadlineMs;
  const note = hitDeadline
    ? `Time limit reached while verifying sources. Found ${verified.length} working feed(s). Run rebuild again to add more.`
    : null;

  return { ok: true, verified, note };
}

/**
 * Fast mode: build a list of feed URLs WITHOUT live verification.
 * This exists because rebuild runs inside a short-lived request and can be killed if it tries to crawl/verify too much.
 */
export async function buildExternalSourcesFastFromPrompt({
  promptText,
  maxCandidates = 30,
  targetCount = 12,
} = {}) {
  if (!getOpenAiKey()) {
    return { ok: false, error: 'AI is not configured (missing OPEN_API_KEY).' };
  }
  const prompt = safeText(promptText, 8000) || DEFAULT_SCOUT_SOURCES_PROMPT;
  const parsed = await openAiJson(prompt);
  if (!parsed) {
    return { ok: false, error: 'AI did not respond in time. Try rebuild again.' };
  }
  const raw = parsed?.candidates;
  const candidates = (Array.isArray(raw) ? raw : []).slice(0, Math.max(1, Math.min(200, Number(maxCandidates || 30))));
  if (!candidates.length) {
    return { ok: false, error: 'AI returned no candidates. Try rebuild again.' };
  }

  const out = [];
  const seen = new Set();
  const cleanTarget = Math.max(4, Math.min(25, Number(targetCount || 12)));

  for (const c of candidates) {
    if (out.length >= cleanTarget) break;
    const name = safeText(c?.name, 120);
    const feed = safeUrl(c?.feed_url);
    const homepage = safeUrl(c?.homepage_url);
    const url = feed || homepage;
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({
      name: name || homepage || feed,
      url,
      source_type: feed ? 'rss' : 'article',
      feed_url: feed || null,
      homepage_url: homepage || null,
    });
  }

  return {
    ok: true,
    verified: out,
    note: 'Fast rebuild: saved source URLs without live verification. The next scan will confirm which ones work.',
  };
}

