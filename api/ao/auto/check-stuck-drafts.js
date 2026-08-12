/**
 * GET /api/ao/auto/check-stuck-drafts
 *
 * Read-only: find journal drafts that are not marked published in the database
 * but already have a live markdown file in the GitHub journal folder.
 */
import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { contentDrafts } from '../../../lib/db/contentDrafts.js';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'mediaphish';
const REPO_NAME = 'archetype-original';
const JOURNAL_PATH = 'ao-knowledge-hq-kit/journal';
const BRANCH = 'main';

function normalizeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function journalFileExists(token, slugCandidate) {
  const slug = normalizeSlug(slugCandidate);
  if (!slug) return false;
  const path = `${JOURNAL_PATH}/${slug}.md`;
  const res = await fetch(
    `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );
  if (res.status === 404) return false;
  if (!res.ok) return false;
  return true;
}

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_PUBLISH_TOKEN;
  if (!token) {
    return res.status(500).json({
      ok: false,
      error: 'GITHUB_PUBLISH_TOKEN is not set — cannot check the live journal folder.',
    });
  }

  try {
    const { data: drafts, error } = await contentDrafts()
      .select('id, slug, title, status')
      .eq('kind', 'journal')
      .neq('status', 'published');

    if (error) {
      return res.status(500).json({ ok: false, error: error.message || 'Could not load drafts' });
    }

    const stuck = [];
    for (const draft of drafts || []) {
      const rawSlug = String(draft.slug || '').trim();
      const normalized = normalizeSlug(rawSlug);
      const candidates = Array.from(new Set([rawSlug, normalized].filter(Boolean)));

      let live = false;
      for (const candidate of candidates) {
        if (await journalFileExists(token, candidate)) {
          live = true;
          break;
        }
      }

      if (live) {
        stuck.push({
          slug: draft.slug || '',
          title: draft.title || '',
          status: draft.status || '',
        });
      }
    }

    return res.status(200).json({ ok: true, stuck });
  } catch (err) {
    console.error('[check-stuck-drafts]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
