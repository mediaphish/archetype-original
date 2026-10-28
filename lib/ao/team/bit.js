/**
 * Bit, the IT teammate: watches that everything is connected and working.
 *
 * Bart, 2026-10-27: "An IT role that would only monitor setup and
 * functionality. Anytime something is broken or disconnected it would create
 * a report and either share it directly with you or with me to share with
 * you." And: "Can you imagine the value if these AI's could talk to you? ...
 * We could be building a self healing platform."
 *
 * The same day showed why: seven quick checks had failed for weeks without a
 * word, and a caption check read shortened copies and refused approved work.
 * Every failure was silent until Bart hit it.
 *
 * Each check returns what Bart needs to know in plain words and what Claude
 * (the engineer who maintains the platform) needs to fix it. Results live in
 * ao_bit_reports, one row per check. A check that newly breaks emails Bart
 * once; a fixed one says so. Bit never changes anything himself.
 */
import { supabaseAdmin } from '../../supabase-admin.js';
import { scheduledPosts } from '../../db/scheduledPosts.js';
import { contentDrafts } from '../../db/contentDrafts.js';

const DAY = 86400000;
const SITE = () => process.env.SITE_URL || 'https://www.archetypeoriginal.com';

const ok = (key, label, detail) => ({ key, label, status: 'ok', detail, for_claude: null });
const warn = (key, label, detail, forClaude) => ({ key, label, status: 'warn', detail, for_claude: forClaude });
const broken = (key, label, detail, forClaude) => ({ key, label, status: 'broken', detail, for_claude: forClaude });

/** Pure: a connection that runs out on a date. */
export function expiryCheck(key, label, expiresAt, { now = Date.now(), reconnect = 'Settings' } = {}) {
  if (!expiresAt) return warn(key, label, `${label}: no expiry date is on record, so I cannot tell when it runs out.`, `No expires_at on the stored token for ${key}.`);
  const days = Math.floor((Date.parse(expiresAt) - now) / DAY);
  if (Number.isNaN(days)) return warn(key, label, `${label}: the expiry date on record is unreadable.`, `Unparseable expires_at "${expiresAt}" for ${key}.`);
  if (days < 0) return broken(key, label, `${label} is disconnected: it ran out ${-days} day${days === -1 ? '' : 's'} ago. Reconnect it in ${reconnect}.`, `Token for ${key} expired at ${expiresAt}. Needs Bart to reconnect (OAuth); nothing to fix in code unless the refresh path failed.`);
  if (days <= 14) return warn(key, label, `${label} runs out in ${days} day${days === 1 ? '' : 's'} (${String(expiresAt).slice(0, 10)}). Reconnect it in ${reconnect} before then.`, `Token for ${key} expires ${expiresAt}.`);
  return ok(key, label, `${label} is connected, good until ${String(expiresAt).slice(0, 10)}.`);
}

/** Pure: posts that should have gone out and did not. */
export function stuckPostsCheck(rows, { now = Date.now() } = {}) {
  const late = (rows || []).filter((r) => r.status === 'scheduled' && Date.parse(r.scheduled_at) < now - 45 * 60000);
  if (!late.length) return ok('posts_on_time', 'Scheduled posts', 'Every scheduled post went out on time.');
  return broken(
    'posts_on_time',
    'Scheduled posts',
    `${late.length} scheduled post${late.length === 1 ? '' : 's'} should have gone out and did not (the oldest was due ${String(late[late.length - 1].scheduled_at).slice(0, 16).replace('T', ' ')} UTC).`,
    `ao_scheduled_posts rows still 'scheduled' 45+ minutes past scheduled_at: ${late.slice(0, 10).map((r) => `${r.id} (${r.platform}, ${r.scheduled_at})`).join('; ')}. Check the publish-scheduled-posts cron and its logs.`
  );
}

/** Pure: posts that tried and failed this week. */
export function failedPostsCheck(rows, { now = Date.now() } = {}) {
  const failed = (rows || []).filter((r) => r.status === 'failed' && Date.parse(r.updated_at || r.scheduled_at) > now - 7 * DAY);
  if (!failed.length) return ok('posts_failed', 'Failed posts', 'No post failed this week.');
  const reasons = [...new Set(failed.map((r) => String(r.error_message || 'no reason recorded').slice(0, 160)))];
  return broken(
    'posts_failed',
    'Failed posts',
    `${failed.length} post${failed.length === 1 ? '' : 's'} failed to go out this week.`,
    `Failed ao_scheduled_posts in the last 7 days: ${failed.slice(0, 10).map((r) => `${r.id} (${r.platform})`).join('; ')}. Errors: ${reasons.join(' | ')}`
  );
}

