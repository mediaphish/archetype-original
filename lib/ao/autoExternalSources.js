const FETCH_TIMEOUT_MS = 12_000;

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function safeUrl(raw) {
  try {
    if (!raw) return null;
    const u = new URL(String(raw));
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.AO_SCOUT_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
    }),
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const content = json.choices?.[0]?.message?.content?.trim() || '';
  if (!content) return null;
  return JSON.parse(content);
}

export const DEFAULT_SCOUT_SOURCES_PROMPT = `You are AO Scout.

Goal: propose a tight, high-trust set of sources for leadership content.

Quality bar:
- Prefer sources that publish thoughtful leadership, culture, accountability, trust, execution, and decision-making content.
- Prefer sources with an RSS or Atom feed.
- Avoid generic business news hubs unless there is a specific leadership channel/topic page.
- Avoid politics, rage bait, dunking, and gossip.
- Avoid low-signal “inspiration” sites.

Return ONLY JSON with exactly this shape:
{
  "candidates": [
    { "name": "string", "homepage_url": "https://..." }
  ]
}

Notes:
- 30-50 candidates is fine; the system will verify feeds and keep only working sources.
`;

/**
 * Build a working RSS allowlist from a Scout prompt.
 *
 * This function does NOT write to the database; it returns verified feeds ready to insert.
 */
export async function buildExternalSourcesFromPrompt({
  promptText,
  maxCandidates = 50,
  targetCount = 20,
} = {}) {
  const prompt = safeText(promptText, 8000) || DEFAULT_SCOUT_SOURCES_PROMPT;
  const parsed = await openAiJson(prompt);
  const raw = parsed?.candidates;
  const candidates = Array.isArray(raw) ? raw : [];

  const verified = [];
  const seen = new Set();

  for (const c of candidates) {
    if (verified.length >= targetCount) break;
    const name = safeText(c?.name, 120);
    const homepage = safeUrl(c?.homepage_url);
    if (!homepage) continue;
    if (seen.has(homepage)) continue;
    seen.add(homepage);

    const feed = await discoverFeedUrl(homepage);
    if (!feed) continue;
    if (seen.has(feed)) continue;
    seen.add(feed);

    verified.push({
      name: name || homepage,
      feed_url: feed,
      homepage_url: homepage,
    });
    if (verified.length >= targetCount) break;
  }

  return { ok: true, verified };
}

