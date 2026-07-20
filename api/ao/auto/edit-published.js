/**
 * POST /api/ao/auto/edit-published
 *
 * Makes a targeted line-level edit to a published journal entry.
 * Reads the current file from GitHub, makes the exact change, commits it back,
 * and re-embeds the updated content in the vector corpus.
 *
 * Body: {
 *   slug: string,       — the journal entry slug
 *   old_text: string,   — the exact text to find and replace
 *   new_text: string,   — the replacement text
 *   reason: string,     — optional note for the commit message
 * }
 *
 * Response: {
 *   ok: true,
 *   slug: string,
 *   commit_sha: string,
 *   journal_url: string,
 *   message: string,
 * }
 */

import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { embedAndStoreDocument } from '../../../lib/ao/corpusEmbeddings.js';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'mediaphish';
const REPO_NAME = 'archetype-original';
const JOURNAL_PATH = 'ao-knowledge-hq-kit/journal';
const BRANCH = 'main';

async function getFileFromGitHub(token, path) {
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
  if (!res.ok) return null;
  const data = await res.json();
  return {
    content: Buffer.from(data.content, 'base64').toString('utf8'),
    sha: data.sha,
  };
}

async function commitFile(token, path, content, message, sha) {
  const res = await fetch(
    `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content, 'utf8').toString('base64'),
        branch: BRANCH,
        sha,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub commit failed (${res.status}): ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  return { commitSha: data.commit?.sha };
}

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_PUBLISH_TOKEN;
  if (!token) {
    return res.status(500).json({ ok: false, error: 'GITHUB_PUBLISH_TOKEN is not set.' });
  }

  const { slug, old_text, new_text, reason } = req.body || {};

  if (!slug || !old_text || new_text === undefined) {
    return res.status(400).json({
      ok: false,
      error: 'slug, old_text, and new_text are all required.',
    });
  }

  const safeSlug = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const filePath = `${JOURNAL_PATH}/${safeSlug}.md`;

  try {
    const file = await getFileFromGitHub(token, filePath);
    if (!file) {
      return res.status(404).json({
        ok: false,
        error: `File not found: ${filePath}. Verify the slug is correct.`,
      });
    }

    if (!file.content.includes(old_text)) {
      return res.status(422).json({
        ok: false,
        error: `The exact text was not found in ${safeSlug}.md. The file may have changed since the last edit. Re-fetch the current text and try again.`,
        file_preview: file.content.slice(0, 500),
      });
    }

    const updatedContent = file.content.replace(old_text, new_text);

    const commitMessage = reason
      ? `Edit journal entry: ${safeSlug} — ${reason.slice(0, 60)}`
      : `Edit journal entry: ${safeSlug}`;

    const result = await commitFile(token, filePath, updatedContent, commitMessage, file.sha);

    const journalUrl = `https://www.archetypeoriginal.com/journal/${safeSlug}`;

    (async () => {
      try {
        const titleMatch = updatedContent.match(/^title:\s*["']?(.+?)["']?\s*$/m);
        const summaryMatch = updatedContent.match(/^summary:\s*>-?\s*\n([\s\S]*?)(?=\n\w|\n---)/m);
        const title = titleMatch ? titleMatch[1].trim() : safeSlug;
        const summary = summaryMatch ? summaryMatch[1].replace(/\n\s+/g, ' ').trim() : '';

        const bodyMatch = updatedContent.match(/^---[\s\S]*?---\s*([\s\S]*)$/m);
        const body = bodyMatch ? bodyMatch[1].trim() : updatedContent;

        await embedAndStoreDocument({
          slug: safeSlug,
          title,
          type: 'journal-post',
          categories: [],
          summary,
          body,
        });
        console.log(`[edit-published] Vector embedding updated for: ${safeSlug}`);
      } catch (embedErr) {
        console.error('[edit-published] Re-embedding failed (non-blocking):', embedErr?.message);
      }
    })();

    return res.status(200).json({
      ok: true,
      slug: safeSlug,
      commit_sha: result.commitSha,
      journal_url: journalUrl,
      message: `Edit committed. Vercel will deploy in ~60 seconds. The change is live at ${journalUrl}`,
    });
  } catch (err) {
    console.error('[edit-published]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