/** Pure: journal posts whose publish time passed without publishing. */
export function overdueJournalsCheck(rows, { now = Date.now() } = {}) {
  const late = (rows || []).filter((d) => d.scheduled_publish_at && !d.published_at && Date.parse(d.scheduled_publish_at) < now - 45 * 60000);
  if (!late.length) return ok('journals_on_time', 'Journal publishing', 'Every journal post due so far went live.');
  return broken(
    'journals_on_time',
    'Journal publishing',
    `${late.map((d) => `"${d.title || d.slug}"`).join(', ')} should be live by now and ${late.length === 1 ? 'is' : 'are'} not.`,
    `ao_content_drafts journal rows past scheduled_publish_at with no published_at: ${late.map((d) => `${d.slug} (${d.scheduled_publish_at}, status ${d.status})`).join('; ')}. Check publish-scheduled-journals; it skips incomplete drafts and logs why.`
  );
}

/** Pure: team work that stopped moving. */
export function stuckTasksCheck(rows, { now = Date.now() } = {}) {
  const stuck = (rows || []).filter((t) => t.status === 'running' && Date.parse(t.heartbeat_at || t.updated_at) < now - 30 * 60000);
  if (!stuck.length) return ok('team_tasks', 'Team work', 'No team work is stuck.');
  return warn(
    'team_tasks',
    'Team work',
    `${stuck.length} piece${stuck.length === 1 ? '' : 's'} of team work stopped moving: ${stuck.map((t) => t.title).slice(0, 3).join('; ')}.`,
    `ao_team_tasks running with heartbeat older than 30 min: ${stuck.map((t) => t.id).join(', ')}. Check /api/ao/team/run.`
  );
}

async function safeCheck(key, label, fn) {
  try {
    return await fn();
  } catch (err) {
    return warn(key, label, `${label}: I could not run this check.`, `Check ${key} threw: ${err?.message || err}`);
  }
}

