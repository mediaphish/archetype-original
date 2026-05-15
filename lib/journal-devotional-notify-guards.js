import {
  calendarTodayPublicationTz,
  publicationTimeZone,
  publishDateCalendarOnly,
} from './publish-eligibility.mjs';

/** Kill switch: set DEVOTIONAL_NOTIFY_ENABLED=false on the host to stop all devotional mass mail. */
export function isDevotionalNotifyEnabled() {
  const v = String(process.env.DEVOTIONAL_NOTIFY_ENABLED ?? '').trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'off';
}

/** When CRON_SECRET is set, devotional notify requires Authorization: Bearer <secret>. */
export function checkDevotionalNotifyAuth(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: true };
  const auth = req.headers?.authorization;
  if (auth === `Bearer ${secret}`) return { ok: true };
  return { ok: false, status: 401, error: 'Unauthorized' };
}

/**
 * Mass devotional email only for publish_date === today (publication TZ).
 * Prevents re-blasting yesterday's devotional via retries or open notify calls.
 */
export function devotionalPublishDateGuard(publish_date, postData) {
  const pubDay =
    publishDateCalendarOnly(publish_date ?? postData?.date) || null;
  const todayStr = calendarTodayPublicationTz(new Date(), publicationTimeZone());
  if (!pubDay) {
    return { allowed: false, skip: 'missing_publish_date', pubDay: null, todayStr };
  }
  if (pubDay !== todayStr) {
    return {
      allowed: false,
      skip: 'not_todays_publish_date',
      pubDay,
      todayStr,
    };
  }
  return { allowed: true, pubDay, todayStr };
}
