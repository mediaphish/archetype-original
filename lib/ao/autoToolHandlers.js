/**
 * Client-executed Auto tool handlers (JARVIS Phase 1 + Phase 2 verify_quote).
 * Called mid-turn when the model emits tool_use blocks for custom tools.
 * Anthropic server tools (web_search) are never handled here.
 */
import { generateDesignImage } from './generateDesignImage.js';
import { generateQuoteCardImage } from './generateQuoteCardImage.js';
import { scheduleJournalLaunchCaptions } from './scheduleJournalLaunchCaptions.js';
import { storeImageSeriesMemory, getImageSeriesContext } from './editorialMemory.js';
import { logActivity } from './logActivity.js';
import {
  saveDraft,
  approveDraft,
  attachImageUrl,
  canonicalizeSlug,
  getBySlug,
  getBySeriesPart,
  contentDrafts,
  deriveSeriesSlug,
  extractPartNumber,
} from '../db/contentDrafts.js';
import { publishJournalEntry } from './publishJournalEntry.js';
import {
  evaluateOutlineSaveGate,
  evaluatePublishCaptionsGate,
  evaluateCaptionQualityGate,
  isFullLengthDraftContent,
} from './waypointGates.js';
import { scheduledPosts } from '../db/scheduledPosts.js';
import { setScheduledPublishAt } from '../db/scheduledJournalPublish.js';
import { getScheduleStatus } from './getScheduleStatus.js';
import {
  loadPriorSeriesParts,
  evaluatePriorPartsOutlineGate,
} from './priorSeriesParts.js';

const FULL_SAFE_OUTLINE = 2000;

async function handleSaveDraft(input, ctx) {
  const email = ctx?.email;
  const kind = input?.kind;
  const slug = input?.slug;
  const stage = String(input?.stage || '').trim() || null;
  const skipOutline = !!(input?.skip_outline || input?.skipOutline);

  if (stage === 'outline') {
    return handlePresentOutline(input, ctx);
  }

  if (String(kind || '').trim() === 'journal' && isFullLengthDraftContent(input?.content)) {
    let existingForGate = null;
    const existingResult = await getBySlug({
      email,
      slug,
      kind: 'journal',
      select:
        'id, slug, kind, series_slug, part_number, title, status, image_url, content, metadata',
    });
    if (!existingResult.ok) {
      return { ok: false, error: existingResult.error || 'Draft lookup failed' };
    }
    existingForGate = existingResult.data;

    // Same anti-fork resolution as saveDraft: paraphrased slug may still map to
    // an existing series+part row that already has outline approval.
    if (!existingForGate) {
      const seriesGuess =
        (input?.series_slug ? canonicalizeSlug(input.series_slug) : '') ||
        deriveSeriesSlug(canonicalizeSlug(slug));
      const partGuess =
        input?.part_number != null && String(input.part_number).trim() !== ''
          ? parseInt(input.part_number, 10) || extractPartNumber(slug)
          : extractPartNumber(slug);
      if (seriesGuess && partGuess) {
        const seriesHit = await getBySeriesPart({
          email,
          series_slug: seriesGuess,
          part_number: partGuess,
          kind: 'journal',
        });
        if (seriesHit.ok && seriesHit.data) existingForGate = seriesHit.data;
      }
    }

    const gate = evaluateOutlineSaveGate({
      kind: 'journal',
      content: input?.content,
      existing: existingForGate,
      skipOutline,
    });
    if (!gate.allowed) {
      return {
        ok: false,
        gate: gate.gate || 'outline_required',
        error: gate.error,
      };
    }

    if (gate.skipped || skipOutline) {
      console.warn(
        '[autoToolHandlers] outline gate overridden (skip_outline) for slug=',
        canonicalizeSlug(slug)
      );
      return withDraftIdReuseReminder(
        await saveDraft({
          email,
          kind,
          slug,
          title: input?.title,
          content: input?.content,
          status: input?.status || 'draft',
          series_slug: input?.series_slug,
          part_number: input?.part_number,
          draft_id: input?.draft_id || input?.id || existingForGate?.id || null,
          confirmed_new: !!(input?.confirmed_new || input?.confirmedNew),
          metadata: {
            brief: {
              outline_skipped_at: new Date().toISOString(),
              outline_skip_reason: 'explicit_skip_outline',
            },
          },
        })
      );
    }
  }

  const saved = await saveDraft({
    email,
    kind,
    slug,
    title: input?.title,
    content: input?.content,
    status: input?.status || 'draft',
    series_slug: input?.series_slug,
    part_number: input?.part_number,
    metadata: input?.metadata || null,
    stage: stage || null,
    draft_id: input?.draft_id || input?.id || null,
    confirmed_new: !!(input?.confirmed_new || input?.confirmedNew),
  });
  if (saved?.redirected_from_slug) {
    console.warn(
      '[autoToolHandlers] save_draft redirected paraphrased slug',
      saved.redirected_from_slug,
      '→',
      saved.slug
    );
  }
  return withDraftIdReuseReminder(saved);
}

