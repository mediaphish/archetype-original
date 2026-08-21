/**
 * Shared journal publish pipeline — used by the HTTP handler and Auto tool handlers.
 * Commits markdown (and optional header image) to GitHub, schedules captions,
 * embeds into corpus, rebuilds editorial memory, marks draft published, etc.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import {
  parseJournalSocialCaptions,
  buildCaptionsCoverageMessage,
  JOURNAL_LAUNCH_REQUIRED_CHANNELS,
} from './parseJournalSocialCaptions.js';

import fs from 'fs';
import path from 'path';
import { scheduledPosts } from '../db/scheduledPosts.js';
import { contentDrafts } from '../db/contentDrafts.js';

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

// Channel map + parse logic live in lib/ao/parseJournalSocialCaptions.js
// (linkedin_business remains manual-only / excluded from the automated queue).

/**
 * Parse [SOCIAL_CAPTIONS] — schedules every well-formed channel even if others
 * are missing. Incomplete coverage is reported, never used to void the batch.
 */
async function parseSocialCaptions(body, slug, journalUrl, imageUrl = '') {
  return parseJournalSocialCaptions(body, slug, journalUrl, imageUrl);
}

/**
 * Full journal publish pipeline (no HTTP req/res).
 *
 * @param {{
 *   slug: string,
 *   title: string,
 *   content: string,
 *   summary: string,
 *   publish_date: string,
 *   categories?: string[],
 *   featured_image?: string,
 *   image_url?: string,
 *   takeaways?: string[],
 *   notify?: boolean,
 *   notify_delay_ms?: number,
 *   series_slug?: string|null,
 *   part_number?: number|string|null,
 * }} params
 * @returns {Promise<{ ok: true, httpStatus: 200, [key: string]: any } | { ok: false, error: string, httpStatus: number }>}
 */
/** Test-only override so selftests can assert the tool called real publish without GitHub. */
let publishJournalEntryTestOverride = null;
export function __setPublishJournalEntryTestOverride(fn) {
  publishJournalEntryTestOverride = typeof fn === 'function' ? fn : null;
}

