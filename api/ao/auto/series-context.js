/**
 * GET /api/ao/auto/series-context?series_slug=power-vs-authority
 *
 * Reads all journal markdown files for a given series directly from disk
 * and returns their full content. Used by Auto at the start of any
 * multi-part series session so it can reference all published parts
 * without waiting for a Vercel deploy to rebuild knowledge.json.
 *
 * A series is identified by slug prefix — all files matching
 * `{series_slug}*.md` in the journal directory are returned,
 * sorted by part number if detectable from the filename.
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

  const seriesSlug = String(req.query?.series_slug || '').trim().toLowerCase();
  if (!seriesSlug) {
    return res.status(400).json({ ok: false, error: 'series_slug is required' });
  }

  try {
    if (!fs.existsSync(JOURNAL_DIR)) {
      return res.status(404).json({ ok: false, error: 'Journal directory not found' });
    }

    const allFiles = fs.readdirSync(JOURNAL_DIR).filter(f =>
      f.endsWith('.md') &&
      f.toLowerCase().startsWith(seriesSlug) &&
      !f.includes('template') &&
      !f.startsWith('.')
    );

    if (allFiles.length === 0) {
      return res.status(200).json({ ok: true, series_slug: seriesSlug, parts: [] });
    }

    // Sort by part number if present in filename
    const sorted = allFiles.sort((a, b) => {
      const numA = parseInt((a.match(/part-(\d+)/i) || [])[1] || '0', 10);
      const numB = parseInt((b.match(/part-(\d+)/i) || [])[1] || '0', 10);
      return numA - numB;
    });

    const parts = sorted.map(filename => {
      const filePath = path.join(JOURNAL_DIR, filename);
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data: frontmatter, content } = matter(raw);
      return {
        slug: frontmatter.slug || filename.replace('.md', ''),
        title: frontmatter.title || '',
        publish_date: frontmatter.publish_date || '',
        summary: frontmatter.summary || '',
        status: frontmatter.status || '',
        content: content.trim(),
        filename,
      };
    });

    return res.status(200).json({
      ok: true,
      series_slug: seriesSlug,
      total: parts.length,
      parts,
    });
  } catch (err) {
    console.error('[series-context]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
