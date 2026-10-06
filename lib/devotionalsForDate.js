/**
 * Today's devotionals, read from the files themselves.
 *
 * 2026-10-04. Bart: "The secondary was to cover when the first didn't work. You
 * built it. Just make it work."
 *
 * The backup sender asked the site for a list of devotionals, and that list is a
 * file rebuilt by a scheduled job. The rebuild is set for 6:00am and the sender
 * runs at 6:20. Twenty minutes is not a margin: GitHub routinely runs scheduled
 * jobs late, by hours. On October 3 the rebuild landed at 11:28 and on October 4
 * at 12:09, both of them long after the sender had looked, found nothing, and
 * reported success. A backup that loses a race and calls it a clean result is
 * not a backup.
 *
 * A devotional's publish date is written in the devotional. Reading the files
 * removes the race entirely, because there is nothing left to wait for.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export const DEVOTIONALS_DIR = path.join('ao-knowledge-hq-kit', 'journal', 'devotionals');

/**
 * The generated schedule, which is the source this actually runs on.
 *
 * 2026-10-06. Reading the 302 markdown files was right in principle and failed
 * in practice: they were not bundled into the serverless function, so the
 * sender fell back to the stale list every morning and the fix changed nothing
 * for two days. This one small file is written by the build next to
 * knowledge.json, which is already proven to reach the functions, and unlike
 * the content list it deliberately carries future dates.
 */
export const SCHEDULE_FILE = path.join('public', 'devotional-schedule.json');

/**
 * Every published devotional for `calendarDate`, from the generated schedule.
 *
 * Returns null when the schedule cannot be read, which is different from it
 * holding nothing for today: the first means fall back, the second means there
 * is genuinely no devotional. Collapsing those two is what caused this.
 *
 * @param {string} calendarDate YYYY-MM-DD
 * @returns {Array<object>|null}
 */
export function devotionalsFromSchedule(calendarDate, { file = SCHEDULE_FILE } = {}) {
  const day = String(calendarDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;

  const absolute = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  } catch (_) {
    return null;
  }

  const all = Array.isArray(parsed?.devotionals) ? parsed.devotionals : null;
  if (!all) return null;

  return all
    .filter((d) => d && d.status === 'published' && String(d.publish_date || '') === day)
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));
}

/** A date in YYYY-MM-DD form, whatever shape it arrived in. */
function calendarDateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    // A bare YYYY-MM-DD in frontmatter is parsed as midnight UTC, so the UTC
    // date is the one the author wrote. Using local time here would move a
    // devotional to the previous day for anyone west of Greenwich.
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim().replace(/^["']|["']$/g, '');
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

/** The same summary the content list would have carried, built the same way. */
export function emailSummaryFrom(frontmatter, body) {
  let summary = String(frontmatter?.summary || '').trim();

  if (!summary && body) {
    const paragraphs = String(body)
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !p.startsWith('#'));
    if (paragraphs.length > 0) {
      const first = paragraphs[0];
      summary = first.length > 400 ? `${first.slice(0, 397).trim()}...` : first;
    } else {
      const trimmed = String(body).trim();
      summary = trimmed.length > 300 ? `${trimmed.slice(0, 297).trim()}...` : trimmed;
    }
  }

  return summary
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/>\s+/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Every published devotional whose publish date is `calendarDate`.
 *
 * Returns the same shape the content list gave the sender, so the rest of it
 * does not have to care where the devotionals came from. An unreadable folder
 * returns null rather than an empty array, because "I could not look" and
 * "I looked and there are none" are the difference between falling back and
 * sending nothing, and this whole problem came from treating them as the same.
 *
 * @param {string} calendarDate YYYY-MM-DD
 * @param {{ dir?: string }} [options]
 * @returns {Array<object>|null}
 */
export function devotionalsPublishedOn(calendarDate, { dir = DEVOTIONALS_DIR } = {}) {
  const day = calendarDateOnly(calendarDate);
  if (!day) return null;

  const absolute = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);

  let files;
  try {
    files = fs.readdirSync(absolute).filter((name) => name.endsWith('.md') && name !== 'TEMPLATE.md');
  } catch (_) {
    return null;
  }

  const found = [];
  for (const name of files) {
    let parsed;
    try {
      parsed = matter(fs.readFileSync(path.join(absolute, name), 'utf8'));
    } catch (_) {
      continue;
    }

    const fm = parsed.data || {};
    if (String(fm.status || '').trim() !== 'published') continue;

    const publishDate = calendarDateOnly(fm.publish_date) || calendarDateOnly(fm.date);
    if (publishDate !== day) continue;

    const title = String(fm.title || '').trim();
    const slug = String(fm.slug || name.replace(/\.md$/, '')).trim();
    if (!title || !slug) continue;

    found.push({
      title,
      slug,
      status: 'published',
      publish_date: publishDate,
      date: publishDate,
      summary: String(fm.summary || '').trim(),
      email_summary: emailSummaryFrom(fm, parsed.content),
      scripture_reference: String(fm.scripture_reference || '').trim(),
      source_file: name,
    });
  }

  return found.sort((a, b) => a.slug.localeCompare(b.slug));
}
