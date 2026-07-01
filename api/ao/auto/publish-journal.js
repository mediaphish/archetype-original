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
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

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
title: ${title.includes(':') ? `"${title.replace(/"/g, '\\"')}"` : title}
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

async function commitFile(token, path, content, message, sha, isRawBase64 = false) {
  const body = {
    message,
    content: isRawBase64 ? content : Buffer.from(content, 'utf8').toString('base64'),
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

/**
 * Updates the Instagram Business account's website/bio link to the new journal URL.
 * Fire-and-forget — never blocks publish.
 * Reads user_access_token and instagram_business_id from ao_meta_tokens.
 */
async function updateInstagramBioLink(journalUrl) {
  try {
    // Read the stored Meta credentials
    const { data: tokenRow, error } = await supabaseAdmin
      .from('ao_meta_tokens')
      .select('user_access_token, instagram_business_id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !tokenRow) {
      console.warn('[publish-journal] Instagram bio update skipped — no Meta token found');
      return;
    }

    const { user_access_token, instagram_business_id } = tokenRow;

    if (!user_access_token || !instagram_business_id) {
      console.warn('[publish-journal] Instagram bio update skipped — missing token or IG ID');
      return;
    }

    // Update the Instagram account's website field
    const igRes = await fetch(
      `https://graph.facebook.com/v25.0/${instagram_business_id}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: journalUrl,
          access_token: user_access_token,
        }),
      }
    );

    const igData = await igRes.json().catch(() => ({}));

    if (!igRes.ok || igData.error) {
      console.error(
        '[publish-journal] Instagram bio update failed:',
        igData.error?.message || `HTTP ${igRes.status}`
      );
      return;
    }

    console.log(`[publish-journal] Instagram bio link updated to: ${journalUrl}`);
  } catch (err) {
    console.error('[publish-journal] Instagram bio update threw an error:', err?.message || err);
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Run preflight silently. If a critical system is down, return a plain English
  // error immediately rather than attempting a publish that will fail mid-way.
  // Bart never sees preflight — it runs invisibly and only surfaces on real failures.
  try {
    const preflightFails = [];

    if (!process.env.GITHUB_PUBLISH_TOKEN) {
      preflightFails.push('GitHub token is not configured. Publishing cannot proceed.');
    }
    if (!process.env.OPEN_API_KEY) {
      preflightFails.push('OpenAI key is not configured. Image generation will fail.');
    }
    if (!process.env.RESEND_API_KEY) {
      preflightFails.push('Resend key is not configured. Subscriber emails will not send.');
    }

    if (preflightFails.length > 0) {
      return res.status(500).json({
        ok: false,
        error: `Publish blocked — system check failed: ${preflightFails.join(' ')}`,
      });
    }
  } catch (preflightErr) {
    console.error('[publish-journal] Preflight error:', preflightErr?.message);
    // Non-fatal — proceed with publish attempt
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
    image_url = '',
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
  const imageFilename = `${safeSlug}.jpg`;
  const frontmatter = buildFrontmatter({
    title,
    slug: safeSlug,
    publish_date,
    summary,
    categories,
    featured_image: imageFilename,
    takeaways,
    status: 'published',
  });

  const fullContent = `${frontmatter}\n\n${content.trim()}\n`;

  try {
    // Image commit — required before MD file is committed.
    // If image_url is provided and the commit cannot be verified, abort entirely.
    // We do not publish a broken entry. Image first, MD second.
    if (image_url && image_url.startsWith('https://')) {
      const imagePath = `public/images/${imageFilename}`;

      // Step 1: Download image from Supabase
      let imgBase64;
      try {
        const imgRes = await fetch(image_url);
        if (!imgRes.ok) {
          return res.status(500).json({
            ok: false,
            error: `Image download failed (HTTP ${imgRes.status}). Entry not published. Check the image URL and try again.`,
          });
        }
        const imgBuffer = await imgRes.arrayBuffer();
        const bytes = new Uint8Array(imgBuffer);
        if (bytes.length < 10000) {
          return res.status(500).json({
            ok: false,
            error: `Image downloaded but appears corrupt or empty (${bytes.length} bytes). Entry not published.`,
          });
        }
        imgBase64 = Buffer.from(imgBuffer).toString('base64');
        console.log(`[publish-journal] Image downloaded: ${bytes.length} bytes`);
      } catch (downloadErr) {
        return res.status(500).json({
          ok: false,
          error: `Image download threw an error: ${downloadErr.message}. Entry not published.`,
        });
      }

      // Step 2: Commit image to GitHub
      try {
        const existingImageSha = await getFileSha(token, imagePath);
        await commitFile(
          token,
          imagePath,
          imgBase64,
          `Add journal header image: ${imageFilename}`,
          existingImageSha,
          true
        );
        console.log(`[publish-journal] Image committed to GitHub: ${imagePath}`);
      } catch (commitErr) {
        return res.status(500).json({
          ok: false,
          error: `Image commit to GitHub failed: ${commitErr.message}. Entry not published. Try again.`,
        });
      }

      // Step 3: Verify the image actually exists in GitHub after commit
      // Wait 2 seconds for GitHub to process the commit before verifying
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const verifiedSha = await getFileSha(token, imagePath);
      if (!verifiedSha) {
        return res.status(500).json({
          ok: false,
          error: `Image commit appeared to succeed but the file could not be verified in GitHub. Entry not published. Try again in a moment.`,
        });
      }
      console.log(`[publish-journal] Image verified in GitHub: ${imagePath} (sha: ${verifiedSha})`);

    } else if (!image_url) {
      // No image provided — return error. Every journal entry requires a header image.
      // If this is an intentional text-only update, pass image_url="none" to bypass.
      return res.status(400).json({
        ok: false,
        error: 'image_url is required. Generate and approve a header image before publishing. If this is an intentional text-only update, pass image_url="none" to bypass this check.',
      });
    }

    // Check if MD file already exists (update vs create)
    const existingSha = await getFileSha(token, filePath);
    const commitMessage = existingSha
      ? `Update journal entry: ${title}`
      : `Publish journal entry: ${title}`;

    const result = await commitFile(token, filePath, fullContent, commitMessage, existingSha);

    const journalUrl = `https://www.archetypeoriginal.com/journal/${safeSlug}`;

    // Update Instagram bio link to point to the new journal entry.
    // Fire-and-forget — never blocks publish response.
    updateInstagramBioLink(journalUrl).catch((err) => {
      console.error('[publish-journal] Instagram bio update (outer catch):', err?.message || err);
    });

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
