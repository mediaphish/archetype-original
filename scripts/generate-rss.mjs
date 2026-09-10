/**
 * Generate the site's feeds from the published corpus.
 *
 * Found 2026-09-10 while looking at why Google had indexed 32 of 393 pages:
 * /rss.xml, /feed.xml and /atom.xml all returned the SPA shell with a 200.
 * A 200 carrying HTML is worse than a 404, because every feed reader and
 * crawler that asked got an answer that looked successful and contained nothing.
 *
 * A feed is a real discovery path. Search engines, readers, aggregators and
 * newsletter tools all consume one, and it is the only mechanism on this list
 * that notifies without anyone submitting anything.
 *
 * TWO FEEDS, NOT ONE.
 *
 * The first version emitted journal posts only, on the reasoning that
 * devotionals publish daily and would drown the feed. Bart's correction: they
 * should be separate feeds, not one feed with an omission. He is right, and the
 * email form already worked this way, with separate checkboxes for Servant
 * Leadership Entries and the Servant Leadership Devotional. Someone who wants
 * a daily devotional and someone who wants an occasional essay are two
 * different subscriptions, and folding them together serves neither.
 *
 *   /rss.xml           journal posts      weekly-ish, long form
 *   /devotionals.xml   devotionals        daily, short form
 *
 * Both live under /journal/<slug> on the site. Only the grouping differs.
 *
 * FAQs stay out of both. They are reference pages, not entries.
 */

import fs from 'fs';
import path from 'path';

const SITE = 'https://www.archetypeoriginal.com';
const MAX_ITEMS = 50;

const FEEDS = [
  {
    file: 'rss.xml',
    type: 'journal-post',
    title: 'Archetype Original',
    link: `${SITE}/journal`,
    description: 'Essays on leadership, culture, and accountability by Bart Paden.',
  },
  {
    file: 'devotionals.xml',
    type: 'devotional',
    title: 'Archetype Original: Servant Leadership Devotional',
    link: `${SITE}/journal`,
    description: 'A daily devotional on servant leadership by Bart Paden.',
  },
];

function loadDocs() {
  const p = path.join(process.cwd(), 'public', 'knowledge.json');
  if (!fs.existsSync(p)) {
    console.warn('generate-rss: public/knowledge.json not found. Run after build-knowledge.');
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return raw.documents || raw.docs || [];
}

/** XML text escaping. Titles carry apostrophes and ampersands. */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rfc822(dateish) {
  const d = new Date(dateish);
  if (Number.isNaN(d.getTime())) return null;
  return d.toUTCString();
}

function entriesOfType(docs, type) {
  return docs
    .filter((d) => d?.type === type && String(d?.status) === 'published' && d?.slug)
    .map((d) => ({
      title: d.title || d.slug,
      slug: d.slug,
      // Summaries are checked by verify-post-summaries, so they are safe to
      // trust here. Falling back to a body slice would risk republishing a
      // mid-word cut into every feed reader, which is the Jezebel failure with
      // a wider audience.
      summary: d.summary || '',
      date: d.publish_date || d.created_at || null,
    }))
    .filter((p) => p.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, MAX_ITEMS);
}

function renderFeed(feed, posts) {
  const built = new Date().toUTCString();
  const latest = posts[0] ? rfc822(posts[0].date) : built;

  const items = posts
    .map((p) => {
      const url = `${SITE}/journal/${p.slug}`;
      const pub = rfc822(p.date);
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>${pub ? `\n      <pubDate>${pub}</pubDate>` : ''}
      <description>${esc(p.summary)}</description>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(feed.title)}</title>
    <link>${feed.link}</link>
    <description>${esc(feed.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${latest}</lastBuildDate>
    <atom:link href="${SITE}/${feed.file}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

const docs = loadDocs();

for (const feed of FEEDS) {
  const posts = entriesOfType(docs, feed.type);
  const out = path.join(process.cwd(), 'public', feed.file);
  fs.writeFileSync(out, renderFeed(feed, posts));
  console.log(`generate-rss: wrote ${posts.length} item(s) to public/${feed.file}`);
}
