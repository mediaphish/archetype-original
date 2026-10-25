/**
 * Move posts when Bart says so ("move Friday's resurface to Monday").
 * Bart's direction wins: no spacing rule is applied to a time he chose.
 */
import { scheduledPosts } from '../../db/scheduledPosts.js';
import { getOwnerTimeZone } from '../ownerSchedule.js';
import { localInfo, localToUtc } from './reachWeek.js';
import { channelName } from './reachPlan.js';

/**
 * @param {{ ids: string[], date?: string, time?: string }} input
 *   date YYYY-MM-DD keeps each post's own time of day; time HH:MM (Central) keeps
 *   each post's own date; both set both.
 */
export async function movePosts({ ids = [], date = null, time = null } = {}) {
  const list = (Array.isArray(ids) ? ids : [ids]).map(String).filter(Boolean);
  if (list.length === 0) return { ok: false, error: 'ids is required' };
  if (!date && !time) return { ok: false, error: 'date or time is required' };
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'date must be YYYY-MM-DD' };
  if (time && !/^\d{1,2}:\d{2}$/.test(time)) return { ok: false, error: 'time must be HH:MM, 24-hour, Central' };

  const timeZone = getOwnerTimeZone();
  const { data: rows, error } = await scheduledPosts()
    .select('id, platform, account_id, scheduled_at, status')
    .in('id', list);
  if (error) return { ok: false, error: error.message };

  const moved = [];
  const skipped = [];
  for (const r of rows || []) {
    if (!['scheduled', 'pending_review'].includes(r.status)) {
      skipped.push({ id: r.id, reason: `already ${r.status}` });
      continue;
    }
    const cur = Date.parse(r.scheduled_at);
    const li = Number.isFinite(cur) ? localInfo(cur, timeZone) : null;
    const d = date || li?.date;
    const t = time || li?.time;
    if (!d || !t) {
      skipped.push({ id: r.id, reason: 'no current date or time to keep; give both' });
      continue;
    }
    const at = localToUtc(d, t.padStart(5, '0'), timeZone);
    if (!Number.isFinite(at) || at < Date.now() + 5 * 60 * 1000) {
      skipped.push({ id: r.id, reason: 'that time is in the past' });
      continue;
    }
    const { error: upErr } = await scheduledPosts()
      .update({ scheduled_at: new Date(at).toISOString(), updated_at: new Date().toISOString() })
      .eq('id', r.id)
      .in('status', ['scheduled', 'pending_review']);
    if (upErr) {
      skipped.push({ id: r.id, reason: upErr.message });
      continue;
    }
    const nl = localInfo(at, timeZone);
    moved.push({ id: r.id, channel: channelName(r.platform, r.account_id), from: li ? `${li.date} ${li.time}` : null, to: `${nl.date} ${nl.time}` });
  }
  for (const id of list) {
    if (!(rows || []).some((r) => r.id === id)) skipped.push({ id, reason: 'not found' });
  }
  return { ok: moved.length > 0, moved, skipped, time_zone: timeZone };
}
