/**
 * Bit's post guard: posts that should go live, do.
 *
 * Bart, 2026-11-02, after The Josiah Archetype missed 6:00am while the publish
 * step refused it every 15 minutes and nobody heard: "quality needs to be in a
 * zero tolerance situation. Can we bring in Bit to help with a self healing
 * situation when posts do not go live."
 *
 * Every 15 minutes this looks a day ahead and a day behind:
 *   - fixes what is safe: books captions Bart approved, restarts a publish run
 *     that did not happen, retries a post that failed for a passing reason.
 *   - tells Bart once, in plain words, about anything only he can settle.
 *   - confirms a published journal post really reached the site.
 *
 * Bit never writes or changes wording, never approves anything for Bart, and
 * never resends a post that may already have gone out.
 */
import { supabaseAdmin } from '../../supabase-admin.js';
import { scheduledPosts, updateById } from '../../db/scheduledPosts.js';
import { contentDrafts } from '../../db/contentDrafts.js';
import { isTruncatedSummary, summaryFromContent } from '../postSummary.js';
import { logActivity } from '../logActivity.js';

const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const LATE_AFTER = 20 * MIN;
const LIVE_WITHIN = 25 * MIN;
const MAX_RETRIES = 3;
const SITE = () => process.env.SITE_URL || 'https://www.archetypeoriginal.com';

const clock = (iso) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: '2-digit' });

const problem = (key, label, status, detail, forClaude = null) => ({ key: `guard_${key}`, label, status, detail, for_claude: forClaude });

/** Pure: a failure that may pass by itself. Anything unrecognized goes to a person. */
export function isPassingPostError(message) {
  const text = String(message || '');
  if (/access token|session has expired|expired|unauthori[sz]ed|permission|invalid_grant|reconnect|duplicate/i.test(text)) return false;
  return /timed? ?out|ETIMEDOUT|ECONN|ENOTFOUND|fetch failed|network|socket|rate limit|\b429\b|\b50[0-9]\b|temporar|try again|not ready/i.test(text);
}

/** Pure: what to do about social posts that are late, failed or stuck. */
export function planSocialRepairs(rows, { now = Date.now() } = {}) {
  const plan = { rerun: false, retry: [], problems: [] };
  for (const row of rows || []) {
    const due = Date.parse(row.scheduled_at);
    const where = `${row.platform}${row.account_id ? ` (${row.account_id})` : ''}`;
    if (row.status === 'scheduled' && due < now - LATE_AFTER) {
      plan.rerun = true;
    } else if (row.status === 'publishing' && Date.parse(row.updated_at || row.scheduled_at) < now - LATE_AFTER) {
      // It may have gone out before the run died. A duplicate is worse than asking.
      plan.problems.push(problem(`post_${row.id}`, 'A post may be stuck', 'broken', `The ${where} post due ${clock(row.scheduled_at)} started sending and never finished. It may or may not have gone out, so I did not resend it. Please check that channel.`, `ao_scheduled_posts ${row.id} stuck in 'publishing' since ${row.updated_at}.`));
    } else if (row.status === 'failed' && !row.external_id && due > now - DAY) {
      const tries = Number(row.intent?.bit_retries || 0);
      if (isPassingPostError(row.error_message) && tries < MAX_RETRIES) plan.retry.push({ ...row, tries });
      else {
        plan.problems.push(problem(`post_${row.id}`, 'A post did not go out', 'broken', `The ${where} post due ${clock(row.scheduled_at)} failed and I could not fix it. The reason given: ${String(row.error_message || 'none recorded').slice(0, 200)}`, `ao_scheduled_posts ${row.id} failed after ${tries} retries.`));
      }
    } else if (row.status === 'pending_review' && due > now && due < now + DAY) {
      plan.problems.push(problem(`review_${row.id}`, 'A post is waiting on you', 'warn', `The ${where} post due ${clock(row.scheduled_at)} is waiting for your approval and will not go out without it.`));
    } else if (row.status === 'scheduled' && due > now && due < now + DAY) {
      if (!String(row.text || row.caption || '').trim()) {
        plan.problems.push(problem(`post_${row.id}`, 'A post has no caption', 'broken', `The ${where} post due ${clock(row.scheduled_at)} has no caption.`, `ao_scheduled_posts ${row.id} has empty text.`));
      } else if (row.platform === 'instagram' && !row.image_url && !row.video_url) {
        plan.problems.push(problem(`post_${row.id}`, 'A post has no image', 'broken', `The ${where} post due ${clock(row.scheduled_at)} has no image, and Instagram will refuse it.`, `ao_scheduled_posts ${row.id} has no media.`));
      }
    }
  }
  return plan;
}