function withDraftIdReuseReminder(saved) {
  if (!saved?.ok || !saved.id) return saved;
  const reminder =
    `Draft saved (id: ${saved.id}). Pass draft_id="${saved.id}" on the next save_draft or present_outline for this same piece — do not re-derive identity from the slug alone.`;
  return {
    ...saved,
    message: saved.message ? `${saved.message} ${reminder}` : reminder,
  };
}

async function handlePresentOutline(input, ctx) {
  const outline = String(input?.outline || input?.content || '').trim();
  if (!outline) return { ok: false, error: 'outline text is required' };
  if (!input?.slug) return { ok: false, error: 'slug is required' };
  if (outline.length > FULL_SAFE_OUTLINE) {
    return {
      ok: false,
      error: `Outline is too long (${outline.length} chars). Keep the plan under ${FULL_SAFE_OUTLINE} characters — this is the brief, not the full post.`,
    };
  }

  const slug = canonicalizeSlug(input.slug);
  const series_slug =
    (input?.series_slug ? canonicalizeSlug(input.series_slug) : '') ||
    deriveSeriesSlug(slug) ||
    'standalone';
  const part_number =
    input?.part_number != null && String(input.part_number).trim() !== ''
      ? parseInt(input.part_number, 10) || extractPartNumber(slug)
      : extractPartNumber(slug);

  let priorPartsResult = { ok: true, parts: [], summary: '' };
  if (part_number > 1) {
    // Mandatory: load prior parts inside the handler (do not rely on the model
    // remembering to call fetch_full_text first).
    priorPartsResult = await loadPriorSeriesParts({
      email: ctx?.email,
      seriesSlug: series_slug,
      partNumber: part_number,
    });
    const gate = evaluatePriorPartsOutlineGate({
      partNumber: part_number,
      priorPartsResult,
    });
    if (!gate.allowed) {
      return {
        ok: false,
        gate: 'prior_parts_required',
        error: gate.error,
        missing_part: priorPartsResult.missing_part || null,
      };
    }
  }

  const saved = await saveDraft({
    email: ctx?.email,
    kind: 'journal',
    slug,
    title: input?.title || slug,
    content: outline,
    status: 'draft',
    series_slug,
    part_number,
    stage: 'outline',
    draft_id: input?.draft_id || input?.id || null,
    metadata: {
      brief: {
        prior_parts_summary: priorPartsResult.summary || null,
        prior_parts: (priorPartsResult.parts || []).map((p) => ({
          part_number: p.part_number,
          slug: p.slug,
          word_count: p.word_count,
          section_count: p.section_count,
          source: p.source,
        })),
      },
    },
  });

  if (!saved.ok) return saved;
  return {
    ok: true,
    stage: 'outline',
    slug: saved.slug,
    id: saved.id,
    series_slug: saved.series_slug,
    part_number: saved.part_number,
    outline_presented_at: saved.metadata?.brief?.outline_presented_at || null,
    prior_parts_summary: priorPartsResult.summary || null,
    prior_parts: priorPartsResult.parts || [],
    message:
      (priorPartsResult.summary ? `${priorPartsResult.summary}\n\n` : '') +
      `Outline saved (id: ${saved.id}). Pass draft_id="${saved.id}" on the save_draft call that writes the full piece — do not let it re-derive identity from the slug. ` +
      'Ask Bart to approve the outline before saving the full draft. ' +
      'If Bart says to skip the outline, call save_draft with skip_outline=true.',
  };
}

async function handleApproveDraft(input, ctx) {
  return approveDraft({ email: ctx?.email, slug: input?.slug });
}

/**
 * Persist a real target publish datetime for an approved (or soon-to-be-approved) journal.
 * Saying a date in chat is not enough — this tool writes scheduled_publish_at so the cron can publish.
 */
export async function handleScheduleJournalPublish(input, ctx) {
  const result = await setScheduledPublishAt({
    email: ctx?.email,
    slug: input?.slug,
    draft_id: input?.draft_id || null,
    scheduled_publish_at: input?.scheduled_publish_at,
  });
  if (!result.ok) return result;

  await logActivity({
    action_type: 'schedule_journal_publish',
    source: 'auto:schedule_journal_publish',
    reference_table: 'ao_content_drafts',
    reference_id: result.draft?.id || null,
    created_by_email: ctx?.email || null,
    detail: {
      slug: result.draft?.slug || input?.slug || null,
      scheduled_publish_at: result.scheduled_publish_at,
      status: result.draft?.status || null,
    },
  });

  return result;
}

/**
 * Publish an approved journal draft to the live site.
 * Bart's chat instruction to publish (after approve) is the confirmation —
 * no separate UI button / requires_ui_confirmation gate.
 */
