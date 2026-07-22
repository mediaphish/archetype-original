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
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { toScheduledAt } from '../../../lib/ao/unifiedScheduler.js';

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

// LINKEDIN BUSINESS — EXCLUDED FROM AUTOMATED QUEUE
// Requires Community Management API via second LinkedIn developer app ("AO Page Publisher").
// App is pending LinkedIn review as of July 2026.
// Do not re-enable until: (1) LinkedIn approves the app, (2) cursor-prompt-linkedin-business-enable.md is executed.
// When re-enabled: account_id must be set to 'page', token path must use ao_linkedin_tokens.page_urn.
// Auto still generates LinkedIn Business captions in chat for manual paste. Only the queue row is excluded.
const JOURNAL_LAUNCH_CHANNEL_MAP = [
  { key: 'linkedin_personal',  platform: 'linkedin',  account_id: 'personal', label: 'linkedin_personal' },
  { key: 'instagram_business', platform: 'instagram', account_id: 'meta',     label: 'instagram_business' },
  { key: 'facebook_business',  platform: 'facebook',  account_id: 'meta',     label: 'facebook_business' },
  { key: 'twitter',            platform: 'twitter',   account_id: 'personal', label: 'x' },
];

/**
 * Parse [SOCIAL_CAPTIONS] block from the journal content body if present.
 * Returns an array of { platform, account_id, label, text, scheduled_at } objects.
 * Returns empty array if no captions block found.
 *
 * Parsing strategy: for each channel, find its opening [CAPTION platform="..."] tag,
 * then extract text until the next [CAPTION tag or [/SOCIAL_CAPTIONS] — NOT until [/CAPTION].
 * This prevents one channel's caption from bleeding into the next channel's tag text.
 */
