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
export const OUTLINE_MIN_WORDS = 400;
const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;

const STEP_LABEL = {
  brief: 'The research and brief are ready for your OK',
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
    // An outline the writer put in front of him, not a saved idea for later.
    // A full outline put in front of him, not a saved idea for later (the
    // Abigail and Moses fast-follow notes run about 250 words; outlines 1,000+).
    brief: words(draft.metadata?.brief?.outline_text) >= OUTLINE_MIN_WORDS && Boolean(draft.metadata?.brief?.outline_presented_at),
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

/**
 * The conversation a journal post was worked in: the latest one that names it,
 * by its address or its title. Openers ("What are we writing?") never count.
 * 2026-10-27: the Eli outline named only its title, nothing matched, and
 * "Open the post" started two empty chats instead.
 */
async function threadForSlug(slug, title) {
  const since = new Date(Date.now() - 45 * 86400000).toISOString();
  const hits = [];
  for (const needle of [slug, title].filter((t) => String(t || '').trim().length >= 6)) {
    const { data } = await supabaseAdmin
      .from('ao_auto_messages')
      .select('thread_id, created_at, meta')
      .ilike('content', `%${String(needle).replace(/[%_]/g, '')}%`)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);
    for (const m of data || []) if (!m?.meta?.orientation) hits.push(m);
  }
  hits.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return hits[0]?.thread_id || null;
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
    out.push({ slug: d.slug, title: d.title || d.slug, ...waiting, updated_at: d.updated_at, thread_id: await safe(() => threadForSlug(d.slug, d.title), null) });
  }
  return out;
}

/** A message Bart typed himself (not a team note) in the task's chat after it asked him. */
export function isBartReply(m) {
  return m?.role === 'user' && !m?.meta?.team_task && !m?.meta?.team_note && String(m?.content || '').trim().length > 0;
}

async function bartRepliedSince(task) {
  const threadId = task.thread_id || task.parent_thread_id;
  if (!threadId || !task.updated_at) return false;
  const { data } = await supabaseAdmin
    .from('ao_auto_messages')
    .select('role, content, meta')
    .eq('thread_id', threadId)
    .eq('role', 'user')
    .gt('created_at', task.updated_at)
    .limit(20);
  return (data || []).some(isBartReply);
}

async function teamQuestions() {
  const { data, error } = await supabaseAdmin
    .from('ao_team_tasks')
    .select('id, agent, title, question, thread_id, parent_thread_id, updated_at')
    .eq('status', 'needs_bart')
    .order('updated_at', { ascending: true })
    .limit(20);
  if (error) throw new Error(error.message);
  const open = [];
  for (const t of data || []) {
    if (await safe(() => bartRepliedSince(t), false)) {
      // 2026-10-28: Bart answered Bit's question in the Automated posts chat
      // and it still sat in #queue. His reply in the chat closes the question.
      await safe(() => supabaseAdmin.from('ao_team_tasks').update({ status: 'done', summary: 'Bart answered in the chat.', finished_at: new Date().toISOString() }).eq('id', t.id).eq('status', 'needs_bart'), null);
      continue;
    }
    open.push(t);
  }
  return open.map((t) => {
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
    // Only the week's bundle shows as cards; single quotes waiting elsewhere do not.
    safe(() => countRows('ao_quote_review_queue', (q) => q.eq('status', 'pending').eq('content_kind', 'weekly_corpus_bundle')), 0),
    safe(teamQuestions, []),
    safe(() => waitingPosts(owner), []),
  ]);
  // Resurfaces are grouped by entry, one per post, the way the review shows them.
  const reshares = new Set(reshareRows.map((r) => r?.intent?.slug || 'unknown')).size;
  const counts = { emails, reshares, infographics, quote_cards: quoteCards, questions: questions.length, posts: posts.length };
  return { ok: true, count: queueCount(counts), counts, questions, posts };
}
