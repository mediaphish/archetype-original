/**
 * #queue: everything waiting on Bart, in one place in chat.
 *
 * Bart, 2026-10-27: "I want as much in chat as we can get there. Even if it's a
 * queue channel." and "Need a way to easily see what needs my attention."
 *
 * This gathers what is waiting from each source, so the chat can show one count
 * and one list: emails the team wrote, resurfaces, infographics, the week's
 * quote cards, questions a teammate put to him, and journal posts whose next
 * step is his OK. Journal posts stay in their own conversations; #queue shows a
 * card that takes him there ("You can build it", choosing the first option).
 */
import { supabaseAdmin } from '../supabase-admin.js';
import { AGENTS, normalizeAgent } from './team/agents.js';
import { deriveDraftStage } from './draftStage.js';
import { scheduledPosts } from '../db/scheduledPosts.js';
import { contentDrafts } from '../db/contentDrafts.js';

/** Bart's entries run about 2,000 words; anything under this is a note, not a draft. */
export const DRAFT_MIN_WORDS = 600;
const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;

const STEP_LABEL = {
  post: 'The post is ready for your read',
  image: 'The header image is ready for your OK',
  schedule: 'The schedule is ready for your OK',
  captions: 'The captions are ready for your OK',
  ready: 'Ready to publish',
};

/**
 * Pure: whether a journal post is waiting on Bart, and for what. A step counts
 * only when its piece exists, so a post the team is still working on is not
 * put in front of him.
 *
 * @param {object} draft
 * @param {{ captionCount?: number }} [opts]
 * @returns {{ step: string, label: string } | null}
 */
export function journalWaiting(draft, { captionCount = 0 } = {}) {
  if (!draft || String(draft.kind || 'journal') !== 'journal') return null;
  const { stage } = deriveDraftStage({ draft });
  const has = {
    // A real draft, not a saved idea or brief (the Abigail and Moses notes are
    // a paragraph each, "fast follows" for later).
    post: words(draft.content) >= DRAFT_MIN_WORDS,
    image: Boolean(draft.image_url),
    schedule: Boolean(draft.scheduled_publish_at),
    captions: captionCount > 0,
    // An approved post with a publish day goes out on its day by itself.
    ready: !draft.scheduled_publish_at,
  };
  if (!STEP_LABEL[stage] || !has[stage]) return null;
  return { step: stage, label: STEP_LABEL[stage] };
}

/** Pure: the one number on #queue. The week's quote cards count once. */
export function queueCount(counts = {}) {
  return (
    (counts.emails || 0) +
    (counts.reshares || 0) +
    (counts.infographics || 0) +
    (counts.quote_cards ? 1 : 0) +
    (counts.questions || 0) +
    (counts.posts || 0)
  );
}

const safe = async (fn, fallback) => {
  try {
    return await fn();
  } catch (_) {
    return fallback;
  }
};

async function countRows(table, apply) {
  const from = table === 'ao_scheduled_posts' ? scheduledPosts() : supabaseAdmin.from(table);
  const { count, error } = await apply(from.select('id', { count: 'exact', head: true }));
  if (error) throw new Error(error.message);
  return count || 0;
}

/** The conversation a journal post was worked in: the latest one that names it. */
async function threadForSlug(slug) {
  const { data } = await supabaseAdmin
    .from('ao_auto_messages')
    .select('thread_id, created_at')
    .ilike('content', `%${slug}%`)
    .gte('created_at', new Date(Date.now() - 45 * 86400000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
  return data?.[0]?.thread_id || null;
}

async function waitingPosts(owner) {
  const { data, error } = await contentDrafts()
    .select('slug, title, kind, status, content, image_url, approved_at, scheduled_publish_at, published_at, updated_at, metadata')
    .eq('created_by_email', owner)
    .eq('kind', 'journal')
    .not('status', 'in', '(published,abandoned)')
    .gte('updated_at', new Date(Date.now() - 30 * 86400000).toISOString())
    .order('updated_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  const out = [];
  for (const d of data || []) {
    let captionCount = 0;
    if (deriveDraftStage({ draft: d }).stage === 'captions') {
      captionCount = await countRows('ao_scheduled_posts', (q) =>
        q.eq('source_kind', 'journal_launch').contains('intent', { journal_slug: d.slug }).neq('status', 'failed')
      ).catch(() => 0);
    }
    const waiting = journalWaiting(d, { captionCount });
    if (!waiting) continue;
    out.push({ slug: d.slug, title: d.title || d.slug, ...waiting, updated_at: d.updated_at, thread_id: await safe(() => threadForSlug(d.slug), null) });
  }
  return out;
}

async function teamQuestions() {
  const { data, error } = await supabaseAdmin
    .from('ao_team_tasks')
    .select('id, agent, title, question, thread_id, parent_thread_id, updated_at')
    .eq('status', 'needs_bart')
    .order('updated_at', { ascending: true })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data || []).map((t) => {
    const agent = normalizeAgent(t.agent);
    return { id: t.id, agent, agent_name: AGENTS[agent]?.name || 'Ada', title: t.title, question: t.question || '', thread_id: t.thread_id || t.parent_thread_id || null, updated_at: t.updated_at };
  });
}

/**
 * Everything waiting on Bart. One source failing never hides the others.
 * @param {string} ownerEmail
 */
export async function loadQueue(ownerEmail) {
  const owner = String(ownerEmail || '').toLowerCase().trim();
  const [emails, reshareRows, infographics, quoteCards, questions, posts] = await Promise.all([
    safe(() => countRows('ao_team_outbox', (q) => q.eq('status', 'pending_review')), 0),
    safe(async () => {
      const { data, error } = await scheduledPosts().select('intent').eq('status', 'pending_review').eq('source_kind', 'ao_journal_reshare').limit(200);
      if (error) throw new Error(error.message);
      return data || [];
    }, []),
    safe(() => countRows('ao_infographics', (q) => q.eq('status', 'pending')), 0),
    safe(() => countRows('ao_quote_review_queue', (q) => q.eq('status', 'pending')), 0),
    safe(teamQuestions, []),
    safe(() => waitingPosts(owner), []),
  ]);
  // Resurfaces are grouped by entry, one per post, the way the review shows them.
  const reshares = new Set(reshareRows.map((r) => r?.intent?.slug || 'unknown')).size;
  const counts = { emails, reshares, infographics, quote_cards: quoteCards, questions: questions.length, posts: posts.length };
  return { ok: true, count: queueCount(counts), counts, questions, posts };
}