export async function handlePublishJournal(input, ctx) {
  const slug = canonicalizeSlug(input?.slug);
  if (!slug) return { ok: false, error: 'slug is required' };

  const seriesSlugInput = input?.series_slug ? canonicalizeSlug(input.series_slug) : null;
  const partNumberInput =
    input?.part_number != null && String(input.part_number).trim() !== ''
      ? parseInt(input.part_number, 10) || null
      : null;

  const draftSelect =
    'id, slug, kind, series_slug, part_number, title, status, image_url, content, summary, metadata, approved_at, updated_at';

  let draft = null;
  const bySlug = await getBySlug({
    email: ctx?.email,
    slug,
    kind: 'journal',
    select: draftSelect,
  });
  if (!bySlug.ok) return { ok: false, error: bySlug.error || 'Draft lookup failed' };
  draft = bySlug.data;

  if (!draft && seriesSlugInput && partNumberInput) {
    const { data: fallback } = await contentDrafts()
      .select(draftSelect)
      .eq('kind', 'journal')
      .eq('series_slug', seriesSlugInput)
      .eq('part_number', partNumberInput)
      .maybeSingle();
    draft = fallback || null;
  }

  if (!draft) {
    return {
      ok: false,
      error: `No journal draft found for slug="${slug}". Save and approve the draft before publishing.`,
    };
  }

  if (draft.status === 'published') {
    return {
      ok: false,
      slug: draft.slug,
      error: `This draft is already published. Live URL: https://www.archetypeoriginal.com/journal/${draft.slug}`,
      journal_url: `https://www.archetypeoriginal.com/journal/${draft.slug}`,
    };
  }

  if (draft.status !== 'approved') {
    return {
      ok: false,
      slug: draft.slug,
      status: draft.status,
      error:
        "This draft isn't approved yet — approve it first, then I can publish it. Approving is the gate; publishing does not need a second button click.",
    };
  }

  const title = String(draft.title || '').trim() || slug;
  const content = String(draft.content || '').trim();
  if (!content) {
    return { ok: false, error: `Draft "${slug}" has no content to publish.` };
  }

  let summary = String(draft.summary || '').trim();
  if (!summary) {
    const plain = content
      .replace(/^#.+$/gm, '')
      .replace(/\*+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    summary = plain.slice(0, 280) || title;
  }

  const metaCategories = draft.metadata?.categories;
  const categories = Array.isArray(metaCategories) && metaCategories.length
    ? metaCategories.map(String)
    : ['Leadership', 'Servant Leadership'];

  const image_url = draft.image_url || '';
  if (!image_url) {
    return {
      ok: false,
      error: `No header image is saved for "${title}". Generate or upload a header image before publishing.`,
    };
  }

  // Caption completeness gate — content block and/or already-scheduled launch rows.
  let scheduledRows = [];
  try {
    const { data: existingScheduled } = await scheduledPosts()
      .select('platform, account_id, status')
      .eq('source_kind', 'journal_launch')
      .contains('intent', { journal_slug: draft.slug || slug })
      .neq('status', 'failed');
    scheduledRows = Array.isArray(existingScheduled) ? existingScheduled : [];
  } catch (schedErr) {
    console.warn(
      '[autoToolHandlers] caption schedule lookup failed (continuing with content only):',
      schedErr?.message || schedErr
    );
  }

  const captionsGate = evaluatePublishCaptionsGate(
    { content, slug: draft.slug || slug },
    scheduledRows
  );
  if (!captionsGate.ok) {
    return {
      ok: false,
      slug: draft.slug || slug,
      gate: 'captions_required',
      missing_channels: captionsGate.missing,
      error: captionsGate.error,
    };
  }

  const result = await publishJournalEntry({
    slug: draft.slug || slug,
    title,
    content,
    summary,
    publish_date: new Date().toISOString(),
    categories,
    image_url,
    featured_image: image_url,
    takeaways: [],
    notify: true,
    notify_delay_ms: 300000,
    series_slug: draft.series_slug || seriesSlugInput,
    part_number: draft.part_number || partNumberInput,
  });

  const { httpStatus, ...body } = result || {};
  if (!body?.ok) return body;

  const {
    JOURNAL_LAUNCH_REQUIRED_CHANNELS,
    JOURNAL_LAUNCH_MANUAL_CHANNELS,
    extractAllCaptionTextsByPlatform,
  } = await import('./parseJournalSocialCaptions.js');

  let launchRows = [];
  try {
    const { data } = await scheduledPosts()
      .select('platform, account_id, scheduled_at, status, intent')
      .eq('source_kind', 'journal_launch')
      .contains('intent', { journal_slug: draft.slug || slug })
      .neq('status', 'failed')
      .neq('status', 'cancelled');
    launchRows = Array.isArray(data) ? data : [];
  } catch (_) {
    launchRows = [];
  }

  const auto_scheduled = launchRows
    .map((row) => {
      const match = JOURNAL_LAUNCH_REQUIRED_CHANNELS.find(
        (ch) =>
          ch.platform === String(row.platform || '').toLowerCase() &&
          ch.account_id === String(row.account_id || '').toLowerCase()
      );
      return {
        channel: match?.key || row.intent?.channel_label || row.platform,
        platform: row.platform,
        account_id: row.account_id,
        scheduled_at: row.scheduled_at,
        status: row.status,
      };
    })
    .filter((r) => r.channel);

  const allCaptions = extractAllCaptionTextsByPlatform(content);
  const autoKeys = new Set(JOURNAL_LAUNCH_REQUIRED_CHANNELS.map((ch) => ch.key));
  const manual_channels = JOURNAL_LAUNCH_MANUAL_CHANNELS.map((ch) => ({
    channel: ch.key,
    label: ch.label,
    caption_text: allCaptions[ch.key] || '',
  })).filter((ch) => ch.caption_text);

  // Also include any non-auto caption keys present that aren't in the manual list.
  for (const [key, text] of Object.entries(allCaptions)) {
    if (autoKeys.has(key)) continue;
    if (manual_channels.some((m) => m.channel === key)) continue;
    if (!String(text || '').trim()) continue;
    manual_channels.push({ channel: key, label: key, caption_text: text });
  }

  const journalUrl =
    body.journal_url || `https://www.archetypeoriginal.com/journal/${draft.slug || slug}`;
  const autoLines = auto_scheduled
    .map((r) => `- ${r.channel} — ${r.scheduled_at || 'queued'}`)
    .join('\n');
  const manualBlocks = manual_channels
    .map((m) => `**${m.label || m.channel}**\n${m.caption_text}`)
    .join('\n\n');

  let message = `✅ Published: ${journalUrl}`;
  if (autoLines) {
    message += `\n\nAuto-scheduled:\n${autoLines}`;
  }
  if (manualBlocks) {
    message += `\n\nPost these manually — no auto-posting for these channels yet:\n\n${manualBlocks}`;
  }

  return {
    ...body,
    journal_url: journalUrl,
    auto_scheduled,
    manual_channels,
    message,
  };
}

async function attachImageUrlToDraft({ email, slug, imageUrl, kind = 'journal' }) {
  return attachImageUrl({ email, slug, imageUrl, kind });
}

/**
 * Resolve reference_image_urls for generate_image — model input plus server-side
 * fallbacks (chat attachment, draft correction image, series, resurface).
 * Exported for regression selftests.
 */
export async function resolveGenerateImageReferenceUrls(input, ctx) {
  const content_type = input?.content_type || 'journal_header';
  const series_slug = input?.series_slug ? canonicalizeSlug(input.series_slug) : null;
  const slug = canonicalizeSlug(input?.slug);
  const intent = String(input?.intent || '').trim();

  let reference_image_urls = [];
  if (Array.isArray(input?.reference_image_urls)) {
    reference_image_urls = input.reference_image_urls
      .map((u) => String(u || '').trim())
      .filter(Boolean);
  } else if (typeof input?.reference_image_urls === 'string' && input.reference_image_urls.trim()) {
    reference_image_urls = [input.reference_image_urls.trim()];
  }

  const thisTurnRefs = Array.isArray(ctx?.chatAttachedImageUrlsThisTurn)
    ? ctx.chatAttachedImageUrlsThisTurn.filter(Boolean)
    : [];
  const priorTurnRefs = Array.isArray(ctx?.chatAttachedImageUrlsPrior)
    ? ctx.chatAttachedImageUrlsPrior.filter(Boolean)
    : [];

  // Chat-attached reference this turn — stronger than a stale prior headshot or draft redo.
  if (reference_image_urls.length === 0 && thisTurnRefs.length) {
    reference_image_urls = [thisTurnRefs[0]];
  }

  // Correction-round fallback: edit this post's current header, not restart from headshot.
  if (reference_image_urls.length === 0 && intent === 'header_image_for_post' && slug) {
    try {
      const lookup =
        typeof ctx?._testGetBySlug === 'function'
          ? ctx._testGetBySlug
          : (args) => getBySlug(args);
      const existing = await lookup({
        email: ctx?.email,
        slug,
        kind: 'journal',
        select: 'image_url',
      });
      if (existing?.ok && existing?.data?.image_url) {
        reference_image_urls = [String(existing.data.image_url).trim()];
      }
    } catch (err) {
      console.warn('[autoToolHandlers] existing draft image lookup:', err?.message || err);
    }
  }

  // Direct Image correction fallback: last attach_for_reference result in this thread.
  if (reference_image_urls.length === 0 && intent === 'attach_for_reference' && ctx?.threadId) {
    try {
      const loadLast =
        typeof ctx?._testLoadLastDirectImageUrl === 'function'
          ? ctx._testLoadLastDirectImageUrl
          : async (tid) => {
              const { loadLastDirectImageUrl } = await import('./directImageResultFact.js');
              return loadLastDirectImageUrl(tid);
            };
      const lastUrl = await loadLast(ctx.threadId);
      if (lastUrl) reference_image_urls = [lastUrl];
    } catch (err) {
      console.warn('[autoToolHandlers] last direct image lookup:', err?.message || err);
    }
  }

  // Prior-turn chat attachments ("use that photo" on a later turn).
  if (reference_image_urls.length === 0 && priorTurnRefs.length) {
    reference_image_urls = [priorTurnRefs[0]];
  }

  // Series continuity: if no explicit references, pull prior part image_url from memory.
  if (reference_image_urls.length === 0 && series_slug) {
    try {
      const parts = await getImageSeriesContext(ctx?.email, series_slug);
      const withUrl = (parts || []).filter((p) => p?.image_url).sort((a, b) => {
        const an = Number(a.part_number) || 0;
        const bn = Number(b.part_number) || 0;
        return bn - an;
      });
      if (withUrl[0]?.image_url) {
        reference_image_urls = [withUrl[0].image_url];
      }
    } catch (err) {
      console.warn('[autoToolHandlers] series reference lookup:', err?.message || err);
    }
  }

  // Resurface convention: if content_type is resurface and still no refs, attach a real Bart photo.
  if (reference_image_urls.length === 0 && String(content_type).toLowerCase() === 'resurface') {
    try {
      const { pickBartPhotoUrl, buildResurfaceImagePlan } = await import('./bartPhotoReferences.js');
      const plan = buildResurfaceImagePlan({
        title: slug || series_slug || 'resurface',
        pullQuote: String(input?.pull_quote || '').trim(),
        mood: String(input?.prompt_description || '').trim(),
      });
      if (plan.photo_url) reference_image_urls = [plan.photo_url];
      else {
        const fallback = pickBartPhotoUrl({ mood: String(input?.prompt_description || '').trim() });
        if (fallback) reference_image_urls = [fallback];
      }
    } catch (err) {
      console.warn('[autoToolHandlers] resurface photo pick:', err?.message || err);
    }
  }

  return reference_image_urls;
}

/**
 * Likeness check must use a real photo of Bart, not the last AI output used
 * for compositional continuity. This-turn chat attachment wins; otherwise the
 * latest real chat-attached photo on the thread; otherwise generation refs
 * (resurface Bart-*.jpg is already a true original).
 */
export async function resolveVerificationReferenceUrls(reference_image_urls, ctx) {
  const thisTurnRefs = Array.isArray(ctx?.chatAttachedImageUrlsThisTurn)
    ? ctx.chatAttachedImageUrlsThisTurn.filter(Boolean)
    : [];
  if (thisTurnRefs.length) return [thisTurnRefs[0]];

  if (ctx?.threadId) {
    try {
      const loadOriginal =
        typeof ctx?._testLoadOriginalChatAttachedImageUrl === 'function'
          ? ctx._testLoadOriginalChatAttachedImageUrl
          : async (tid) => {
              const { loadOriginalChatAttachedImageUrl } = await import(
                './chatAttachedImageFact.js'
              );
              return loadOriginalChatAttachedImageUrl(tid);
            };
      const originalUrl = await loadOriginal(ctx.threadId);
      if (originalUrl) return [originalUrl];
    } catch (err) {
      console.warn('[autoToolHandlers] original reference lookup:', err?.message || err);
    }
  }

  return Array.isArray(reference_image_urls) ? reference_image_urls : [];
}

export async function handleGenerateImage(input, ctx) {
  const intent = String(input?.intent || '').trim();
  if (!['attach_for_reference', 'header_image_for_post'].includes(intent)) {
    return { ok: false, error: `Invalid intent "${intent}"` };
  }
  const prompt_description = String(input?.prompt_description || '').trim();
  if (!prompt_description) return { ok: false, error: 'prompt_description is required' };
  const slug = canonicalizeSlug(input?.slug);
  if (intent === 'header_image_for_post' && !slug) {
    return { ok: false, error: 'slug is required when intent is header_image_for_post' };
  }

  const size = input?.size || '1536x1024';
  const content_type = input?.content_type || 'journal_header';
  const series_slug = input?.series_slug ? canonicalizeSlug(input.series_slug) : null;
  const part_number =
    input?.part_number != null && input.part_number !== ''
      ? parseInt(input.part_number, 10) || null
      : null;

  const reference_image_urls = await resolveGenerateImageReferenceUrls(input, ctx);
  const verificationReferenceUrls = await resolveVerificationReferenceUrls(
    reference_image_urls,
    ctx
  );

  let generated = await generateDesignImage({
    prompt: prompt_description,
    content_type,
    title: slug || series_slug || 'AO image',
    size,
    referenceImageUrls: reference_image_urls,
  });
  if (!generated?.ok || !generated.image_url) {
    return { ok: false, error: generated?.error || 'Image generation failed' };
  }

  let likeness_verified = null;
  let likeness_note = null;

  if (verificationReferenceUrls.length > 0) {
    const MAX_LIKENESS_RETRIES = 2;
    const { verifyImageLikeness } = await import('./verifyImageLikeness.js');
    let attempt = 0;
    let currentGenerated = generated;
    let currentPrompt = prompt_description;

    while (attempt <= MAX_LIKENESS_RETRIES) {
      const check = await verifyImageLikeness({
        referenceImageUrls: verificationReferenceUrls,
        generatedImageUrl: currentGenerated.image_url,
      });

      if (!check.ok) {
        likeness_verified = null;
        likeness_note = check.reason;
        break;
      }
      if (check.match) {
        likeness_verified = true;
        likeness_note = check.reason || null;
        break;
      }

      likeness_verified = false;
      likeness_note = check.reason;
      attempt += 1;
      if (attempt > MAX_LIKENESS_RETRIES) break;

      currentPrompt = `${currentPrompt}\n\nIMPORTANT CORRECTION: the previous attempt did not match the reference photo's actual likeness (${check.reason}). Correct this specifically while keeping everything else the same.`;
      const retryGenerated = await generateDesignImage({
        prompt: currentPrompt,
        content_type,
        title: slug || series_slug || 'AO image',
        size,
        referenceImageUrls: reference_image_urls,
      });
      if (!retryGenerated?.ok || !retryGenerated.image_url) break;
      currentGenerated = retryGenerated;
    }

    generated = currentGenerated;
  }

  let attach = { attached: false };
  if (intent === 'header_image_for_post') {
    attach = await attachImageUrlToDraft({
      email: ctx?.email,
      slug,
      imageUrl: generated.image_url,
      kind: 'journal',
    });
    if (series_slug && part_number != null) {
      try {
        let postTitle = null;
        if (slug) {
          const draftLookup = await getBySlug({
            email: ctx?.email,
            slug,
            kind: 'journal',
            select: 'id, slug, title',
          });
          if (draftLookup.ok && draftLookup.data?.title) {
            postTitle = String(draftLookup.data.title).trim();
          }
        }
        await storeImageSeriesMemory({
          email: ctx?.email,
          seriesSlug: series_slug,
          partSlug: slug || `${series_slug}-part-${part_number}`,
          partNumber: part_number,
          postTitle,
          imageUrl: generated.image_url,
          prompt: prompt_description,
        });
      } catch (err) {
        console.warn('[autoToolHandlers] storeImageSeriesMemory:', err?.message || err);
      }
    }
  }

  if (
    intent === 'attach_for_reference' &&
    ctx?.email &&
    ctx?.threadId &&
    generated?.image_url
  ) {
    try {
      const { recordDirectImageResultFact } = await import('./directImageResultFact.js');
      await recordDirectImageResultFact({
        email: ctx.email,
        threadId: ctx.threadId,
        imageUrl: generated.image_url,
        promptDescription: prompt_description,
      });
    } catch (err) {
      console.warn('[autoToolHandlers] direct image result fact:', err?.message || err);
    }
  }

  try {
    await logActivity({
      action_type: 'design_image_generated',
      source: 'autoToolHandlers:generate_image',
      created_by_email: ctx?.email || null,
      detail: {
        intent,
        slug,
        series_slug,
        part_number,
        image_url: generated.image_url,
        endpoint: generated.endpoint || null,
        reference_count: generated.reference_count || 0,
        reference_image_urls,
        verification_reference_urls: verificationReferenceUrls,
        likeness_verified,
        likeness_note,
      },
    });
  } catch (_) {
    /* non-fatal */
  }

  return {
    ok: true,
    intent,
    slug: slug || null,
    series_slug,
    part_number,
    size,
    image_url: generated.image_url,
    path: generated.path || null,
    endpoint: generated.endpoint || null,
    reference_count: generated.reference_count || 0,
    reference_image_urls,
    likeness_verified,
    likeness_note,
    attached_to_draft: !!attach.attached,
    attached_slug: attach.slug || null,
    message:
      intent === 'header_image_for_post'
        ? attach.attached
          ? `Header image generated and saved to draft ${attach.slug}.`
          : 'Header image generated but no matching draft was found to attach it to.'
        : 'Reference image generated (not attached as a post header).',
  };
}

async function handleScheduleCaptions(input, ctx) {
  const slug = canonicalizeSlug(input?.slug);
  if (!slug) return { ok: false, error: 'slug is required' };
  const captions = input?.captions;
  if (!captions || typeof captions !== 'object') {
    return { ok: false, error: 'captions object is required' };
  }

  const structural = evaluateCaptionQualityGate(captions);
  if (!structural.ok) {
    return {
      ok: false,
      gate: 'caption_quality',
      failures: structural.failures,
      error: structural.error,
    };
  }

  const { evaluateCaptionEngagementQuality } = await import('./captionEngagementQuality.js');
  const engagement = await evaluateCaptionEngagementQuality(captions, {
    postTitle: input?.title || null,
    postSummary: input?.summary || input?.post_summary || null,
  });
  if (!engagement.ok) {
    return {
      ok: false,
      gate: 'caption_engagement_quality',
      failures: engagement.failures,
      error: engagement.error,
      guidance_used: engagement.guidance_used || null,
    };
  }

  return scheduleJournalLaunchCaptions({
    email: ctx?.email,
    slug,
    title: input?.title || null,
    captions,
    scheduled_publish_at: input?.scheduled_publish_at || null,
  });
}

async function handleGetRecommendedSchedule(input) {
  const { getRecommendedSchedule } = await import('./scheduleHeuristic.js');
  const platforms = input?.platform
    ? [input.platform]
    : input?.platforms || input?.channels || undefined;
  const count = input?.count;
  return getRecommendedSchedule({ platforms, channels: platforms, count });
}

async function handleGetCaptionLengthPerformance(input) {
  const { getCaptionLengthPerformance } = await import('./postMetrics.js');
  return getCaptionLengthPerformance({ platform: input?.platform || null });
}

/** Read-only: current draft publish target + journal_launch caption rows. */
export async function handleGetScheduleStatus(input, ctx) {
  return getScheduleStatus({
    slug: input?.slug,
    email: ctx?.email || null,
  });
}

async function handleListStatedPreferences(_input, ctx = {}) {
  const email = ctx?.email || process.env.AO_OWNER_EMAIL;
  const { listActiveStatedPreferences } = await import('./statedPreferences.js');
  const result = await listActiveStatedPreferences(email, { limit: 30 });
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    count: result.preferences.length,
    preferences: result.preferences.map((p) => ({
      id: p.id,
      fact: p.fact,
      category: p.category,
      stated_at: p.stated_at,
    })),
  };
}

async function handleForgetStatedPreference(input, ctx = {}) {
  const email = ctx?.email || process.env.AO_OWNER_EMAIL;
  const { supersedeStatedPreference } = await import('./statedPreferences.js');
  return supersedeStatedPreference({
    email,
    preferenceId: input?.preference_id || input?.id || null,
    factContains: input?.fact_contains || input?.fact || null,
    supersededBy: 'forgotten_by_tool',
  });
}

async function handleGenerateQuoteCard(input, ctx) {
  const quote_text = String(input?.quote_text || '').trim();
  const source_slug = canonicalizeSlug(input?.source_slug);
  if (!quote_text) return { ok: false, error: 'quote_text is required' };
  if (!source_slug) return { ok: false, error: 'source_slug is required' };

  // Phase 2 gate: refuse cards whose quote is not a near-exact substring of source content.
  const verified = await handleVerifyQuote({ quote_text, source_slug }, ctx);
  if (!verified?.verified) {
    return {
      ok: false,
      verified: false,
      source_slug,
      quote_text,
      error:
        verified?.error ||
        'Quote failed verification against source content. Fetch the real text and try again.',
    };
  }

  const card = await generateQuoteCardImage({
    line1: quote_text,
    line2: '',
    theme: 'dark',
  });
  if (!card?.ok || !card.image_url) {
    return { ok: false, error: card?.error || 'Quote card generation failed' };
  }

  return {
    ok: true,
    verified: true,
    source_slug,
    quote_text,
    image_url: card.image_url,
    path: card.path || null,
    filename: card.filename || null,
  };
}

async function handleTriggerReshare(input) {
  const slug = input?.slug ? canonicalizeSlug(input.slug) : null;
  try {
    const { runReshareCycle } = await import('../../api/ao/auto/reshare-journal.js');
    const result = await runReshareCycle(slug || null);
    if (!result?.ok) {
      return {
        ok: false,
        error: result?.error || result?.detail || 'Reshare engine did not complete',
        slug,
      };
    }
    return {
      ok: true,
      slug: slug || result.journal_slug || null,
      title: result.title || null,
      journal_url: result.journal_url || null,
      selection_reason: result.selection_reason || null,
      pull_quote: result.pull_quote || null,
      captions: result.captions || null,
      image_url: result.image_url || null,
      photo: result.photo || null,
      signal_strength: result.signal_strength || null,
      opportunity_id: result.opportunity_id || null,
      signal_source_name: result.signal_source_name || null,
      signal_summary: result.signal_summary || null,
      message: result.message || 'Reshare cycle completed (pending review).',
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err), slug };
  }
}