/** Pure: is this journal post ready? `booked` says its captions are in the queue. */
export function planJournalRepairs(draft, { booked = false, now = Date.now() } = {}) {
  const name = `"${draft.title || draft.slug}"`;
  const when = clock(draft.scheduled_publish_at);
  const needs = [];
  if (draft.status !== 'approved') needs.push('it has not been approved');
  if (!String(draft.content || '').trim()) needs.push('it has no text');
  if (!draft.image_url) needs.push('it has no header image');

  const hasApprovedCaptions = Boolean(draft.metadata?.approved_captions && Object.keys(draft.metadata.approved_captions).length);
  const bookCaptions = !booked && hasApprovedCaptions;
  if (!booked && !hasApprovedCaptions) needs.push('its captions have not been approved');

  const summary = String(draft.summary || '').trim();
  const fallback = summary ? null : summaryFromContent(draft.content || '');
  if (summary ? isTruncatedSummary(summary) : !fallback || isTruncatedSummary(fallback)) {
    const repaired = summaryFromContent(draft.content || '');
    if (!repaired || isTruncatedSummary(repaired)) needs.push('its summary is cut off and I could not build a clean one from the post');
  }

  const overdue = Date.parse(draft.scheduled_publish_at) < now - LATE_AFTER;
  return {
    bookCaptions,
    rerun: overdue && needs.length === 0,
    problems: needs.length
      ? [problem(`journal_${draft.id}`, overdue ? 'A post missed its time' : 'A post will miss its time', 'broken', `${name} ${overdue ? 'was due' : 'is due'} ${when} and ${overdue ? 'did not go live' : 'will not go live'} because ${needs.join(' and ')}.`, `ao_content_drafts ${draft.id} (${draft.slug}), status ${draft.status}.`)]
      : [],
  };
}

/** Pure: a published post that has not reached the site in time. */
export function notLiveProblem(draft, { live, now = Date.now() } = {}) {
  if (live || Date.parse(draft.published_at) > now - LIVE_WITHIN) return null;
  return problem(`live_${draft.id}`, 'A post did not reach the site', 'broken', `"${draft.title || draft.slug}" was published ${clock(draft.published_at)} but is not showing on the site yet. I have asked the engineer to look at it.`, `ao_content_drafts ${draft.slug} has published_at ${draft.published_at} but is missing from ${SITE()}/knowledge.json. Check the latest deployment.`);
}

/** Pure: what is new and what got better since the last run. */
export function guardChanges(previous, current) {
  const was = new Map((previous || []).filter((r) => r.status !== 'ok').map((r) => [r.key, r]));
  const now = new Set(current.map((c) => c.key));
  return {
    newlyWrong: current.filter((c) => !was.has(c.key)),
    fixed: [...was.values()].filter((r) => !now.has(r.key)),
  };
}

async function liveSlugs() {
  const res = await fetch(`${SITE()}/knowledge.json`, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`knowledge.json answered ${res.status}`);
  return res.text();
}

/**
 * One pass. The publishers and the email are passed in by tests; the live site
 * imports them only when they are needed.
 */
export async function runPostGuard({ now = Date.now(), notify = true } = {}) {
  const healed = [];
  const problems = [];
  const iso = (ms) => new Date(ms).toISOString();

  const { data: journals, error: journalError } = await contentDrafts()
    .select('id, slug, title, status, content, summary, image_url, metadata, scheduled_publish_at, published_at, created_by_email')
    .eq('kind', 'journal')
    .is('published_at', null)
    .neq('status', 'abandoned')
    .not('scheduled_publish_at', 'is', null)
    .lte('scheduled_publish_at', iso(now + DAY));
  if (journalError) throw new Error(journalError.message);

  let rerunJournals = false;
  for (const draft of journals || []) {
    const { data: rows } = await scheduledPosts()
      .select('platform, account_id, status')
      .eq('source_kind', 'journal_launch')
      .contains('intent', { journal_slug: draft.slug })
      .neq('status', 'failed');
    const { evaluatePublishCaptionsGate } = await import('../waypointGates.js');
    let booked = evaluatePublishCaptionsGate({ content: draft.content || '', slug: draft.slug }, rows || []).ok;
    const plan = planJournalRepairs(draft, { booked, now });
    if (plan.bookCaptions) {
      const { scheduleJournalLaunchCaptions } = await import('../scheduleJournalLaunchCaptions.js');
      const out = await scheduleJournalLaunchCaptions({ email: draft.created_by_email || null, slug: draft.slug, title: draft.title, captions: draft.metadata.approved_captions });
      if (out?.ok) {
        booked = true;
        healed.push(`Booked the captions you approved for "${draft.title}", which were not in the queue.`);
      } else {
        problems.push(problem(`journal_${draft.id}`, 'Captions could not be booked', 'broken', `I could not book the approved captions for "${draft.title}", due ${clock(draft.scheduled_publish_at)}. The reason given: ${String(out?.error || 'none').slice(0, 200)}`, `scheduleJournalLaunchCaptions failed for ${draft.slug}.`));
      }
    }
    problems.push(...plan.problems);
    if (plan.rerun && booked) rerunJournals = true;
  }

  if (rerunJournals) {
    const { publishDueScheduledJournals } = await import('../publishDueScheduledJournals.js');
    const out = await publishDueScheduledJournals({ limit: 20, nowIso: iso(now) });
    for (const r of out.results || []) {
      if (r.status === 'published') healed.push(`Published "${r.slug}", which had missed its time.`);
      else problems.push(problem(`journal_${r.id}`, 'A post missed its time', 'broken', `"${r.slug}" missed its time and I could not publish it. The reason given: ${String(r.reason || 'none').slice(0, 200)}`, `publishDueScheduledJournals: ${r.status} for ${r.slug}.`));
    }
  }

  const { data: posts, error: postError } = await scheduledPosts()
    .select('id, status, platform, account_id, scheduled_at, updated_at, text, caption, image_url, video_url, error_message, external_id, intent')
    .in('status', ['scheduled', 'publishing', 'failed', 'pending_review'])
    .gte('scheduled_at', iso(now - DAY))
    .lte('scheduled_at', iso(now + DAY));
  if (postError) throw new Error(postError.message);

  const social = planSocialRepairs(posts, { now });
  problems.push(...social.problems);
  for (const row of social.retry) {
    const out = await updateById(row.id, { status: 'scheduled', error_message: null, intent: { ...(row.intent || {}), bit_retries: row.tries + 1 }, updated_at: iso(now) });
    if (!out?.error) healed.push(`Retried the ${row.platform} post due ${clock(row.scheduled_at)}, which failed for a passing reason: ${String(row.error_message).slice(0, 120)}`);
  }
  if (social.rerun) {
    const { publishDuePosts } = await import('../../social/publish.js');
    const out = await publishDuePosts({ limit: 50 });
    if (out.posted) healed.push(`Sent ${out.posted} late post${out.posted === 1 ? '' : 's'} that the regular run had missed.`);
  }

  const { data: recent } = await contentDrafts()
    .select('id, slug, title, published_at')
    .eq('kind', 'journal')
    .eq('status', 'published')
    .gte('published_at', iso(now - 6 * HOUR));
  if (recent?.length) {
    const site = await liveSlugs();
    const missing = recent.map((d) => notLiveProblem(d, { live: site.includes(`"${d.slug}"`), now })).filter(Boolean);
    problems.push(...missing);
  }

  return settle({ problems, healed, now, notify });
}

