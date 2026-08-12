/**
 * Caption-craft patterns from top-performing posts (length + hashtag counts).
 * Pure helpers — safe when metrics/captions are missing.
 */

function wordCount(text) {
  const t = String(text || '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/#\w+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return 0;
  return t.split(' ').filter(Boolean).length;
}

function hashtagCount(text) {
  const matches = String(text || '').match(/#[\w]+/g);
  return matches ? matches.length : 0;
}

function avg(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * @param {Array<{ platform?: string, caption?: string, engagement_score?: number|null, reactions?: number|null, posted_at_utc?: string|null }>} posts
 * @returns {string[]} human-readable craft lines (empty when insufficient data)
 */
export function buildCaptionCraftInsightLines(posts = []) {
  const byPlatform = {};
  for (const p of posts || []) {
    const platform = String(p?.platform || '').toLowerCase().trim();
    const caption = String(p?.caption || '').trim();
    if (!platform || !caption) continue;
    if (!byPlatform[platform]) byPlatform[platform] = [];
    byPlatform[platform].push({
      caption,
      score: Number(p.engagement_score) || 0,
      reactions: Number(p.reactions) || 0,
      posted_at_utc: p.posted_at_utc || null,
    });
  }

  const lines = [];
  for (const [platform, list] of Object.entries(byPlatform)) {
    if (list.length < 3) continue;

    const byScore = [...list].sort((a, b) => b.score - a.score || b.reactions - a.reactions);
    const top = byScore.slice(0, Math.min(3, byScore.length));
    const recent = [...list]
      .sort((a, b) => String(b.posted_at_utc || '').localeCompare(String(a.posted_at_utc || '')))
      .slice(0, Math.min(5, list.length));

    const topHash = avg(top.map((p) => hashtagCount(p.caption)));
    const topWords = avg(top.map((p) => wordCount(p.caption)));
    const recentHash = avg(recent.map((p) => hashtagCount(p.caption)));
    const recentWords = avg(recent.map((p) => wordCount(p.caption)));

    lines.push(
      `- ${platform}: your top ${top.length} posts averaged ${topHash.toFixed(1)} hashtags and ~${Math.round(
        topWords
      )} words — your last ${recent.length} captions averaged ${recentHash.toFixed(1)} hashtags and ~${Math.round(
        recentWords
      )} words`
    );
  }

  return lines;
}

/**
 * Section block for Auto's performance context. Empty string when no craft lines.
 */
export function formatCaptionCraftInsightSection(posts = []) {
  const lines = buildCaptionCraftInsightLines(posts);
  if (!lines.length) return '';
  return `### Caption craft patterns (from posts with real engagement)
${lines.join('\n')}
Use these as craft signals when writing new captions for the same channel — not as rigid rules.`;
}
