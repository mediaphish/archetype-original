/**
 * A hard stop on the team's background work when a day's AI spend reaches
 * Bart's line (2026-10-28).
 *
 * Bart: "This spend needs to be locked down hard. I'm not spending $3k a
 * month for this team." Watching and warning (spend.js) was not enough: the
 * day's $46 came from teammates handing work to each other and reviewing it,
 * with Bart not in the loop. Once the last 24 hours reach the line, team
 * tasks and huddles wait. Bart's own messages are still answered, and he can
 * lift the stop for the day by saying so (a row in ao_bit_settings).
 */
import { DAILY_LINE, loadUsageSince, summarizeSpend } from './spend.js';

let cache = { at: 0, total: 0 };

/** Estimated dollars in the last 24 hours, read at most once a minute. */
export async function spentLast24h({ now = Date.now() } = {}) {
  if (now - cache.at < 60000) return cache.total;
  try {
    const rows = await loadUsageSince(new Date(now - 24 * 3600 * 1000).toISOString());
    cache = { at: now, total: summarizeSpend(rows).total };
  } catch {
    // Unknown spend never stops work; the warning checks still run.
    cache = { at: now, total: 0 };
  }
  return cache.total;
}

/** Pure: whether background work waits. */
export function shouldStop(total, { line = DAILY_LINE, liftedUntil = null, now = Date.now() } = {}) {
  if (liftedUntil && Date.parse(liftedUntil) > now) return false;
  return total >= line;
}

async function liftedUntil() {
  try {
    const { supabaseAdmin } = await import('../../supabase-admin.js');
    const { data } = await supabaseAdmin.from('ao_bit_settings').select('value').eq('key', 'spend_stop_lifted_until').maybeSingle();
    return data?.value?.until || null;
  } catch {
    return null;
  }
}

/** For the task engine and huddles: { stop, total }. */
export async function backgroundSpendStop() {
  const total = await spentLast24h();
  const stop = shouldStop(total, { liftedUntil: await liftedUntil() });
  return { stop, total, line: DAILY_LINE };
}

/** Pure: midnight tonight in Bart's time (US Central), as an ISO time. */
export function endOfBartDay(now = Date.now()) {
  const tz = process.env.AO_BART_TIMEZONE || 'America/Chicago';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date(now)).map((p) => [p.type, p.value])
  );
  const minutesIntoDay = (Number(parts.hour) % 24) * 60 + Number(parts.minute);
  return new Date(now + (24 * 60 - minutesIntoDay) * 60000 - (now % 60000)).toISOString();
}

/**
 * Bart lifts the stop for the rest of his day (2026-10-28 design; built
 * 2026-11-09 when the stop held up The Eli Archetype and the lift did not
 * exist yet). Only from Bart's own message, never from a teammate's task.
 */
export async function liftSpendStopForToday({ fromTeamTask = false, now = Date.now() } = {}) {
  if (fromTeamTask) return { ok: false, error: 'Only Bart can lift the spending stop, from his own message.' };
  const until = endOfBartDay(now);
  const { supabaseAdmin } = await import('../../supabase-admin.js');
  const { error } = await supabaseAdmin
    .from('ao_bit_settings')
    .upsert({ key: 'spend_stop_lifted_until', value: { until, lifted_at: new Date(now).toISOString() } }, { onConflict: 'key' });
  if (error) return { ok: false, error: error.message };
  const total = await spentLast24h({ now });
  return { ok: true, lifted_until: until, spent_last_24h: Math.round(total * 100) / 100, line: DAILY_LINE, note: 'Team work runs again until midnight tonight. The stop comes back on its own at midnight.' };
}
