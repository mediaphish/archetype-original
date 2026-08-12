/**
 * POST /api/ao/auto/publish-journal
 *
 * Publishes a journal entry to the website by committing a markdown file
 * to the GitHub repo. Vercel detects the commit and deploys automatically.
 * After a configurable delay, triggers the Resend email notification.
 *
 * Body: {
 *   slug: string,           — URL slug, e.g. "the-invisible-tax"
 *   title: string,          — Full title
 *   content: string,        — Full markdown body (without frontmatter)
 *   summary: string,        — One-paragraph summary for email and meta
 *   publish_date: string,   — ISO date string, e.g. "2026-06-01"
 *   categories: string[],   — Array of category slugs
 *   featured_image: string, — Image filename, e.g. "the-invisible-tax.jpg"
 *   takeaways: string[],    — Optional array of takeaway strings
 *   notify: boolean,        — Whether to trigger Resend email (default true)
 *   notify_delay_ms: number — Delay before email notification in ms (default 300000 = 5 min)
 * }
 */

import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import {
  publishJournalEntry,
  resolveJournalFeaturedImage,
  DEFAULT_JOURNAL_HEADER_IMAGE,
} from '../../../lib/ao/publishJournalEntry.js';

export { resolveJournalFeaturedImage, DEFAULT_JOURNAL_HEADER_IMAGE };

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const result = await publishJournalEntry(req.body || {});
  const { httpStatus, ...body } = result;
  return res.status(httpStatus).json(body);
}