export async function publishJournalEntry(params = {}) {
  if (publishJournalEntryTestOverride) {
    return publishJournalEntryTestOverride(params);
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
      return {
        ok: false,
        httpStatus: 500,
        error: `Publish blocked — system check failed: ${preflightFails.join(' ')}`,
      };
    }
  } catch (preflightErr) {
    console.error('[publish-journal] Preflight error:', preflightErr?.message);
    // Non-fatal — proceed with publish attempt
  }

  const token = process.env.GITHUB_PUBLISH_TOKEN;
  if (!token) {
    return {
      ok: false,
      httpStatus: 500,
      error: 'GITHUB_PUBLISH_TOKEN is not set in environment variables.',
    };
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
  } = params || {};

  if (!slug || !title || !content || !summary || !publish_date) {
    return {
      ok: false,
      httpStatus: 400,
      error: 'slug, title, content, summary, and publish_date are all required.',
    };
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
    return {
      ok: false,
      httpStatus: 400,
      error: imageResolution.error,
    };
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
          return {
            ok: false,
            httpStatus: 500,
            error: `Image download failed (HTTP ${imgRes.status}). Entry not published. Check the image URL and try again.`,
          };
        }
        const imgBuffer = await imgRes.arrayBuffer();
        const bytes = new Uint8Array(imgBuffer);
        if (bytes.length < 10000) {
          return {
            ok: false,
            httpStatus: 500,
            error: `Image downloaded but appears corrupt or empty (${bytes.length} bytes). Entry not published.`,
          };
        }
        imgBase64 = Buffer.from(imgBuffer).toString('base64');
        console.log(`[publish-journal] Image downloaded: ${bytes.length} bytes`);
      } catch (downloadErr) {
        return {
          ok: false,
          httpStatus: 500,
          error: `Image download threw an error: ${downloadErr.message}. Entry not published.`,
        };
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
        return {
          ok: false,
          httpStatus: 500,
          error: `Image commit to GitHub failed: ${commitErr.message}. Entry not published. Try again.`,
        };
      }

      // Step 3: Verify the image actually exists in GitHub after commit
      // Wait 2 seconds for GitHub to process the commit before verifying
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const verifiedSha = await getFileSha(token, imagePath);
      if (!verifiedSha) {
        return {
          ok: false,
          httpStatus: 500,
          error: `Image commit appeared to succeed but the file could not be verified in GitHub. Entry not published. Try again in a moment.`,
        };
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
      return {
        ok: false,
        httpStatus: 500,
        error: `Refusing to publish: featured_image "${resolvedFeaturedImage}" does not exist locally or in GitHub. Entry not published.`,
      };
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
    let captionsSkippedAsDuplicate = false;
    let captionsMissing = [];
    let captionsExpected = JOURNAL_LAUNCH_REQUIRED_CHANNELS.length;
    let captionsFound = 0;
    let captionsHasBlock = false;
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

      const parsedCaptions = await parseSocialCaptions(
        content,
        safeSlug,
        journalUrl,
        socialImageUrl || ''
      );
      if (parsedCaptions?.twitterOverLimit) {
        // Defense in depth — handlePublishJournal should already refuse, but other
        // callers must not schedule an oversized X caption.
        captionsError = parsedCaptions.twitterLengthError || 'X caption exceeds character limit';
        console.error('[publish-journal]', captionsError);
      }
      const captionRows = Array.isArray(parsedCaptions?.rows) ? parsedCaptions.rows : [];
      captionsHasBlock = !!parsedCaptions?.hasBlock;
      captionsExpected = parsedCaptions?.requiredCount || JOURNAL_LAUNCH_REQUIRED_CHANNELS.length;
      captionsFound = parsedCaptions?.foundCount || captionRows.length;
      captionsMissing = [
        ...(parsedCaptions?.missingChannels || []),
        ...(parsedCaptions?.blankChannels || []),
      ];

      if (captionRows.length > 0) {
        // Guard against double-scheduling if Publish gets triggered twice for the same post
        // (a page reload followed by a re-trigger, or Auto re-emitting the publish tag). A
        // duplicate GitHub commit is harmless; a duplicate caption schedule means the same
        // post goes out twice per platform if both rows ever fire.
        const { data: existingScheduled, error: existingScheduledError } = await scheduledPosts()
          .select('platform, account_id')
          .eq('source_kind', 'journal_launch')
          .contains('intent', { journal_slug: safeSlug })
          .neq('status', 'failed');

        if (existingScheduledError) {
          console.error(
            '[publish-journal] Could not check for already-scheduled captions, proceeding without dedup:',
            existingScheduledError.message
          );
        }

        const alreadyScheduledKeys = new Set(
          (existingScheduled || []).map((r) => `${r.platform}::${r.account_id}`)
        );
        const newRows = captionRows.filter(
          (r) => !alreadyScheduledKeys.has(`${r.platform}::${r.account_id}`)
        );
        const skippedCount = captionRows.length - newRows.length;
        if (skippedCount > 0) {
          console.warn(
            `[publish-journal] Skipped ${skippedCount} caption row(s) already scheduled for ${safeSlug} — avoiding duplicate social posts.`
          );
        }

        if (newRows.length > 0) {
          const { insertScheduledPostsSafely, formatIntegrityRejectedSummary } = await import('../db/scheduledPosts.js');
          const insertResult = await insertScheduledPostsSafely(newRows, {
            select: 'id, platform, scheduled_at',
          });

          if (!insertResult.ok && insertResult.inserted.length === 0) {
            console.error('[publish-journal] Caption scheduling failed:', insertResult.error);
            captionsError = insertResult.error;
          } else {
            captionsScheduled = (insertResult.inserted || []).length;
            console.log(`[publish-journal] ${captionsScheduled} social posts scheduled for ${safeSlug}`);
            if (insertResult.rejected?.length) {
              const rejectMsg = formatIntegrityRejectedSummary(insertResult.rejected);
              console.error('[publish-journal]', rejectMsg);
              captionsError = captionsError
                ? `${captionsError} Also: ${rejectMsg}`
                : rejectMsg;
            }
          }
        } else {
          captionsSkippedAsDuplicate = captionRows.length > 0;
          console.log(`[publish-journal] All ${captionRows.length} caption row(s) for ${safeSlug} were already scheduled — nothing new to insert.`);
        }
      }

      // Incomplete channel coverage is reported without voiding the good rows above.
      if (captionsHasBlock && captionsMissing.length > 0) {
        const coverageMsg = buildCaptionsCoverageMessage({
          foundCount: captionsFound,
          requiredCount: captionsExpected,
          missingChannels: captionsMissing,
          scheduledCount: captionsScheduled,
        });
        console.error(`[publish-journal] Incomplete social captions — ${coverageMsg}`);
        // Prefer coverage message over a later insert error only when insert succeeded
        // or nothing was attempted beyond the partial set.
        if (!captionsError) {
          captionsError = coverageMsg;
        } else {
          captionsError = `${coverageMsg} Also: ${captionsError}`;
        }
      } else if (captionsHasBlock && captionsFound === 0 && !captionsError) {
        captionsError =
          'A [SOCIAL_CAPTIONS] block was present but no usable captions were found for the automated channels.';
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
      const { embedAndStoreDocument } = await import('./corpusEmbeddings.js');
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

    // Keep Auto's series memory current. Without this the seeded back-catalog
    // goes stale the moment the next part ships, which is how every previous
    // memory attempt on this project quietly stopped being true.
    //
    // seriesSlug/partNumber above derive from a "-part-N" slug, which cannot
    // identify a series whose entries have different names — the-judas-archetype
    // and the-ruth-archetype share no prefix — so they are passed as hints only.
    // recordPublishedPost matches against series already in memory first.
    try {
      const ownerEmail = String(process.env.AO_OWNER_EMAIL || '').toLowerCase().trim();
      if (ownerEmail) {
        const { recordPublishedPost } = await import('./seriesMemory.js');
        const seriesResult = await recordPublishedPost({
          email: ownerEmail,
          slug: safeSlug,
          title,
          publishedAt: publish_date || null,
          seriesSlugHint: seriesSlug,
          partNumberHint: partNumber,
        });
        console.log(
          `[publish-journal] series memory: ${
            seriesResult.recorded
              ? `recorded under ${seriesResult.seriesKey}`
              : `not recorded (${seriesResult.reason})`
          }`
        );
      }
    } catch (seriesErr) {
      // Never block a publish for this.
      console.error('[publish-journal] series memory failed:', seriesErr?.message || seriesErr);
    }

    // Rebuild editorial memory before responding so Auto's next turn sees this
    // post without waiting on the weekly cron. Same Vercel teardown risk as embed.
    // Failure is surfaced but never blocks the publish response.
    let editorialMemoryOk = false;
    let editorialMemoryError = null;
    try {
      const ownerEmail = String(process.env.AO_OWNER_EMAIL || '').toLowerCase().trim();
      if (ownerEmail) {
        const { rebuildEditorialMemory } = await import('./editorialMemory.js');
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
    //
    // slug is the one identity value verified against the real draft row -- series_slug/part_number
    // on the publish tag are text Auto typed and were never checked against the database. Trust slug
    // first always; only fall back to series_slug+part_number if slug alone can't find the row (e.g.
    // a genuinely slug-less lookup path elsewhere in the system).
    let draftMarkedPublished = false;
    let draftMarkError = null;
    try {
      const { data: existingDraftRow, error: existingDraftLookupErr } = await contentDrafts()
        .select('id, slug, series_slug, part_number, status')
        .eq('kind', 'journal')
        .eq('slug', safeSlug)
        .maybeSingle();

      if (existingDraftLookupErr) {
        draftMarkError = existingDraftLookupErr.message;
        console.error('[publish-journal] Draft lookup failed:', existingDraftLookupErr.message);
      } else {
        let draftRowToUpdate = existingDraftRow;
        if (!draftRowToUpdate && seriesSlug && partNumber) {
          const { data: fallbackRow } = await contentDrafts()
            .select('id, slug, series_slug, part_number, status')
            .eq('kind', 'journal')
            .eq('series_slug', seriesSlug)
            .eq('part_number', partNumber)
            .maybeSingle();
          draftRowToUpdate = fallbackRow;
        }

        if (!draftRowToUpdate) {
          // Genuinely couldn't find this post's draft row by any identity we have -- a real problem.
          draftMarkError = `No draft row found for slug="${safeSlug}"${seriesSlug ? ` (also tried series_slug="${seriesSlug}" part_number="${partNumber || 'n/a'}")` : ''}.`;
          console.warn(
            `[publish-journal] Post-publish draft-status update ${draftMarkError} — draft may show as stuck pending in Auto's context.`
          );
        } else if (draftRowToUpdate.status === 'published') {
          // Found it, and it's already published -- this is a re-publish of an already-live post.
          // Nothing to update, and this is not an error.
          draftMarkedPublished = true;
          console.log(
            `[publish-journal] Draft "${draftRowToUpdate.slug}" already marked published -- skipping redundant status update.`
          );
        } else {
          const { error: updateErr } = await contentDrafts()
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', draftRowToUpdate.id);
          if (updateErr) {
            draftMarkError = updateErr.message;
            console.error('[publish-journal] Failed to mark draft as published:', updateErr.message);
          } else {
            draftMarkedPublished = true;
            console.log(
              `[publish-journal] Draft marked published for slug="${draftRowToUpdate.slug}" (id=${draftRowToUpdate.id})`
            );
          }
        }
      }
    } catch (err) {
      draftMarkError = err?.message || String(err);
      console.error('[publish-journal] Unexpected error marking draft published:', draftMarkError);
    }

    // After the existing primary match attempt, if it found nothing, try harder before giving up.
    if (!draftMarkedPublished) {
      try {
        // Fallback 1: normalize the draft's own stored slug the same way safeSlug was normalized,
        // in case the two only differ by punctuation-to-hyphen handling.
        const { data: candidates } = await contentDrafts()
          .select('id, slug, title')
          .eq('kind', 'journal')
          .neq('status', 'published');

        const normalize = (s) =>
          String(s || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        let fallbackMatch = (candidates || []).find((c) => normalize(c.slug) === safeSlug);

        // Fallback 2: same title, trimmed and case-insensitive — the one value that's identical
        // at draft-creation time and publish time regardless of how the slug was typed.
        if (!fallbackMatch) {
          const normalizedTitle = String(title || '').trim().toLowerCase();
          fallbackMatch = (candidates || []).find(
            (c) => String(c.title || '').trim().toLowerCase() === normalizedTitle
          );
        }

        if (fallbackMatch) {
          const { error: fallbackError } = await contentDrafts()
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', fallbackMatch.id);

          if (fallbackError) {
            draftMarkError = `primary match failed, fallback also failed: ${fallbackError.message}`;
          } else {
            draftMarkedPublished = true;
            draftMarkError = `primary slug/series match failed; matched via fallback (slug="${fallbackMatch.slug}", title match)`;
            console.warn(
              `[publish-journal] Draft marked published via fallback match for "${title}" — primary match found 0 rows. This means the draft's stored slug ("${fallbackMatch.slug}") and the published safeSlug ("${safeSlug}") diverge; worth checking why if this keeps happening.`
            );
          }
        }
      } catch (fallbackErr) {
        console.error(
          '[publish-journal] Fallback draft-match attempt threw:',
          fallbackErr?.message || fallbackErr
        );
      }
    }

    // Instagram bio + delayed Resend notify stay fire-and-forget intentionally:
    // they are external side effects with their own retries/delays and are not
    // required for Auto's corpus awareness. Do not await them here.

    return {
      ok: true,
      httpStatus: 200,
      slug: safeSlug,
      file_path: filePath,
      commit_sha: result.commitSha,
      journal_url: journalUrl,
      notify_scheduled: notify,
      notify_delay_ms: notify ? notify_delay_ms : 0,
      captions_scheduled: captionsScheduled,
      captions_skipped_as_duplicate: captionsSkippedAsDuplicate,
      captions_error: captionsError || null,
      captions_missing: captionsMissing,
      captions_expected: captionsExpected,
      captions_found: captionsFound,
      captions_has_block: captionsHasBlock,
      captions_coverage_message: captionsHasBlock
        ? buildCaptionsCoverageMessage({
            foundCount: captionsFound,
            requiredCount: captionsExpected,
            missingChannels: captionsMissing,
            scheduledCount: captionsScheduled,
          })
        : null,
      embedded_in_corpus: embedOk,
      corpus_embed_error: embedError,
      editorial_memory_rebuilt: editorialMemoryOk,
      editorial_memory_error: editorialMemoryError,
      draft_marked_published: draftMarkedPublished,
      draft_mark_error: draftMarkError,
      message: existingSha
        ? `Entry updated. Vercel will deploy in ~60 seconds. URL: ${journalUrl}`
        : `Entry published. Vercel will deploy in ~60 seconds. URL: ${journalUrl}`,
    };
  } catch (err) {
    console.error('[publish-journal]', err?.message || err);
    return { ok: false, httpStatus: 500, error: err?.message || 'Server error' };
  }
}
