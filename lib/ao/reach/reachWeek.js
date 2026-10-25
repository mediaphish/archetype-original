/**
 * Reach's view of a week: every piece going out, grouped by day, with its
 * channels and times, set against Bart's weekly rhythm. Gaps are named so Reach
 * can speak up while there is still time to write.
 */
import { scheduledPosts } from '../../db/scheduledPosts.js';
import { contentDrafts } from '../../db/contentDrafts.js';
import { getOwnerTimeZone } from '../ownerSchedule.js';
import { loadReachPlan, WEEKDAYS, KIND_NAMES, channelName } from './reachPlan.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar date (YYYY-MM-DD), weekday and HH:MM for an instant. */
export function localInfo(ms, timeZone = getOwnerTimeZone()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const hour = String(Number(get('hour')) % 24).padStart(2, '0');
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: String(get('weekday')).toLowerCase(),
    time: `${hour}:${get('minute')}`,
  };
}

/** The instant for a local date and HH:MM in the owner's time zone. */
export function localToUtc(date, time, timeZone = getOwnerTimeZone()) {
  const [y, m, d] = String(date).split('-').map(Number);
  const [hh, mm] = String(time).split(':').map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return NaN;
  let guess = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes settle the zone offset, daylight saving included.
  for (let i = 0; i < 2; i += 1) {
    const li = localInfo(guess, timeZone);
    const [ly, lm, ld] = li.date.split('-').map(Number);
    const [lh, lmin] = li.time.split(':').map(Number);
    const shown = Date.UTC(ly, lm - 1, ld, lh, lmin);
    guess += Date.UTC(y, m - 1, d, hh, mm) - shown;
  }
  return guess;
}

/** Monday (local) of the week containing `ms`, as YYYY-MM-DD. */
export function mondayOf(ms, timeZone = getOwnerTimeZone()) {
  let t = ms;
  for (let i = 0; i < 7; i += 1) {
    if (localInfo(t, timeZone).weekday === 'monday') return localInfo(t, timeZone).date;
    t -= DAY_MS;
  }
  return localInfo(ms, timeZone).date;
}

function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Which lane an entry belongs to: the Archetype series or business and leadership. */
export function entryLane(draft = {}) {
  const hay = `${draft.slug || ''} ${draft.title || ''} ${draft.series_slug || ''}`.toLowerCase();
  if (/archetype/.test(hay)) return 'archetype_entry';
  return 'leadership_entry';
}

/** Group key for one piece of content going out on one day. */
export function pieceKey(row, date) {
  const i = row.intent || {};
  const ref =
    i.infographic_id || i.journal_slug || i.slug || row.source_quote_id || row.source_idea_id || row.quote_queue_id || '';
  return `${date}|${row.source_kind || 'post'}|${ref || row.id}`;
}

/** The entry a post points back to, for naming it and telling which lane it is. */
function pieceSlug(row) {
  const i = row.intent || {};
  return i.journal_slug || i.slug || i.source_slug || null;
}

/**
 * Pure: shape rows and entries into Reach's week.
 * @param {{ start: string, posts: object[], entries: object[], unscheduled: object[], plan: object, timeZone?: string }} args
 */
