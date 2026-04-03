/**
 * Where to publish non-quote-card content (devotionals, series) — routing copy for Auto.
 */

export function messageForDevotionalOrSeriesPublish() {
  return [
    '**Devotionals & series**',
    '',
    'This Auto thread is built for **corpus quote cards** (image + caption). Devotionals and multi-part series use other steps:',
    '',
    '- **Weekly corpus bundle (several quote cards):** AO → **Review** → schedule the week, or use **Publisher** to adjust.',
    '- **Single packaged post** (journal + channel drafts): finish packaging here, then say **Proceed** (or **Schedule this package**) to queue social posts.',
    '- **Faith / devotional library pages** are published from your content pipeline, not from this quote-card publish command.',
    '',
    'Say **Publish cards 1, 2, …** when you want quote cards from the numbered list in this thread.',
  ].join('\n');
}