async function parseSocialCaptions(body, slug, journalUrl, imageUrl = '') {
  const captionsMatch = body.match(/\[SOCIAL_CAPTIONS\]([\s\S]*?)\[\/SOCIAL_CAPTIONS\]/i);
  if (!captionsMatch) return [];

  const captionsBlock = captionsMatch[1];
  const rows = [];

  for (const ch of JOURNAL_LAUNCH_CHANNEL_MAP) {
    // Find the opening tag for this channel
    const openTagPattern = new RegExp(
      `\\[CAPTION\\s+platform="${ch.key}"([^\\]]*)\\]`,
      'i'
    );
    const openMatch = captionsBlock.match(openTagPattern);
    if (!openMatch) continue;

    // Extract the scheduled_time attribute from the opening tag if present
    const scheduledTimeMatch = openMatch[1]?.match(/scheduled_time="([^"]+)"/i);

    // Find where this channel's content starts (after the opening tag)
    const openTagEnd = captionsBlock.indexOf(openMatch[0]) + openMatch[0].length;
    const remaining = captionsBlock.slice(openTagEnd);

    // Find where this channel's content ends:
    // Either at the next [CAPTION tag, or at [/CAPTION], or at [/SOCIAL_CAPTIONS]
    // Take the earliest of these boundaries.
    const nextCaptionIdx = remaining.search(/\[CAPTION\s+platform=/i);
    const closingTagIdx = remaining.search(/\[\/CAPTION\]/i);
    const socialClosingIdx = remaining.search(/\[\/SOCIAL_CAPTIONS\]/i);

    const boundaries = [nextCaptionIdx, closingTagIdx, socialClosingIdx]
      .filter((idx) => idx >= 0);

    const endIdx = boundaries.length > 0 ? Math.min(...boundaries) : remaining.length;
    let text = remaining.slice(0, endIdx).trim();

    if (!text) continue;

    // Instagram: strip URLs from body, ensure Link in bio
    if (ch.platform === 'instagram') {
      text = text.replace(/https?:\/\/[^\s]+/g, '').trim();
      if (!text.includes('Link in bio')) {
        text = `${text}\n\nLink in bio.`;
      }
    }

    const scheduledAt = scheduledTimeMatch
      ? scheduledTimeMatch[1]
      : await toScheduledAt(new Date(), ch.platform);

    rows.push({
      platform: ch.platform,
      account_id: ch.account_id,
      scheduled_at: scheduledAt,
      text,
      caption: text,
      image_url: imageUrl || null,
      status: 'scheduled',
      source_kind: 'journal_launch',
      intent: {
        auto_hub: true,
        channel_label: ch.label,
        journal_slug: slug,
        journal_url: journalUrl,
      },
    });
  }

  // Validate that every row has a non-empty caption before returning.
  // A scheduled post with no caption will post blank — never allow this.
  const blankRows = rows.filter((r) => !r.caption || String(r.caption).trim() === '');
  if (blankRows.length > 0) {
    const platforms = blankRows.map((r) => r.platform).join(', ');
    console.error(`[publish-journal] parseSocialCaptions produced blank captions for: ${platforms}`);
    throw new Error(
      `Caption generation failed for platforms: ${platforms}. The [SOCIAL_CAPTIONS] block may be malformed or missing caption text for these channels. Fix the captions in Auto and re-fire the publish signal.`
    );
  }

  return rows;
}

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
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
    series_slug: seriesSlugBody = null,
    part_number: partNumberBody = null,
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

  // Draft identity is series_slug + part_number (not slug). Prefer explicit body
  // values; otherwise derive the same way chat.js does when saving drafts.
  const derivedSeriesSlug = safeSlug.replace(/-part-\d+.*$/i, '') || safeSlug;
  const derivedPartMatch = safeSlug.match(/-part-(\d+)/i);
  const seriesSlug =
    seriesSlugBody != null && String(seriesSlugBody).trim()
      ? String(seriesSlugBody).trim().toLowerCase()
      : derivedSeriesSlug;
  const partNumberRaw =
    partNumberBody != null && String(partNumberBody).trim() !== ''
      ? Number.parseInt(String(partNumberBody), 10)
      : derivedPartMatch
        ? Number.parseInt(derivedPartMatch[1], 10)
        : 1;
  const partNumber = Number.isFinite(partNumberRaw) && partNumberRaw > 0 ? partNumberRaw : 1;

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

  const fullContent = `${frontmatter}\n\n${content.replace(/\[SOCIAL_CAPTIONS\][\s\S]*?\[\/SOCIAL_CAPTIONS\]/gi, '').trim()}\n`;

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

    // Schedule social captions if present in the content body
    let captionsScheduled = 0;
    let captionsError = null;
    try {
      const captionRows = await parseSocialCaptions(content, safeSlug, journalUrl, image_url || '');
      if (captionRows.length > 0) {
        const { data: captionData, error: captionInsertError } = await supabaseAdmin
          .from('ao_scheduled_posts')
          .insert(captionRows)
          .select('id, platform, scheduled_at');

        if (captionInsertError) {
          console.error('[publish-journal] Caption scheduling failed:', captionInsertError.message);
          captionsError = captionInsertError.message;
        } else {
          captionsScheduled = (captionData || []).length;
          console.log(`[publish-journal] ${captionsScheduled} social posts scheduled for ${safeSlug}`);
        }
      }
    } catch (captionErr) {
      console.error('[publish-journal] Caption scheduling threw:', captionErr?.message || captionErr);
      captionsError = captionErr?.message || 'Caption scheduling error';
    }

    // Trigger immediate editorial memory rebuild so the new post is available
    // to Auto in the next session without waiting for the weekly cron.
    // Fire-and-forget — never blocks the publish response.
    (async () => {
      try {
        const ownerEmail = String(process.env.AO_OWNER_EMAIL || '').toLowerCase().trim();
        if (ownerEmail) {
          const { rebuildEditorialMemory } = await import('../../../lib/ao/editorialMemory.js');
          const result = await rebuildEditorialMemory({ email: ownerEmail });
          console.log(`[publish-journal] Editorial memory rebuilt after publish: ${result.corpusInserted} corpus docs, ${result.socialInserted} social posts`);
        }
      } catch (rebuildErr) {
        console.error('[publish-journal] Editorial memory rebuild failed (non-blocking):', rebuildErr?.message || rebuildErr);
      }
    })();

    // Embed the new journal entry into the vector corpus immediately after publish.
    // This makes the document available for semantic search in the next Auto session
    // without waiting for a manual re-seed. Fire-and-forget — never blocks publish.
    (async () => {
      try {
        const { embedAndStoreDocument } = await import('../../../lib/ao/corpusEmbeddings.js');
        await embedAndStoreDocument({
          slug: safeSlug,
          title,
          type: 'journal-post',
          categories: categories || [],
          summary,
          body: content,
        });
        console.log(`[publish-journal] Vector embedding stored for: ${safeSlug}`);
      } catch (embedErr) {
        console.error('[publish-journal] Vector embedding failed (non-blocking):', embedErr?.message || embedErr);
      }
    })();

    // Mark the matching draft as published so it drops out of Auto's
    // "approved drafts pending publish" context. Match on series_slug +
    // part_number (the draft's real identity); fall back to slug only when
    // series identity isn't available. Fire-and-forget — never blocks the response.
    (async () => {
      try {
        let query = supabaseAdmin
          .from('ao_content_drafts')
          .update({ status: 'published', updated_at: new Date().toISOString() })
          .eq('kind', 'journal')
          .neq('status', 'published');

        if (seriesSlug && partNumber) {
          query = query.eq('series_slug', seriesSlug).eq('part_number', partNumber);
        } else {
          query = query.eq('slug', safeSlug);
        }

        const { data: updatedRows, error: draftUpdateError } = await query.select('id');

        if (draftUpdateError) {
          console.error('[publish-journal] Failed to mark draft as published:', draftUpdateError.message);
        } else if (!updatedRows || updatedRows.length === 0) {
          console.warn(
            `[publish-journal] Post-publish draft-status update matched 0 rows for slug="${safeSlug}" series_slug="${seriesSlug || 'n/a'}" part_number="${partNumber || 'n/a'}" — draft may show as stuck pending in Auto's context.`
          );
        } else {
          console.log(
            `[publish-journal] Draft marked published (${updatedRows.length} row(s)) for slug="${safeSlug}" series_slug="${seriesSlug}" part_number="${partNumber}"`
          );
        }
      } catch (err) {
        console.error('[publish-journal] Unexpected error marking draft published:', err?.message || err);
      }
    })();

    return res.status(200).json({
      ok: true,
      slug: safeSlug,
      file_path: filePath,
      commit_sha: result.commitSha,
      journal_url: journalUrl,
      notify_scheduled: notify,
      notify_delay_ms: notify ? notify_delay_ms : 0,
      captions_scheduled: captionsScheduled,
      captions_error: captionsError || null,
      message: existingSha
        ? `Entry updated. Vercel will deploy in ~60 seconds. URL: ${journalUrl}`
        : `Entry published. Vercel will deploy in ~60 seconds. URL: ${journalUrl}`,
    });
  } catch (err) {
    console.error('[publish-journal]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