export function shapeWeek({ start, posts = [], entries = [], unscheduled = [], plan, timeZone = getOwnerTimeZone() }) {
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(start, i);
    days.push({ date, weekday: WEEKDAYS[i], focus: plan.days[WEEKDAYS[i]]?.focus || null, expects: plan.days[WEEKDAYS[i]]?.expects || null, entries: [], pieces: [], notes: [] });
  }
  const byDate = new Map(days.map((d) => [d.date, d]));

  for (const e of entries) {
    const ms = Date.parse(e.scheduled_publish_at || e.published_at);
    if (!Number.isFinite(ms)) continue;
    const li = localInfo(ms, timeZone);
    const day = byDate.get(li.date);
    if (!day) continue;
    day.entries.push({ slug: e.slug, title: e.title, lane: entryLane(e), status: e.published_at ? 'published' : e.status, time: li.time });
  }

  const pieces = new Map();
  for (const r of posts) {
    const ms = Date.parse(r.scheduled_at);
    if (!Number.isFinite(ms)) continue;
    const li = localInfo(ms, timeZone);
    const day = byDate.get(li.date);
    if (!day) continue;
    const key = pieceKey(r, li.date);
    if (!pieces.has(key)) {
      const p = {
        kind: KIND_NAMES[r.source_kind] || r.source_kind || 'Post',
        source_kind: r.source_kind || null,
        slug: pieceSlug(r),
        title: r.intent?.title || r.intent?.pull_quote || null,
        status: r.status,
        channels: [],
      };
      pieces.set(key, p);
      day.pieces.push(p);
    }
    pieces.get(key).channels.push({ id: r.id, channel: channelName(r.platform, r.account_id), time: li.time, status: r.status });
  }
  for (const d of days) {
    d.pieces.sort((a, b) => (a.channels[0]?.time || '').localeCompare(b.channels[0]?.time || ''));
    for (const p of d.pieces) p.channels.sort((a, b) => a.time.localeCompare(b.time));
  }

  // Gaps against the rhythm, so Reach can say so while there is time to write.
  const gaps = [];
  for (const d of days) {
    if (d.expects === 'archetype_entry' || d.expects === 'leadership_entry') {
      // An entry Bart wrote by hand has no draft row, but its launch posts show it.
      const has =
        d.entries.some((e) => e.lane === d.expects) ||
        d.pieces.some((p) => p.source_kind === 'journal_launch' && entryLane({ slug: p.slug, title: p.title }) === d.expects);
      if (!has) gaps.push({ date: d.date, weekday: d.weekday, missing: d.expects === 'archetype_entry' ? 'Archetype series entry' : 'Business and leadership entry' });
      for (const e of d.entries) {
        if (e.lane !== d.expects) d.notes.push(`"${e.title}" is on ${d.weekday}, which is set aside for the ${d.focus}.`);
      }
    }
    if (d.expects !== 'resurface' && d.pieces.some((p) => p.source_kind === 'ao_journal_reshare')) {
      d.notes.push(`A resurface goes out on ${d.weekday}; the rhythm keeps resurfaces for ${WEEKDAYS.filter((w) => plan.days[w]?.expects === 'resurface').join(' and ') || 'no set day'}.`);
    }
    if (d.expects === 'resurface') {
      const has = d.pieces.some((p) => p.source_kind === 'ao_journal_reshare');
      if (!has) gaps.push({ date: d.date, weekday: d.weekday, missing: 'Resurface' });
    }
    if ((d.weekday === 'saturday' || d.weekday === 'sunday') && d.pieces.length === 0 && d.entries.length === 0) continue;
  }

  return {
    week_of: start,
    time_zone: timeZone,
    rhythm: Object.fromEntries(WEEKDAYS.map((w) => [w, plan.days[w]?.focus || null])),
    days: days.filter((d) => !(['saturday', 'sunday'].includes(d.weekday) && d.pieces.length === 0 && d.entries.length === 0)),
    gaps,
    ready_not_scheduled: unscheduled.map((u) => ({ slug: u.slug, title: u.title, lane: entryLane(u), status: u.status })),
  };
}

/**
 * Load and shape a week. `week` is 'this', 'next', or a YYYY-MM-DD date inside it.
 */
export async function getReachWeek({ week = 'this' } = {}) {
  const timeZone = getOwnerTimeZone();
  const now = Date.now();
  // On a weekend, "this week" is the one about to start.
  const weekend = ['saturday', 'sunday'].includes(localInfo(now, timeZone).weekday);
  let anchor = weekend ? now + 2 * DAY_MS : now;
  if (week === 'next') anchor += 7 * DAY_MS;
  else if (/^\d{4}-\d{2}-\d{2}$/.test(String(week))) anchor = localToUtc(week, '12:00', timeZone);
  const start = mondayOf(anchor, timeZone);
  const from = new Date(localToUtc(start, '00:00', timeZone)).toISOString();
  const to = new Date(localToUtc(addDays(start, 7), '00:00', timeZone)).toISOString();

  const { plan } = await loadReachPlan();
  const [postsRes, entriesRes, unscheduledRes] = await Promise.all([
    scheduledPosts()
      .select('id, platform, account_id, scheduled_at, status, source_kind, intent, source_quote_id, source_idea_id, quote_queue_id')
      .in('status', ['scheduled', 'pending_review', 'posted'])
      .gte('scheduled_at', from)
      .lt('scheduled_at', to)
      .order('scheduled_at', { ascending: true }),
    contentDrafts()
      .select('slug, title, status, series_slug, scheduled_publish_at, published_at')
      .eq('kind', 'journal')
      .or(`and(scheduled_publish_at.gte.${from},scheduled_publish_at.lt.${to}),and(published_at.gte.${from},published_at.lt.${to})`),
    contentDrafts()
      .select('slug, title, status, series_slug')
      .eq('kind', 'journal')
      .eq('status', 'approved')
      .is('published_at', null)
      .is('scheduled_publish_at', null)
      .limit(20),
  ]);
  if (postsRes.error) return { ok: false, error: postsRes.error.message };

  return {
    ok: true,
    ...shapeWeek({
      start,
      posts: postsRes.data || [],
      entries: entriesRes.data || [],
      unscheduled: unscheduledRes.data || [],
      plan,
      timeZone,
    }),
  };
}
