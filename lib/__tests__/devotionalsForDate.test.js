/**
 * @jest-environment node
 *
 * The backup that lost a race and called it success (2026-10-04).
 *
 * The 6:20am sender asked the site for a list of devotionals. That list is a
 * file a scheduled job rebuilds each morning, and a devotional only enters it
 * once a rebuild runs on its publish date. The rebuild is set for 6:00am.
 * Twenty minutes is not a margin: GitHub runs scheduled jobs late, routinely by
 * hours. On October 3 the rebuild landed at 11:28 and on October 4 at 12:09,
 * both long after the sender had looked, found nothing, and returned
 * "No devotionals published today".
 *
 * Bart: "The secondary was to cover when the first didn't work. You built it.
 * Just make it work."
 *
 * The publish date is written in the devotional, so the sender reads the files.
 */
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { devotionalsPublishedOn, emailSummaryFrom } from '../devotionalsForDate.js';

function makeDir(files) {
  const dir = mkdtempSync(join(tmpdir(), 'devos-'));
  for (const [name, contents] of Object.entries(files)) writeFileSync(join(dir, name), contents);
  return dir;
}

const published = (date, slug, extra = '') => `---
title: "A Devotional"
slug: ${slug}
date: "${date}"
type: devotional
status: published
publish_date: "${date}"
scripture_reference: "Psalm 1:1 (ESV)"
${extra}---

This is the opening paragraph of the body.

A second paragraph that should not be used.
`;

describe('devotionals are found from the files, not a rebuilt list', () => {
  test('it finds the one published on the day', () => {
    const dir = makeDir({
      'a.md': published('2026-10-04', 'strangers-and-sojourners'),
      'b.md': published('2026-10-05', 'the-might-of-my-hand'),
    });
    const found = devotionalsPublishedOn('2026-10-04', { dir });
    expect(found.map((d) => d.slug)).toEqual(['strangers-and-sojourners']);
    rmSync(dir, { recursive: true, force: true });
  });

  test('a day with nothing scheduled returns empty, not a failure', () => {
    const dir = makeDir({ 'a.md': published('2026-10-04', 'x') });
    expect(devotionalsPublishedOn('2026-12-25', { dir })).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });

  test('an unreadable folder returns null, which is not the same as none', () => {
    // This distinction is the whole bug. "I could not look" must fall back to
    // the old list; "I looked and there are none" must send nothing.
    expect(devotionalsPublishedOn('2026-10-04', { dir: 'no/such/folder' })).toBeNull();
  });

  test('drafts are left alone and the template is ignored', () => {
    const dir = makeDir({
      'draft.md': published('2026-10-04', 'draft-one').replace('status: published', 'status: draft'),
      'TEMPLATE.md': published('2026-10-04', 'template'),
      'real.md': published('2026-10-04', 'real-one'),
    });
    expect(devotionalsPublishedOn('2026-10-04', { dir }).map((d) => d.slug)).toEqual(['real-one']);
    rmSync(dir, { recursive: true, force: true });
  });

  test('a file with broken frontmatter does not take the day down with it', () => {
    const dir = makeDir({
      'broken.md': '{\\rtf1 this is not markdown at all',
      'real.md': published('2026-10-04', 'real-one'),
    });
    expect(devotionalsPublishedOn('2026-10-04', { dir }).map((d) => d.slug)).toEqual(['real-one']);
    rmSync(dir, { recursive: true, force: true });
  });

  test('an unquoted date is read as the day the author wrote', () => {
    // YAML turns a bare 2026-10-04 into a Date at midnight UTC. Reading that in
    // local time would move the devotional a day earlier west of Greenwich.
    const dir = makeDir({ 'a.md': published('2026-10-04', 'x').replace('publish_date: "2026-10-04"', 'publish_date: 2026-10-04') });
    expect(devotionalsPublishedOn('2026-10-04', { dir }).map((d) => d.slug)).toEqual(['x']);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('the summary matches what the content list would have carried', () => {
  test('the frontmatter summary wins when there is one', () => {
    expect(emailSummaryFrom({ summary: 'The stated summary.' }, 'Body text.')).toBe('The stated summary.');
  });

  test('otherwise it takes the first real paragraph, not a heading', () => {
    const body = '# A Heading\n\nThe first real paragraph.\n\nThe second one.';
    expect(emailSummaryFrom({}, body)).toBe('The first real paragraph.');
  });

  test('markdown is stripped so it reads in an email', () => {
    expect(emailSummaryFrom({ summary: '**Bold** and *italic* and [a link](http://x.com)' })).toBe(
      'Bold and italic and a link'
    );
  });
});

describe('the sender is wired to the files and they ship with it', () => {
  const root = process.cwd();

  test('the cron reads the files first and only falls back when it cannot', () => {
    const source = readFileSync(join(root, 'api/cron/daily-devotional-notify.js'), 'utf8');
    expect(source).toContain('devotionalsPublishedOn(todayStr)');
    // The fallback is reached only on null, never on an empty day.
    expect(source).toContain('todayDevotionals === null');
  });

  test('the devotional files are bundled with the function', () => {
    // Without this the function cannot see them in production and would quietly
    // fall back to the list every single day, which is the bug all over again.
    const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
    const build = vercel.builds.find((b) => b.src === 'api/cron/daily-devotional-notify.js');
    expect(build).toBeTruthy();
    expect(build.config.includeFiles).toContain('ao-knowledge-hq-kit/journal/devotionals/**');
  });

  test('it is still routed and still scheduled', () => {
    const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
    expect((vercel.routes || []).some((r) => r.src === '/api/cron/daily-devotional-notify')).toBe(true);
    expect(vercel.crons.some((c) => c.path === '/api/cron/daily-devotional-notify')).toBe(true);
  });
});
