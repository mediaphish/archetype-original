import { getVoiceAnchors } from './voiceAnchors.js';
import { supabaseAdmin } from '../supabase-admin.js';

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function pickSchedulingHint(objectivesByChannel) {
  const ig = objectivesByChannel?.instagram?.objective;
  const x = objectivesByChannel?.x?.objective;
  const li = objectivesByChannel?.linkedin?.objective;

  if (ig === 'reach') return 'Use the morning slot when you want maximum shares.';
  if (x === 'engagement') return 'Use the midday slot when you want replies and discussion.';
  if (li === 'authority') return 'Use the morning slot when leaders are scanning for clarity.';
  if (li === 'leads') return 'Use the midday slot when people are more likely to click and DM.';
  return 'Use the morning slot for reach or midday for conversation.';
}

function tokens(s) {
  const raw = String(s || '').toLowerCase();
  const parts = raw.split(/[^a-z0-9]+/g).filter(Boolean);
  return parts.filter((p) => p.length >= 5).slice(0, 300);
}

function overlapScore(aTokens, bTokens) {
  const a = new Set(aTokens || []);
  let n = 0;
  for (const t of bTokens || []) {
    if (a.has(t)) n++;
    if (n >= 12) break;
  }
  return n;
}

async function findRecentPostedSimilar({ email, queryText }) {
  const createdByEmail = String(email || '').toLowerCase().trim();
  if (!createdByEmail) return [];
  const q = String(queryText || '').trim();
  if (!q) return [];
  const qTokens = tokens(q);
  if (!qTokens.length) return [];

  try {
    const since = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const out = await supabaseAdmin
      .from('ao_editorial_memory_items')
      .select('title,body_text,published_at,external_platform,ao_lane,topic_tags,source_scheduled_post_id')
      .eq('created_by_email', createdByEmail)
      .eq('kind', 'social_post')
      .gte('published_at', since)
      .order('published_at', { ascending: false })
      .limit(60);
    if (out.error) return [];
    const rows = Array.isArray(out.data) ? out.data : [];

    const scored = rows
      .map((r) => {
        const text = [r?.title, r?.body_text].filter(Boolean).join(' ');
        const score = overlapScore(qTokens, tokens(text));
        return { r, score };
      })
      .filter((x) => x.score >= 3);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((x) => ({
      title: safeText(x.r?.title, 220),
      platform: safeText(x.r?.external_platform, 40),
      published_at: x.r?.published_at || null,
      ao_lane: safeText(x.r?.ao_lane, 80),
      topic_tags: Array.isArray(x.r?.topic_tags) ? x.r.topic_tags : [],
      source_scheduled_post_id: x.r?.source_scheduled_post_id || null,
    }));
  } catch {
    return [];
  }
}

/**
 * Librarian: “we’ve said this before” + light scheduling hint.
 */
export async function librarianAnnotate({ candidateRow, decision }) {
  const query = [decision?.pull_quote, decision?.why_it_matters, candidateRow?.source_title, candidateRow?.raw_content]
    .filter(Boolean)
    .map((x) => safeText(x, 900))
    .join(' ');

  const matches = await getVoiceAnchors({ queryText: query, limit: 3 });
  const recentPosts = await findRecentPostedSimilar({ email: process.env.AO_OWNER_EMAIL, queryText: query });

  const note = matches.length
    ? `We’ve touched this pattern before. These are the closest AO posts: ${matches.map((m) => m.title).join(', ')}.`
    : 'No close match found in AO corpus (may be a fresh angle).';

  return {
    ok: true,
    similarity_notes: {
      note,
      matches: matches.map((m) => ({
        title: m.title,
        url: m.url,
        excerpt: m.excerpt,
      })),
      recent_posts: recentPosts,
      scheduling_hint: pickSchedulingHint(decision?.objectives_by_channel || {}),
    },
  };
}

