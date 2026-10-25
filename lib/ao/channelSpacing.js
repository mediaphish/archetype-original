/**
 * Keeps automatic posts from landing on top of each other on one account.
 *
 * Bart, 2026-10-25, on the schedule feeling like a shotgun: every kind of post
 * (journal launch, pull quotes, infographics, reshares, quote cards) picked its
 * own time without looking at the others, so Monday 10:30 put a journal launch
 * and a pull quote on LinkedIn in the same minute. He does not mind several
 * posts a day on a channel; he minds them piling up.
 *
 * The rule: on one account (platform + account_id), automatic posts sit at
 * least MIN_GAP apart. A later post moves later the same day, inside posting
 * hours, or to the next weekday morning when the day is full. A journal launch
 * is the anchor of its day: it never moves, and automatic posts in its way move
 * instead. Times Bart sets himself never go through this.
 */
import { getOwnerTimeZone } from './ownerSchedule.js';

export const MIN_GAP_MS = 2 * 60 * 60 * 1000;
const STEP_MS = 30 * 60 * 1000;
/** Posting hours in Bart's time zone: automatic posts start between 8:00 and 17:30. */
const DAY_START_MIN = 8 * 60;
const DAY_END_MIN = 17 * 60 + 30;
const MORNING_MIN = 9 * 60 + 30;

/** Kinds that are scheduled automatically and may be moved to make room. */
export const AUTOMATIC_KINDS = [
  'auto_quote_card',
  'weekly_pull_bundle',
  'infographic',
  'ao_journal_reshare',
];
/** The anchor of its day. Never moved; others move out of its way. */
export const ANCHOR_KINDS = ['journal_launch'];

export function accountKey(row) {
  return `${String(row?.platform || '').toLowerCase()}|${String(row?.account_id || '')}`;
}

function localParts(ms, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const hour = Number(get('hour')) % 24;
  return { weekday: get('weekday'), minutes: hour * 60 + Number(get('minute')) };
}

/** Move forward to the next weekday at MORNING_MIN local time. */
function nextWeekdayMorning(ms, timeZone) {
  let t = ms;
  // Step to the next local day, then walk to the morning slot.
  const { minutes } = localParts(t, timeZone);
  t += (24 * 60 - minutes) * 60 * 1000;
  for (let i = 0; i < 8; i += 1) {
    const { weekday } = localParts(t, timeZone);
    if (weekday !== 'Sat' && weekday !== 'Sun') break;
    t += 24 * 60 * 60 * 1000;
  }
  const { minutes: m } = localParts(t, timeZone);
  return t + (MORNING_MIN - m) * 60 * 1000;
}

function inHours(ms, timeZone) {
  const { minutes } = localParts(ms, timeZone);
  return minutes >= DAY_START_MIN && minutes <= DAY_END_MIN;
}

function clashes(ms, taken, gap) {
  return taken.some((t) => Math.abs(t - ms) < gap);
}

/**
 * The first time at or after `ms` that is clear of every time in `taken`.
 * @param {number} ms
 * @param {number[]} taken
 */
export function firstOpenTime(ms, taken, { gap = MIN_GAP_MS, timeZone = getOwnerTimeZone() } = {}) {
  let t = ms;
  for (let i = 0; i < 400; i += 1) {
    if (!clashes(t, taken, gap) && inHours(t, timeZone)) return t;
    const next = t + STEP_MS;
    t = inHours(next, timeZone) ? next : nextWeekdayMorning(t, timeZone);
  }
  return ms;
}

/**
 * Spread rows (in place order) against what is already scheduled.
 * Pure: returns new rows and the existing rows that must move.
 *
 * @param {object[]} rows  rows about to be scheduled (platform, account_id, scheduled_at, source_kind)
 * @param {object[]} existing  scheduled rows already on the calendar (id, platform, account_id, scheduled_at, source_kind)
 * @returns {{ rows: object[], moves: { id: string, scheduled_at: string }[] }}
 */
export function spreadRows(rows, existing = [], opts = {}) {
  const gap = opts.gap || MIN_GAP_MS;
  const timeZone = opts.timeZone || getOwnerTimeZone();
  const byKey = new Map();
  const add = (key, entry) => {
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(entry);
  };
  for (const e of existing) {
    const ms = Date.parse(e.scheduled_at);
    if (Number.isFinite(ms)) add(accountKey(e), { id: e.id, ms, kind: e.source_kind });
  }

  const out = rows.map((r) => ({ ...r }));
  const moves = [];

  // Anchors first: they keep their time, and automatic posts in the way move.
  out.forEach((r) => {
    if (!ANCHOR_KINDS.includes(r.source_kind)) return;
    const ms = Date.parse(r.scheduled_at);
    if (!Number.isFinite(ms)) return;
    const key = accountKey(r);
    const list = byKey.get(key) || [];
    for (const e of list) {
      if (!e.id || !AUTOMATIC_KINDS.includes(e.kind)) continue;
      if (Math.abs(e.ms - ms) >= gap) continue;
      const others = list.filter((x) => x !== e).map((x) => x.ms).concat(ms);
      e.ms = firstOpenTime(Math.max(e.ms, ms + gap), others, { gap, timeZone });
      moves.push({ id: e.id, scheduled_at: new Date(e.ms).toISOString() });
    }
    add(key, { id: null, ms, kind: r.source_kind });
  });

  // Then everything else, in order, against the calendar and each other.
  out.forEach((r) => {
    if (ANCHOR_KINDS.includes(r.source_kind)) return;
    const ms = Date.parse(r.scheduled_at);
    if (!Number.isFinite(ms)) return;
    const key = accountKey(r);
    const taken = (byKey.get(key) || []).map((x) => x.ms);
    const at = firstOpenTime(ms, taken, { gap, timeZone });
    r.scheduled_at = new Date(at).toISOString();
    add(key, { id: null, ms: at, kind: r.source_kind });
  });

  return { rows: out, moves };
}
