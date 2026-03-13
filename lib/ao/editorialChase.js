/**
 * AO Newsroom Shared Memory Loop
 * Chase-list generation (best-effort).
 *
 * MVP approach:
 * - Use beat priorities as the "universe"
 * - Use recent coverage to avoid repeats (soft guidance)
 * - Produce prompts Scout can act on immediately
 *
 * If OPEN_API_KEY is configured, we can later upgrade this to an AI-generated list.
 */

function safeText(v, max = 280) {
  const s = String(v || '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s.slice(0, max);
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr || []) {
    const v = String(x || '').trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

export function generateChaseListMvp({ beatPriorities, coverage, goodTags }) {
  const priorities = uniq(Array.isArray(beatPriorities) ? beatPriorities : []).slice(0, 50);
  const byTag = coverage?.byTag || {};
  const good = new Set((Array.isArray(goodTags) ? goodTags : []).map((x) => String(x || '').toLowerCase().trim()).filter(Boolean));

  const recentTags = new Set(Object.keys(byTag || {}).map((k) => String(k || '').toLowerCase()));

  const items = [];
  const now = Date.now();
  const expiresAt = new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString();

  for (const p of priorities) {
    const pKey = p.toLowerCase();
    const undercovered = !recentTags.has(pKey);
    const knownGood = good.has(pKey);
    const topic = safeText(p, 160);
    if (!topic) continue;
    items.push({
      topic,
      why: knownGood
        ? 'You rated this as “good” recently. Let’s pursue a fresh angle and keep momentum.'
        : (undercovered
          ? 'This is one of your priorities, and it hasn’t shown up in recent posts. Let’s chase it.'
          : 'This is one of your priorities. Let’s find a fresh angle or new example.'),
      priority: knownGood ? 98 : (undercovered ? 95 : 80),
      expires_at: expiresAt,
    });
  }

  // Add a few generic "gap-finders" that keep the system from getting stuck.
  items.push(
    {
      topic: 'A current leadership failure (accountability, blame-shifting, or cowardice) that can be explained simply',
      why: 'High signal and usually timely. Look for a clean example, no paywalls.',
      priority: 70,
      expires_at: expiresAt,
    },
    {
      topic: 'A leadership win that came from discipline + systems (not hype)',
      why: 'Keeps the feed balanced (not only critique). Find a concrete example.',
      priority: 65,
      expires_at: expiresAt,
    }
  );

  // Sort + cap
  return items
    .filter((x) => x.topic)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 20);
}