async function handleFetchFullText(input, ctx) {
  const target_type = String(input?.target_type || '').trim();
  const slug = canonicalizeSlug(input?.slug);
  if (!['corpus_document', 'draft'].includes(target_type)) {
    return { ok: false, error: `Invalid target_type "${target_type}"` };
  }
  if (!slug) return { ok: false, error: 'slug is required' };

  if (target_type === 'draft') {
    const email = ctx?.email;
    if (!email) return { ok: false, error: 'No authenticated email for draft fetch' };
    const { data, error } = await contentDrafts()
      .select('slug, title, kind, status, content, image_url, updated_at')
      .eq('created_by_email', email.toLowerCase().trim())
      .eq('slug', slug)
      .in('kind', ['journal', 'devotional'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: `No draft found for slug "${slug}"` };
    if (!data.content) {
      return {
        ok: false,
        error: `Draft "${slug}" exists but content is empty`,
        image_url: data.image_url || null,
      };
    }
    return {
      ok: true,
      target_type,
      slug: data.slug,
      title: data.title,
      kind: data.kind,
      status: data.status,
      content: data.content,
      image_url: data.image_url || null,
    };
  }

  // corpus_document — prefer knowledge.json body, then markdown file.
  try {
    const fs = await import('fs');
    const path = await import('path');
    const root = process.cwd();
    const knowledgePath = path.join(root, 'public/knowledge.json');
    if (fs.existsSync(knowledgePath)) {
      const docs = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
      const list = Array.isArray(docs) ? docs : docs?.documents || docs?.entries || [];
      const hit = list.find((d) => d?.slug === slug);
      if (hit?.body || hit?.content) {
        return {
          ok: true,
          target_type,
          slug,
          title: hit.title || slug,
          publish_date: hit.publish_date || hit.date || null,
          summary: hit.summary || hit.email_summary || '',
          content: String(hit.body || hit.content).trim(),
        };
      }
    }
    const candidates = [
      path.join(root, 'ao-knowledge-hq-kit/journal', `${slug}.md`),
      path.join(root, 'ao-knowledge-hq-kit/journal/devotionals', `${slug}.md`),
      path.join(root, 'ao-knowledge-hq-kit/faqs', `${slug}.md`),
    ];
    for (const filePath of candidates) {
      if (!fs.existsSync(filePath)) continue;
      const raw = fs.readFileSync(filePath, 'utf8');
      const fmEnd = raw.indexOf('\n---', 3);
      const body = fmEnd >= 0 ? raw.slice(fmEnd + 4).trim() : raw.trim();
      const title = ((raw.match(/^title:\s*(.+)$/m) || [])[1] || slug).trim().replace(/^['"]|['"]$/g, '');
      return { ok: true, target_type, slug, title, content: body };
    }
    return { ok: false, error: `Corpus document not found for slug "${slug}"` };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

async function handleVerifyQuote(input, ctx = {}) {
  const quote_text = String(input?.quote_text || '').trim();
  const source_slug = canonicalizeSlug(input?.source_slug);
  if (!quote_text) return { ok: false, error: 'quote_text is required' };
  if (!source_slug) return { ok: false, error: 'source_slug is required' };

  const fetched = await handleFetchFullText({ target_type: 'corpus_document', slug: source_slug }, ctx);
  if (!fetched.ok) {
    // Try draft as fallback
    const draftFetch = await handleFetchFullText({ target_type: 'draft', slug: source_slug }, ctx);
    if (!draftFetch.ok) return { ok: false, verified: false, error: fetched.error };
    return verifyAgainstBody(quote_text, source_slug, draftFetch.content);
  }
  return verifyAgainstBody(quote_text, source_slug, fetched.content);
}

function normalizeForQuoteMatch(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s'"]/g, '')
    .trim();
}

function verifyAgainstBody(quote_text, source_slug, body) {
  const q = normalizeForQuoteMatch(quote_text);
  const b = normalizeForQuoteMatch(body);
  const verified = q.length >= 12 && b.includes(q);
  return {
    ok: verified,
    verified,
    source_slug,
    quote_text,
    error: verified ? undefined : 'Quote text was not found as a near-exact substring of the source document.',
  };
}

/**
 * Execute one client tool by name.
 * @returns {Promise<object>} JSON-serializable tool_result payload
 */
export async function executeAutoTool(name, input, ctx = {}) {
  try {
    switch (name) {
      case 'save_draft':
        return await handleSaveDraft(input, ctx);
      case 'present_outline':
        return await handlePresentOutline(input, ctx);
      case 'approve_draft':
        return await handleApproveDraft(input, ctx);
      case 'publish_journal':
        return await handlePublishJournal(input, ctx);
      case 'schedule_journal_publish':
        return await handleScheduleJournalPublish(input, ctx);
      case 'generate_image':
        return await handleGenerateImage(input, ctx);
      case 'schedule_captions':
        return await handleScheduleCaptions(input, ctx);
      case 'get_recommended_schedule':
        return await handleGetRecommendedSchedule(input, ctx);
      case 'get_caption_length_performance':
        return await handleGetCaptionLengthPerformance(input, ctx);
      case 'get_schedule_status':
        return await handleGetScheduleStatus(input, ctx);
      case 'list_stated_preferences':
        return await handleListStatedPreferences(input, ctx);
      case 'forget_stated_preference':
        return await handleForgetStatedPreference(input, ctx);
      case 'generate_quote_card':
        return await handleGenerateQuoteCard(input, ctx);
      case 'trigger_reshare':
        return await handleTriggerReshare(input, ctx);
      case 'fetch_full_text':
        return await handleFetchFullText(input, ctx);
      case 'verify_quote':
        return await handleVerifyQuote(input, ctx);
      default:
        return { ok: false, error: `Unknown or unsupported client tool: ${name}` };
    }
  } catch (err) {
    console.error(`[autoToolHandlers] ${name} threw:`, err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Exported for regression selftests — production callers should use executeAutoTool. */
export { handleSaveDraft, handlePresentOutline };

export function getEnabledClientToolSchemas(enabledNames) {
  // Lazy import to avoid circular init issues at module load in some runners.
  // Caller should pass AUTO_TOOL_SCHEMAS filtered by name.
  return enabledNames;
}
