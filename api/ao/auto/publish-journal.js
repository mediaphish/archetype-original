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

import fs from 'fs';
import path from 'path';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'mediaphish';
const REPO_NAME = 'archetype-original';
const JOURNAL_PATH = 'ao-knowledge-hq-kit/journal';
const BRANCH = 'main';

/** Always-present fallback used when publishing with image_url="none". */
export const DEFAULT_JOURNAL_HEADER_IMAGE = 'ao-default-header.jpg';

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

  const featuredImageLine = featured_image
    ? `featured_image: ../images/${featured_image}`
    : 'featured_image:';

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
${featuredImageLine}
takeaways:
${takeawaysYaml}
applications: []
related: []
original_source: AO Auto
status: ${status}
---`;
}

/**
 * Resolve which featured_image filename to write, given the request's image_url.
 * Exported for direct verification of the image_url="none" / invalid paths.
 *
 * @returns {{ ok: true, featuredImageFilename: string, mode: 'https'|'none' } | { ok: false, error: string }}
 */
export function resolveJournalFeaturedImage({ image_url, safeSlug }) {
  const slugImage = `${safeSlug}.jpg`;
  const isExplicitNoImage = image_url === 'none';

  if (image_url && String(image_url).startsWith('https://')) {
    return { ok: true, featuredImageFilename: slugImage, mode: 'https' };
  }
  if (isExplicitNoImage) {
    return { ok: true, featuredImageFilename: DEFAULT_JOURNAL_HEADER_IMAGE, mode: 'none' };
  }
  return {
    ok: false,
    error:
      'image_url is required. Generate and approve a header image before publishing. If this is an intentional text-only update, pass image_url="none" to bypass this check.',
  };
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

    const trimmedImage =
      typeof imageUrl === 'string' ? imageUrl.trim() : '';
    let safeImageUrl = null;
    if (trimmedImage.startsWith('https://') || trimmedImage.startsWith('http://')) {
      safeImageUrl = trimmedImage;
    } else if (trimmedImage.startsWith('/images/')) {
      const siteBase = (
        process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com'
      ).replace(/\/$/, '');
      safeImageUrl = `${siteBase}${trimmedImage}`;
    }
    // Anything else ("none", empty, relative junk) → null — never store placeholders.

    rows.push({
      platform: ch.platform,
      account_id: ch.account_id,
      scheduled_at: scheduledAt,
      text,
      caption: text,
      image_url: safeImageUrl,
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

  const imageResolution = resolveJournalFeaturedImage({ image_url, safeSlug });
  if (!imageResolution.ok) {
    return res.status(400).json({
      ok: false,
      error: imageResolution.error,
    });
  }

  const resolvedFeaturedImage = imageResolution.featuredImageFilename;
  let imageCommittedThisRequest = false;

  try {
    // Image commit — required before MD file is committed (unless explicit none → fallback).
    // If image_url is https and the commit cannot be verified, abort entirely.
    // We do not publish a broken entry. Image first, MD second.
    if (imageResolution.mode === 'https') {
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
      imageCommittedThisRequest = true;
    } else if (imageResolution.mode === 'none') {
      // Explicit intentional bypass — frontmatter must point at the permanent fallback
      // that already exists in the repo, never at ${safeSlug}.jpg (which was never created).
      console.log(
        `[publish-journal] image_url="none" — using permanent fallback featured_image: ${resolvedFeaturedImage}`
      );
    }

    const frontmatter = buildFrontmatter({
      title,
      slug: safeSlug,
      publish_date,
      summary,
      categories,
      featured_image: resolvedFeaturedImage,
      takeaways,
      status: 'published',
    });

    const fullContent = `${frontmatter}\n\n${content.replace(/\[SOCIAL_CAPTIONS\][\s\S]*?\[\/SOCIAL_CAPTIONS\]/gi, '').trim()}\n`;

    // Second-layer safety: never commit markdown that references a missing image file.
    const featuredImageRepoPath = `public/images/${resolvedFeaturedImage}`;
    const featuredImageLocalPath = path.join(process.cwd(), 'public/images', resolvedFeaturedImage);
    const localFeaturedExists = fs.existsSync(featuredImageLocalPath);
    let remoteFeaturedExists = imageCommittedThisRequest;
    if (!remoteFeaturedExists) {
      const existingFeaturedSha = await getFileSha(token, featuredImageRepoPath);
      remoteFeaturedExists = Boolean(existingFeaturedSha);
    }
    if (!localFeaturedExists && !remoteFeaturedExists) {
      return res.status(500).json({
        ok: false,
        error: `Refusing to publish: featured_image "${resolvedFeaturedImage}" does not exist locally or in GitHub. Entry not published.`,
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
      // Meta (Instagram/Facebook) requires an absolute http(s) image URL.
      // Never store the literal "none", a relative "/images/..." path, or any other
      // non-URL placeholder — those fail validation and leave IG/FB posts failed
      // while LinkedIn/X still post (exactly what happened for the-data-caught-up).
      const siteBase = (
        process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com'
      ).replace(/\/$/, '');
      let socialImageUrl = null;
      if (typeof image_url === 'string') {
        const trimmed = image_url.trim();
        if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
          socialImageUrl = trimmed;
        } else if (trimmed.startsWith('/images/')) {
          socialImageUrl = `${siteBase}${trimmed}`;
        }
      }
      // image_url="none" (or any other non-URL): use the featured image we already
      // resolved for the journal file — always a real, committed public/images file.
      if (!socialImageUrl && resolvedFeaturedImage) {
        socialImageUrl = `${siteBase}/images/${resolvedFeaturedImage}`;
      }

      const captionRows = await parseSocialCaptions(
        content,
        safeSlug,
        journalUrl,
        socialImageUrl || ''
      );
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

    // Embed into the vector corpus BEFORE responding.
    // Same class of bug as chat.js fire-and-forget: on Vercel, once the response
    // is sent the function can be frozen/torn down and an un-awaited embed never
    // finishes — published files then silently missing from Auto's library.
    // A failed embed must NOT fail the publish (GitHub commit already succeeded).
    let embedOk = false;
    let embedError = null;
    try {
      const { embedAndStoreDocument } = await import('../../../lib/ao/corpusEmbeddings.js');
      embedOk = await embedAndStoreDocument({
        slug: safeSlug,
        title,
        type: 'journal-post',
        categories: categories || [],
        summary,
        body: content,
      });
      if (embedOk) {
        console.log(`[publish-journal] Vector embedding stored for: ${safeSlug}`);
      } else {
        embedError = 'embedAndStoreDocument returned false';
        console.error(`[publish-journal] Vector embedding returned false for: ${safeSlug}`);
      }
    } catch (embedErr) {
      embedError = embedErr?.message || String(embedErr);
      console.error('[publish-journal] Vector embedding failed:', embedError);
    }

    // Rebuild editorial memory before responding so Auto's next turn sees this
    // post without waiting on the weekly cron. Same Vercel teardown risk as embed.
    // Failure is surfaced but never blocks the publish response.
    let editorialMemoryOk = false;
    let editorialMemoryError = null;
    try {
      const ownerEmail = String(process.env.AO_OWNER_EMAIL || '').toLowerCase().trim();
      if (ownerEmail) {
        const { rebuildEditorialMemory } = await import('../../../lib/ao/editorialMemory.js');
        const memResult = await rebuildEditorialMemory({ email: ownerEmail });
        editorialMemoryOk = true;
        console.log(
          `[publish-journal] Editorial memory rebuilt after publish: ${memResult.corpusInserted} corpus docs, ${memResult.socialInserted} social posts`
        );
      } else {
        editorialMemoryError = 'AO_OWNER_EMAIL not set — skipped rebuild';
        console.warn(`[publish-journal] ${editorialMemoryError}`);
      }
    } catch (rebuildErr) {
      editorialMemoryError = rebuildErr?.message || String(rebuildErr);
      console.error('[publish-journal] Editorial memory rebuild failed:', editorialMemoryError);
    }

    // Mark the matching draft as published so it drops out of Auto's
    // "approved drafts pending publish" context. Awaited for the same reason —
    // fire-and-forget was getting cut off and drafts stayed stuck as pending.
    let draftMarkedPublished = false;
    let draftMarkError = null;
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
        draftMarkError = draftUpdateError.message;
        console.error('[publish-journal] Failed to mark draft as published:', draftUpdateError.message);
      } else if (!updatedRows || updatedRows.length === 0) {
        draftMarkError = `matched 0 rows for slug="${safeSlug}" series_slug="${seriesSlug || 'n/a'}" part_number="${partNumber || 'n/a'}"`;
        console.warn(
          `[publish-journal] Post-publish draft-status update ${draftMarkError} — draft may show as stuck pending in Auto's context.`
        );
      } else {
        draftMarkedPublished = true;
        console.log(
          `[publish-journal] Draft marked published (${updatedRows.length} row(s)) for slug="${safeSlug}" series_slug="${seriesSlug}" part_number="${partNumber}"`
        );
      }
    } catch (err) {
      draftMarkError = err?.message || String(err);
      console.error('[publish-journal] Unexpected error marking draft published:', draftMarkError);
    }

    // Instagram bio + delayed Resend notify stay fire-and-forget intentionally:
    // they are external side effects with their own retries/delays and are not
    // required for Auto's corpus awareness. Do not await them here.

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
      embedded_in_corpus: embedOk,
      corpus_embed_error: embedError,
      editorial_memory_rebuilt: editorialMemoryOk,
      editorial_memory_error: editorialMemoryError,
      draft_marked_published: draftMarkedPublished,
      draft_mark_error: draftMarkError,
      message: existingSha
        ? `Entry updated. Vercel will deploy in ~60 seconds. URL: ${journalUrl}`
        : `Entry published. Vercel will deploy in ~60 seconds. URL: ${journalUrl}`,
    });
  } catch (err) {
    console.error('[publish-journal]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