async function settle({ problems, healed, now, notify }) {
  const stamp = new Date(now).toISOString();
  const { data: previous } = await supabaseAdmin.from('ao_bit_reports').select('key, label, status, detail, first_seen_at').like('key', 'guard\\_%');
  const unique = [...new Map(problems.map((p) => [p.key, p])).values()];
  const { newlyWrong, fixed } = guardChanges(previous, unique);
  const before = new Map((previous || []).map((r) => [r.key, r]));

  if (unique.length) {
    await supabaseAdmin.from('ao_bit_reports').upsert(
      unique.map((p) => ({ ...p, first_seen_at: before.get(p.key)?.status !== 'ok' && before.get(p.key)?.first_seen_at ? before.get(p.key).first_seen_at : stamp, resolved_at: null, last_checked_at: stamp })),
      { onConflict: 'key' }
    );
  }
  if (fixed.length) {
    await supabaseAdmin.from('ao_bit_reports').update({ status: 'ok', resolved_at: stamp, last_checked_at: stamp }).in('key', fixed.map((r) => r.key));
  }
  if (newlyWrong.some((p) => p.key.startsWith('guard_live_'))) {
    await supabaseAdmin.from('ao_bit_requests').insert({ note: newlyWrong.filter((p) => p.key.startsWith('guard_live_')).map((p) => p.for_claude).join('\n') });
  }
  for (const line of healed) {
    await logActivity({ action_type: 'bit_post_guard_healed', source: 'cron:post-guard', detail: { line } });
  }

  if (notify && (newlyWrong.length || fixed.length || healed.length)) {
    try {
      const [{ sendToBart }, { noticeHtml }] = await Promise.all([import('../../calendly/followups.js'), import('../../calendly/emailLayout.js')]);
      const lines = [
        ...newlyWrong.map((p) => `${p.status === 'broken' ? 'Needs attention' : 'Heads up'}: ${p.detail}`),
        ...healed.map((l) => `Fixed: ${l}`),
        ...fixed.map((r) => `Settled: ${r.detail}`),
      ];
      await sendToBart({
        subject: newlyWrong.length ? `Bit: ${newlyWrong[0].label}` : 'Bit: fixed a post problem',
        html: noticeHtml({ title: newlyWrong.length ? 'A post needs attention' : 'Fixed', lines, cta: { label: 'Ask Bit in Auto', url: `${SITE()}/ao/analyst` }, eyebrow: 'Auto · Bit' }),
      });
      if (newlyWrong.length) {
        await supabaseAdmin.from('ao_bit_reports').update({ notified_at: stamp }).in('key', newlyWrong.map((p) => p.key));
      }
    } catch (err) {
      console.warn('[post-guard] notify failed:', err?.message || err);
    }
  }

  return { ok: true, healed, problems: unique.map((p) => p.key), newly_wrong: newlyWrong.map((p) => p.key), fixed: fixed.map((r) => r.key) };
}
