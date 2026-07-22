/**
 * POST /api/ao/auto/publish-devotional
 *
 * Publishes a devotional entry by committing a markdown file to the GitHub repo.
 * Devotionals live at ao-knowledge-hq-kit/journal/devotionals/YYYY-MM-DD-slug.md
 * Vercel deploys on commit. Resend fires automatically at 1:20am CT.
 * Scripture text is rendered by the site via existing Crossway ESV API — not stored in MD.
 *
 * Body: {
 *   slug: string,
 *   title: string,
 *   date: string,          — YYYY-MM-DD
 *   scripture_reference: string,   — e.g. "Proverbs 4:23-27 (ESV)"
 *   content: string,       — Full markdown body without frontmatter
 *   summary: string,
 * }
 */

import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'mediaphish';
const REPO_NAME = 'archetype-original';
const DEVOTIONAL_PATH = 'ao-knowledge-hq-kit/journal/devotionals';
const BRANCH = 'main';

async function getFileSha(token, path) {
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
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha || null;
}

async function commitFile(token, path, content, message, sha) {
  const body = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

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
      body: JSON.stringify(body),
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

  const { slug, title, date, scripture_reference, content, summary } = req.body || {};

  if (!slug || !title || !date || !scripture_reference || !content || !summary) {
    return res.status(400).json({
      ok: false,
      error: 'slug, title, date, scripture_reference, content, and summary are all required.',
    });
  }

  const safeSlug = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const filename = `${date}-${safeSlug}.md`;
  const filePath = `${DEVOTIONAL_PATH}/${filename}`;

  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
slug: ${safeSlug}
date: "${date}"
type: devotional
categories: ["servant-leadership", "devotional"]
status: published
publish_date: "${date}"
scripture_reference: "${scripture_reference}"
summary: "${summary.replace(/"/g, '\\"')}"
---`;

  const fullContent = `${frontmatter}\n\n${content.trim()}\n`;

  try {
    const existingSha = await getFileSha(token, filePath);
    const commitMessage = existingSha
      ? `Update devotional: ${title}`
      : `Publish devotional: ${title}`;

    await commitFile(token, filePath, fullContent, commitMessage, existingSha);

    const devotionalUrl = `https://www.archetypeoriginal.com/faith/${safeSlug}`;

    // Embed BEFORE responding — fire-and-forget was getting cut off on Vercel
    // teardown (same bug as publish-journal). Failed embed must not fail publish.
    let embedOk = false;
    let embedError = null;
    try {
      const { embedAndStoreDocument } = await import('../../../lib/ao/corpusEmbeddings.js');
      embedOk = await embedAndStoreDocument({
        slug: safeSlug,
        title,
        type: 'devotional',
        categories: ['servant-leadership', 'devotional', 'faith'],
        summary,
        body: content,
      });
      if (embedOk) {
        console.log(`[publish-devotional] Vector embedding stored for: ${safeSlug}`);
      } else {
        embedError = 'embedAndStoreDocument returned false';
        console.error(`[publish-devotional] Vector embedding returned false for: ${safeSlug}`);
      }
    } catch (embedErr) {
      embedError = embedErr?.message || String(embedErr);
      console.error('[publish-devotional] Vector embedding failed:', embedError);
    }

    // Await draft status update — same Vercel teardown risk as embed.
    let draftMarkedPublished = false;
    let draftMarkError = null;
    try {
      const { data: updatedRows, error: draftUpdateError } = await supabaseAdmin
        .from('ao_content_drafts')
        .update({ status: 'published' })
        .eq('slug', safeSlug)
        .neq('status', 'published')
        .select('id');

      if (draftUpdateError) {
        draftMarkError = draftUpdateError.message;
        console.error('[publish-devotional] Draft status update failed:', draftUpdateError.message);
      } else if (!updatedRows || updatedRows.length === 0) {
        draftMarkError = `matched 0 rows for slug="${safeSlug}"`;
        console.warn(`[publish-devotional] Draft status update ${draftMarkError}`);
      } else {
        draftMarkedPublished = true;
        console.log(`[publish-devotional] Draft marked published for: ${safeSlug}`);
      }
    } catch (draftErr) {
      draftMarkError = draftErr?.message || String(draftErr);
      console.error('[publish-devotional] Draft status update threw:', draftMarkError);
    }

    return res.status(200).json({
      ok: true,
      slug: safeSlug,
      file_path: filePath,
      devotional_url: devotionalUrl,
      publish_date: date,
      embedded_in_corpus: embedOk,
      corpus_embed_error: embedError,
      draft_marked_published: draftMarkedPublished,
      draft_mark_error: draftMarkError,
      message: `Devotional committed. Vercel will deploy in ~60 seconds. URL: ${devotionalUrl}`,
    });
  } catch (err) {
    console.error('[publish-devotional]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
