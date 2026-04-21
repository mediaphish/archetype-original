/**
 * Single definition of “public calendar day” vs publish_date for journal posts + devotionals.
 * Used by knowledge build, API, static generators, SPA client — must stay aligned for Auto /
 * scheduled long-form publishing.
 *
 * Default TZ: America/Chicago (override with PUBLICATION_TIME_ZONE env on Vercel/local).
 */

import { formatInTimeZone } from 'date-fns-tz';

/** @returns {string} YYYY-MM-DD calendar date in the publication timezone (“today” on the clock you ship by). */
export function calendarTodayPublicationTz(now = new Date(), timeZone = publicationTimeZone()) {
  return formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
}

/** Works in Node (scripts, Vercel API) and browser (Vite): same default TZ everywhere. */
export function publicationTimeZone() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLICATION_TIME_ZONE) {
    return String(import.meta.env.VITE_PUBLICATION_TIME_ZONE).trim();
  }
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.PUBLICATION_TIME_ZONE ||
      process.env.TZ_PUBLICATION ||
      'America/Chicago'
    ).trim();
  }
  return 'America/Chicago';
}

/** Normalize publish_date / date fields to YYYY-MM-DD or null if missing/unparsable. */
export function publishDateCalendarOnly(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).split('T')[0].split(' ')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function isJournalOrDevotionalDoc(doc) {
  const t = String(doc?.type || '').toLowerCase();
  return t === 'journal-post' || t === 'devotional';
}

/**
 * Journal + devotional with a dated schedule: eligible when publish_date calendar day ≤ “today” in publication TZ.
 * Entries with no recognizable date stay included (matches legacy corpus behavior).
 */
export function isEligibleForPublicSchedule(doc, now = new Date(), timeZone = publicationTimeZone()) {
  if (!isJournalOrDevotionalDoc(doc)) return true;
  const pub = publishDateCalendarOnly(doc.publish_date ?? doc.date);
  if (!pub) return true;
  const today = calendarTodayPublicationTz(now, timeZone);
  return pub <= today;
}

/** Defense-in-depth: strip any stray future-dated journal/devotional rows before writing knowledge.json / serving. */
export function filterPublishedScheduledDocs(docs, now = new Date(), timeZone = publicationTimeZone()) {
  if (!Array.isArray(docs)) return [];
  return docs.filter((d) => isEligibleForPublicSchedule(d, now, timeZone));
}

/** Markdown frontmatter (build-knowledge): skip file when publish_date is strictly after calendar today. */
export function shouldSkipFutureScheduledMarkdown(
  frontmatter,
  { isJournalOrDevotional, now = new Date(), timeZone = publicationTimeZone() } = {}
) {
  if (!isJournalOrDevotional) return false;
  const pub = publishDateCalendarOnly(frontmatter?.publish_date ?? frontmatter?.date);
  if (!pub) return false;
  const today = calendarTodayPublicationTz(now, timeZone);
  return pub > today;
}
