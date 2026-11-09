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
/**
 * Pure: the chat Bart actually worked on a post in. Among chats that mention
 * the post, only ones where he wrote something count, and the one he wrote in
 * most recently wins. Reports and look-aheads that only name the title, and
 * empty chats, never count (2026-11-08: "Open the post" opened an empty chat
 * while his real Eli conversation sat in Next Biblical Archetype).
 */
export function pickPostThread(mentions = [], userMessages = []) {
  const mentioned = new Set(mentions.map((m) => m.thread_id).filter(Boolean));
  const lastByThread = new Map();
  for (const m of userMessages) {
    if (!mentioned.has(m.thread_id)) continue;
    const t = Date.parse(m.created_at) || 0;
    if (t > (lastByThread.get(m.thread_id) || 0)) lastByThread.set(m.thread_id, t);
  }
  let best = null;
  for (const [id, t] of lastByThread) if (!best || t > best.t) best = { id, t };
  return best?.id || null;
}

async function threadForSlug(slug, title, savedThreadId = null) {
  const since = new Date(Date.now() - 45 * 86400000).toISOString();
  // The post remembers the chat it was last saved from (2026-11-08); that wins.
  if (savedThreadId) {
    const { data: t } = await supabaseAdmin.from('ao_auto_threads').select('id').eq('id', savedThreadId).maybeSingle();
    if (t?.id) return t.id;
  }
  const needles = [slug, title].map((x) => String(x || '').replace(/[%_]/g, '').trim()).filter((x) => x.length >= 6);
  if (!needles.length) return null;
  const mentions = [];
  for (const n of needles) {
    const { data } = await supabaseAdmin
      .from('ao_auto_messages')
      .select('thread_id')
      .ilike('content', `%${n}%`)
      .gte('created_at', since)
      .limit(500);
    mentions.push(...(data || []));
  }
  const ids = [...new Set(mentions.map((m) => m.thread_id).filter(Boolean))].slice(0, 200);
  if (!ids.length) return null;
  const { data: userMessages } = await supabaseAdmin
    .from('ao_auto_messages')
    .select('thread_id, created_at, role, content, meta')
    .in('thread_id', ids)
    .eq('role', 'user')
    .gte('created_at', since)
    .limit(2000);
  // Team notes are written as user turns; only Bart's own words count.
  return pickPostThread(mentions, (userMessages || []).filter(isBartReply));
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
    out.push({ slug: d.slug, title: d.title || d.slug, ...waiting, updated_at: d.updated_at, thread_id: await safe(() => threadForSlug(d.slug, d.title, d.metadata?.thread_id), null) });
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

/**
 * A question about an infographic is moot once that graphic moved on (2026-11-06).
 * Des and Vox asked Bart for the Hunger iceberg file after Bit had already found
 * it, redrawn it and announced the new image in the same chat; Bart saw both
 * questions anyway. Bart: "Those questions should have been removed before I saw
 * them." Moved on means: no longer waiting (approved, discarded or redone), or a
 * teammate posted its current image in the chat after the question.
 */
export function infographicMovedOn({ rows = [], laterTeamMessages = [] } = {}) {
  const pending = rows.filter((r) => r?.status === 'pending');
  if (!rows.length) return false;
  if (!pending.length) return true;
  return pending.some((r) => r.image_url && laterTeamMessages.some((m) => String(m?.content || '').includes(r.image_url)));
}

async function infographicSettledSince(task) {
  const threadId = task.thread_id || task.parent_thread_id;
  if (!threadId || !task.updated_at) return false;
  const { data: thread } = await supabaseAdmin.from('ao_auto_threads').select('title').eq('id', threadId).maybeSingle();
  const m = /^Infographic:\s*(.+)$/.exec(String(thread?.title || '').trim());
  if (!m) return false;
  const { data: rows } = await supabaseAdmin
    .from('ao_infographics')
    .select('status, image_url, created_at')
    .eq('source_title', m[1].trim())
    .lte('created_at', task.updated_at);
  const { data: later } = await supabaseAdmin
    .from('ao_auto_messages')
    .select('content')
    .eq('thread_id', threadId)
    .eq('role', 'assistant')
    .gt('created_at', task.updated_at)
    .limit(40);
  return infographicMovedOn({ rows: rows || [], laterTeamMessages: later || [] });
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
    if (await safe(() => infographicSettledSince(t), false)) {
      await safe(() => supabaseAdmin.from('ao_team_tasks').update({ status: 'done', summary: 'The infographic was already fixed or decided.', finished_at: new Date().toISOString() }).eq('id', t.id).eq('status', 'needs_bart'), null);
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
