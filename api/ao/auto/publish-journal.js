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

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'mediaphish';
const REPO_NAME = 'archetype-original';
const JOURNAL_PATH = 'ao-knowledge-hq-kit/journal';
const BRANCH = 'main';

function buildFrontmatter(fields) {
  const {
    title,
    slug,
    publish_date,
    summary,
    categories = [],
    featured_image = '',
    takeaways = [],
    applications = [],
    related = [],
    status = 'published',
  } = fields;

  const now = new Date().toISOString().split('T')[0];

  const categoriesYaml = categories.length
    ? categories.map((c) => `  - ${c}`).join('\n')
    : '  []';

  const takeawaysYaml = takeaways.length
    ? takeaways.map((t) => `  - "${t.replace(/"/g, '\\"')}"`).join('\n')
    : '  []';

  return `---
title: ${title}
slug: ${slug}
publish_date: '${publish_date}'
created_at: '${now}'
updated_at: '${now}'
summary: >-
  ${summary.replace(/\n/g, '\n  ')}
categories:
${categoriesYaml}
featured_image: ../images/${featured_image}
takeaways:
${takeawaysYaml}
applications: []
related: []
original_source: AO Auto
status: ${status}
---`;
}

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
  return {
    sha: data.content?.sha,
    commitSha: data.commit?.sha,
    htmlUrl: data.content?.html_url,
  };
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_PUBLISH_TOKEN;
  if (!token) {
    return res.status(500).json({
      ok: false,
      error: 'GITHUB_PUBLISH_TOKEN is not set in environment variables.',
    });
  }

  const {
    slug,
    title,
    content,
    summary,
    publish_date,
    categories = [],
    featured_image = '',
    takeaways = [],
    notify = true,
    notify_delay_ms = 300000,
  } = req.body || {};

  if (!slug || !title || !content || !summary || !publish_date) {
    return res.status(400).json({
      ok: false,
      error: 'slug, title, content, summary, and publish_date are all required.',
    });
  }

  // Sanitize slug
  const safeSlug = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const filePath = `${JOURNAL_PATH}/${safeSlug}.md`;
  const frontmatter = buildFrontmatter({
    title,
    slug: safeSlug,
    publish_date,
    summary,
    categories,
    featured_image,
    takeaways,
    status: 'published',
  });

  const fullContent = `${frontmatter}\n\n${content.trim()}\n`;

  try {
    // Check if file already exists (update vs create)
    const existingSha = await getFileSha(token, filePath);
    const commitMessage = existingSha
      ? `Update journal entry: ${title}`
      : `Publish journal entry: ${title}`;

    const result = await commitFile(token, filePath, fullContent, commitMessage, existingSha);

    const journalUrl = `https://www.archetypeoriginal.com/journal/${safeSlug}`;

    // Trigger Resend notification after delay if requested
    // Uses a fire-and-forget setTimeout — the response is returned immediately
    if (notify) {
      const siteUrl = process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com';
      const notifyUrl = `${siteUrl}/api/journal/notify`;
      setTimeout(async () => {
        try {
          await fetch(notifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              post: {
                title,
                slug: safeSlug,
                summary,
                email_summary: summary,
                publish_date,
                type: 'journal-post',
              },
            }),
          });
          console.log(`[publish-journal] Resend notification fired for ${safeSlug}`);
        } catch (notifyErr) {
          console.error(`[publish-journal] Resend notification failed:`, notifyErr.message);
        }
      }, notify_delay_ms);
    }

    return res.status(200).json({
      ok: true,
      slug: safeSlug,
      file_path: filePath,
      commit_sha: result.commitSha,
      journal_url: journalUrl,
      notify_scheduled: notify,
      notify_delay_ms: notify ? notify_delay_ms : 0,
      message: existingSha
        ? `Entry updated. Vercel will deploy in ~60 seconds. URL: ${journalUrl}`
        : `Entry published. Vercel will deploy in ~60 seconds. URL: ${journalUrl}`,
    });
  } catch (err) {
    console.error('[publish-journal]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
