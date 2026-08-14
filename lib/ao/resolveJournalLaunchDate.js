/**
 * Pure helpers for journal-launch caption dating (#128).
 * Kept free of DB imports so selftests can run without Supabase env.
 */
import { publishDateCalendarOnly } from '../publish-eligibility.mjs';

/** Refuse insert if computed launch drifts more than this from the draft's stored target. */
export const LAUNCH_DATE_DRIFT_MAX_DAYS = 14;

/**
 * Calendar YMD (America/Chicago) from a timestamptz / ISO string.
 * @param {string|null|undefined} iso
 * @returns {string|null} YYYY-MM-DD
 */
export function ymdFromScheduledPublishAt(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Resolve journal launch calendar date without touching the unrelated content queue.
 * @param {{
 *   slug: string,
 *   scheduledPublishAt?: string|null,
 *   readMarkdownPublishDate?: (slug: string) => string|null,
 * }} args
 */
export function resolveJournalLaunchPublishYmd({
  slug,
  scheduledPublishAt = null,
  readMarkdownPublishDate = () => null,
}) {
  const fromDb = ymdFromScheduledPublishAt(scheduledPublishAt);
  if (fromDb) {
    return {
      ok: true,
      publishYmd: fromDb,
      source: 'db',
      scheduledPublishAt: scheduledPublishAt || null,
    };
  }
  const fromMd = readMarkdownPublishDate(slug);
  const mdYmd = fromMd ? publishDateCalendarOnly(fromMd) || fromMd : null;
  if (mdYmd) {
    return {
      ok: true,
      publishYmd: mdYmd,
      source: 'markdown',
      scheduledPublishAt: null,
    };
  }
  return {
    ok: false,
    error:
      `No target publish date found for "${slug}". ` +
      'Set one first with schedule_journal_publish (or a publish_date in the journal markdown). ' +
      'Caption scheduling will not guess a date from unrelated posts in the queue.',
  };
}

/**
 * @param {Date} launchDate
 * @param {string|null} scheduledPublishAtIso
 */
export function assertLaunchDateNearTarget(launchDate, scheduledPublishAtIso) {
  if (!scheduledPublishAtIso || !launchDate) return { ok: true };
  const target = new Date(scheduledPublishAtIso);
  if (Number.isNaN(target.getTime())) return { ok: true };
  const driftMs = Math.abs(launchDate.getTime() - target.getTime());
  const driftDays = driftMs / (24 * 60 * 60 * 1000);
  if (driftDays > LAUNCH_DATE_DRIFT_MAX_DAYS) {
    return {
      ok: false,
      drift_days: Math.round(driftDays * 10) / 10,
      error:
        `Computed caption launch date (${launchDate.toISOString().slice(0, 10)}) is more than ` +
        `${LAUNCH_DATE_DRIFT_MAX_DAYS} days away from the draft's scheduled_publish_at ` +
        `(${scheduledPublishAtIso}). Refusing to schedule — fix the target date and try again.`,
    };
  }
  return { ok: true };
}