/** Every check, now. Never throws. */
export async function runChecks({ now = Date.now() } = {}) {
  const checks = [];

  checks.push(await safeCheck('linkedin', 'LinkedIn (personal)', async () => {
    const { data } = await supabaseAdmin.from('ao_linkedin_tokens').select('expires_at').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (!data) return broken('linkedin', 'LinkedIn (personal)', 'LinkedIn (personal) is not connected.', 'No row in ao_linkedin_tokens.');
    return expiryCheck('linkedin', 'LinkedIn (personal)', data.expires_at, { now });
  }));

  checks.push(await safeCheck('meta', 'Facebook and Instagram (company)', async () => {
    const { data } = await supabaseAdmin.from('ao_meta_tokens').select('page_access_token, user_expires_at, facebook_page_name').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (!data?.page_access_token) return broken('meta', 'Facebook and Instagram (company)', 'The Facebook Page and company Instagram are not connected.', 'No page_access_token in ao_meta_tokens.');
    // Ask Facebook itself: a page token can be revoked long before any date says so.
    const res = await fetch(`https://graph.facebook.com/v25.0/me?fields=id,name&access_token=${encodeURIComponent(data.page_access_token)}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return broken('meta', 'Facebook and Instagram (company)', 'Facebook refused the connection for the Page and company Instagram. Reconnect Facebook in Settings.', `Graph /me with the page token returned ${res.status}: ${body?.error?.message || 'no message'}.`);
    }
    return ok('meta', 'Facebook and Instagram (company)', `The ${data.facebook_page_name ? `${data.facebook_page_name} Facebook Page` : "Facebook Page"} and company Instagram are connected, and Facebook confirms it.`);
  }));

  checks.push(await safeCheck('instagram_personal', 'Instagram (personal)', async () => {
    const { data } = await supabaseAdmin.from('ao_instagram_login_tokens').select('expires_at, instagram_username').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (!data) return broken('instagram_personal', 'Instagram (personal)', 'Your personal Instagram is not connected.', 'No row in ao_instagram_login_tokens.');
    return expiryCheck('instagram_personal', 'Instagram (personal)', data.expires_at, { now });
  }));

  checks.push(await safeCheck('x', 'X', async () => {
    const { data } = await supabaseAdmin.from('ao_x_tokens').select('expires_at, refresh_token, username').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (!data) return broken('x', 'X', 'X is not connected.', 'No row in ao_x_tokens.');
    // X tokens last two hours and renew themselves; only a missing renewal key is a problem.
    if (data.refresh_token) return ok('x', 'X', 'X is connected and renews itself.');
    return expiryCheck('x', 'X', data.expires_at, { now });
  }));

  checks.push(await safeCheck('ai_text', 'The team\'s thinking (Claude)', async () => {
    const { completeText } = await import('../textModel.js');
    const [quick, main] = await Promise.all([
      completeText({ prompt: 'Reply with the single word: ready', task: 'classify', maxTokens: 20 }),
      completeText({ prompt: 'Reply with the single word: ready', task: 'analysis', maxTokens: 20 }),
    ]);
    if (/ready/i.test(quick) && /ready/i.test(main)) return ok('ai_text', 'The team\'s thinking (Claude)', 'The team\'s writing and quick checks both answer.');
    return broken('ai_text', 'The team\'s thinking (Claude)', 'Part of the team\'s thinking is not answering, so some checks are quietly falling back to defaults.', `textModel test: classify="${quick}", analysis="${main}". An empty reply means the call failed; see [textModel] in the logs (key, model name or a rejected parameter).`);
  }));

  checks.push(await safeCheck('ai_images', 'Image making (OpenAI)', async () => {
    if (process.env.OPENAI_API_KEY) return ok('ai_images', 'Image making (OpenAI)', 'Image making is set up.');
    return broken('ai_images', 'Image making (OpenAI)', 'Image making is not set up, so Des cannot make images.', 'OPENAI_API_KEY is missing in the environment.');
  }));

  checks.push(await safeCheck('posts_on_time', 'Scheduled posts', async () => {
    const { data, error } = await scheduledPosts().select('id, status, platform, scheduled_at').eq('status', 'scheduled').lt('scheduled_at', new Date(now - 45 * 60000).toISOString()).order('scheduled_at', { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return stuckPostsCheck(data, { now });
  }));

  checks.push(await safeCheck('posts_failed', 'Failed posts', async () => {
    const { data, error } = await scheduledPosts().select('id, status, platform, scheduled_at, updated_at, error_message').eq('status', 'failed').gte('updated_at', new Date(now - 7 * DAY).toISOString()).limit(50);
    if (error) throw new Error(error.message);
    return failedPostsCheck(data, { now });
  }));

  checks.push(await safeCheck('journals_on_time', 'Journal publishing', async () => {
    const { data, error } = await contentDrafts().select('slug, title, status, scheduled_publish_at, published_at').eq('kind', 'journal').not('scheduled_publish_at', 'is', null).is('published_at', null).lt('scheduled_publish_at', new Date(now - 45 * 60000).toISOString()).neq('status', 'abandoned').limit(20);
    if (error) throw new Error(error.message);
    return overdueJournalsCheck(data, { now });
  }));

  checks.push(await safeCheck('team_tasks', 'Team work', async () => {
    const { data, error } = await supabaseAdmin.from('ao_team_tasks').select('id, title, status, heartbeat_at, updated_at').eq('status', 'running').limit(20);
    if (error) throw new Error(error.message);
    return stuckTasksCheck(data, { now });
  }));

  return checks;
}

/** Pure: which checks changed in a way Bart should hear about. */
export function changesWorthTelling(previous, current) {
  const before = new Map((previous || []).map((r) => [r.key, r]));
  const newlyWrong = [];
  const fixed = [];
  for (const c of current) {
    const p = before.get(c.key);
    if (c.status !== 'ok' && (!p || p.status === 'ok' || (p.status === 'warn' && c.status === 'broken'))) newlyWrong.push(c);
    if (c.status === 'ok' && p && p.status !== 'ok') fixed.push(c);
  }
  return { newlyWrong, fixed };
}

/**
 * Run every check, save the results, and email Bart about anything that newly
 * broke or got fixed. Returns the checks for the chat to report.
 */
export async function runBit({ notify = true, now = Date.now() } = {}) {
  const checks = await runChecks({ now });
  const { data: previous } = await supabaseAdmin.from('ao_bit_reports').select('key, status, first_seen_at');
  const prevByKey = new Map((previous || []).map((r) => [r.key, r]));
  const stamp = new Date(now).toISOString();
  const rows = checks.map((c) => {
    const p = prevByKey.get(c.key);
    const wrong = c.status !== 'ok';
    return {
      key: c.key,
      label: c.label,
      status: c.status,
      detail: c.detail,
      for_claude: c.for_claude,
      first_seen_at: wrong ? (p && p.status !== 'ok' ? p.first_seen_at : stamp) : null,
      resolved_at: !wrong && p && p.status !== 'ok' ? stamp : null,
      last_checked_at: stamp,
    };
  });
  await supabaseAdmin.from('ao_bit_reports').upsert(rows, { onConflict: 'key' });

  const { newlyWrong, fixed } = changesWorthTelling(previous, checks);
  if (notify && (newlyWrong.length || fixed.length)) {
    try {
      const [{ sendToBart }, { noticeHtml }] = await Promise.all([import('../../calendly/followups.js'), import('../../calendly/emailLayout.js')]);
      const lines = [
        ...newlyWrong.map((c) => `${c.status === 'broken' ? 'Broken' : 'Heads up'}: ${c.detail}`),
        ...fixed.map((c) => `Working again: ${c.detail}`),
      ];
      await sendToBart({
        subject: newlyWrong.length ? `Bit: ${newlyWrong.length === 1 ? newlyWrong[0].label : `${newlyWrong.length} things`} need attention` : 'Bit: back to working',
        html: noticeHtml({ title: newlyWrong.length ? 'Something needs attention' : 'Fixed', lines, cta: { label: 'Ask Bit in Auto', url: `${SITE()}/ao/analyst` }, eyebrow: 'Auto · Bit' }),
      });
      await supabaseAdmin.from('ao_bit_reports').update({ notified_at: stamp }).in('key', [...newlyWrong, ...fixed].map((c) => c.key));
    } catch (err) {
      console.warn('[bit] notify failed:', err?.message || err);
    }
  }
  return { ok: true, checked_at: stamp, checks, newly_wrong: newlyWrong.map((c) => c.key), fixed: fixed.map((c) => c.key) };
}

/** What is open right now, for Claude's daily repair pass. */
export async function openReports() {
  const { data } = await supabaseAdmin.from('ao_bit_reports').select('*').neq('status', 'ok').order('first_seen_at', { ascending: true });
  return data || [];
}

/**
 * Bart asking Bit to send the engineer a report now, outside the daily pass.
 * Bart, 2026-10-27: "I want the ability to tell Bit to send you a report
 * outside of the schedule." Bit runs a fresh check and leaves a request; a
 * scheduled task on Bart's Mac looks every 15 minutes and starts the repair
 * pass when one is waiting (scripts/bit-repair.mjs pending).
 */
export async function requestEngineer({ note = '', threadId = null } = {}) {
  const result = await runBit({ notify: false });
  const { data: waiting } = await supabaseAdmin.from('ao_bit_requests').select('id').in('status', ['pending', 'picked']).limit(1);
  if (waiting?.length) {
    // One request at a time: add Bart's words to the one already waiting.
    if (note) {
      const { data: row } = await supabaseAdmin.from('ao_bit_requests').select('note').eq('id', waiting[0].id).maybeSingle();
      await supabaseAdmin.from('ao_bit_requests').update({ note: [row?.note, note].filter(Boolean).join('\n\n') }).eq('id', waiting[0].id);
    }
  } else {
    const { error } = await supabaseAdmin.from('ao_bit_requests').insert({ note: String(note || '').slice(0, 4000) || null, thread_id: threadId || null });
    if (error) return { ok: false, error: error.message };
  }
  const notOk = result.checks.filter((c) => c.status !== 'ok');
  return {
    ok: true,
    sent: true,
    already_waiting: Boolean(waiting?.length),
    not_ok: notOk.map((c) => ({ label: c.label, status: c.status, detail: c.detail })),
    message:
      'The report is on its way to the engineer. It is picked up within about 15 minutes while Bart\'s Mac is on with the Claude app open, and the result comes back to Bart by email and in #team. Tell Bart that in one line, plus anything the fresh check found.',
  };
}

export async function pendingRequests() {
  const { data } = await supabaseAdmin.from('ao_bit_requests').select('*').in('status', ['pending', 'picked']).order('requested_at', { ascending: true });
  return data || [];
}

export async function markRequest(id, status, outcome = null) {
  const now = new Date().toISOString();
  const patch = status === 'picked' ? { status, picked_at: now } : { status: 'done', done_at: now, outcome: outcome ? String(outcome).slice(0, 4000) : null };
  const { error } = await supabaseAdmin.from('ao_bit_requests').update(patch).eq('id', id);
  return { ok: !error, error: error?.message || null };
}
