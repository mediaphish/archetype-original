/**
 * GET /api/ao/auto/journal-prefetch?slug=some-slug
 *
 * Reads a journal markdown file from disk by slug, parses frontmatter and body,
 * and returns everything the publish route needs pre-filled.
 * Called by the manual publish modal in AutoV2Panel.jsx when it opens.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const JOURNAL_DIR = path.join(process.cwd(), 'ao-knowledge-hq-kit/journal');

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const slug = String(req.query?.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!slug) {
    return res.status(400).json({ ok: false, error: 'slug is required' });
  }

  const filePath = path.join(JOURNAL_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ ok: false, error: `Journal file not found: ${slug}.md` });
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data: frontmatter, content } = matter(raw);

    return res.status(200).json({
      ok: true,
      slug,
      title: frontmatter.title || '',
      publish_date: frontmatter.publish_date || '',
      summary: frontmatter.summary || '',
      categories: Array.isArray(frontmatter.categories) ? frontmatter.categories : [],
      featured_image: frontmatter.featured_image || '',
      content: content.trim(),
    });
  } catch (err) {
    console.error('[journal-prefetch]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Could not read journal file' });
  }
}
