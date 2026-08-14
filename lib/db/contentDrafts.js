/**
 * Sanctioned access layer for ao_content_drafts.
 *
 * The literal from() call for this table must appear ONLY in this file.
 * Identity is always (created_by_email, slug, kind) — never series_slug/part_number alone.
 * Enforced by scripts/verify-no-direct-table-access.mjs at build time.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { insertVersion } from './contentDraftVersions.js';

/** Slug length above which a brand-new full journal without draft_id is treated as ambiguous. */
export const AMBIGUOUS_NEW_DRAFT_SLUG_THRESHOLD = 50;

/** Same threshold as waypointGates.isFullLengthDraftContent (kept local to avoid circular import). */
const FULL_DRAFT_CONTENT_THRESHOLD = 800;

function isFullLengthDraftContent(content) {
  return String(content || '').trim().length > FULL_DRAFT_CONTENT_THRESHOLD;
}

/** Query builder for this table. Prefer named helpers for identity-sensitive writes. */
export function contentDrafts() {
  return supabaseAdmin.from('ao_content_drafts');
}

export function canonicalizeSlug(raw) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function extractPartNumber(slug) {
  const match = String(slug || '').match(/-part-(\d+)/i);
  return match ? parseInt(match[1], 10) : 1;
}

export function deriveSeriesSlug(slug) {
  return String(slug || '').replace(/-part-\d+.*$/i, '') || slug;
}

/**
 * Resolve draft identity by (email, slug, kind).
 */
export async function getBySlug({
  email,
  slug,
  kind,
  select = 'id, slug, kind, series_slug, part_number, title, status, image_url, content, approved_at, updated_at, created_at',
}) {
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  const targetSlug = canonicalizeSlug(slug);
  if (!emailNorm || !targetSlug || !kind) {
    return { ok: false, error: 'email, slug, and kind are required', data: null };
  }

  const { data, error } = await contentDrafts()
    .select(select)
    .eq('created_by_email', emailNorm)
    .eq('slug', targetSlug)
    .eq('kind', kind)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, data: null };
  return { ok: true, data: data || null };
}

/**
 * Find a non-published journal draft by series_slug + part_number for an owner.
 * Used to prevent silent forks when the model invents a paraphrased slug.
 */
export async function getBySeriesPart({
  email,
  series_slug,
  part_number,
  kind = 'journal',
  select = 'id, slug, kind, series_slug, part_number, title, status, image_url, content, metadata, updated_at',
}) {
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  const series = canonicalizeSlug(series_slug);
  const part =
    part_number != null && String(part_number).trim() !== ''
      ? parseInt(part_number, 10) || null
      : null;
  if (!emailNorm || !series || !part) {
    return { ok: false, error: 'email, series_slug, and part_number are required', data: null };
  }

  const { data, error } = await contentDrafts()
    .select(select)
    .eq('created_by_email', emailNorm)
    .eq('kind', kind)
    .eq('series_slug', series)
    .eq('part_number', part)
    .neq('status', 'published')
    .neq('status', 'abandoned')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, data: null };
  return { ok: true, data: data || null };
}

function normalizeContentForDiff(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Upsert draft by (created_by_email, slug, kind).
 * series_slug / part_number are metadata only — reused from existing row when omitted.
 * Optional `metadata` is shallow-merged; nested `metadata.brief` is deep-merged.
 * Optional `stage: 'outline'` records outline_presented_at on metadata.brief.
 */
export async function saveDraft({
  email,
  kind,
  slug,
  title,
  content,
  status = 'draft',
  series_slug: inputSeriesSlug,
  part_number: inputPartNumber,
  metadata: inputMetadata = null,
  stage = null,
  draft_id: inputDraftId = null,
  confirmed_new: inputConfirmedNew = false,
}) {
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  if (!emailNorm) return { ok: false, error: 'No authenticated email for save_draft' };

  const kindNorm = String(kind || '').trim();
  if (!['journal', 'devotional', 'captions'].includes(kindNorm)) {
    return { ok: false, error: `Invalid kind "${kindNorm}"` };
  }

  let slugNorm = canonicalizeSlug(slug);
  const titleNorm = String(title || '').trim() || slugNorm;
  const contentNorm = String(content || '').trim();
  const statusNorm = String(status || 'draft').trim();
  if (!slugNorm) return { ok: false, error: 'slug is required' };
  if (!contentNorm) return { ok: false, error: 'content is required' };
  if (!['draft', 'approved'].includes(statusNorm)) {
    return { ok: false, error: `Invalid status "${statusNorm}"` };
  }

  let redirectedFromSlug = null;
  let existing = null;

  // Prefer explicit draft_id when provided.
  if (inputDraftId) {
    const { data: byId, error: byIdErr } = await contentDrafts()
      .select(
        'id, slug, kind, series_slug, part_number, title, status, image_url, content, metadata'
      )
      .eq('id', inputDraftId)
      .eq('created_by_email', emailNorm)
      .maybeSingle();
    if (byIdErr) return { ok: false, error: byIdErr.message };
    if (byId) {
      existing = byId;
      if (canonicalizeSlug(byId.slug) !== slugNorm) {
        redirectedFromSlug = slugNorm;
        slugNorm = canonicalizeSlug(byId.slug);
      }
    }
  }

  if (!existing) {
    const existingResult = await getBySlug({
      email: emailNorm,
      slug: slugNorm,
      kind: kindNorm,
      select: 'id, slug, kind, series_slug, part_number, title, status, image_url, content, metadata',
    });
    existing = existingResult.data;
  }

  const inputSeries = inputSeriesSlug ? canonicalizeSlug(inputSeriesSlug) : '';
  const inputPartProvided = inputPartNumber != null && inputPartNumber !== '';
  let series_slug =
    inputSeries ||
    (existing?.series_slug ? String(existing.series_slug) : '') ||
    deriveSeriesSlug(slugNorm) ||
    'standalone';
  let part_number = inputPartProvided
    ? parseInt(inputPartNumber, 10) || 1
    : existing?.part_number != null
      ? parseInt(existing.part_number, 10) || 1
      : extractPartNumber(slugNorm);

  // Anti-fork: when there is NO row at this slug yet, but this series+part already
  // has a non-published journal draft under a different slug, update that tracked
  // row instead of inserting a paraphrased duplicate. If a row already exists at
  // this exact slug, slug+kind identity wins (do not steal another series row).
  if (kindNorm === 'journal' && series_slug && part_number && !existing) {
    const seriesHit = await getBySeriesPart({
      email: emailNorm,
      series_slug,
      part_number,
      kind: 'journal',
    });
    if (seriesHit.ok && seriesHit.data?.id) {
      existing = seriesHit.data;
      if (canonicalizeSlug(seriesHit.data.slug) !== slugNorm) {
        redirectedFromSlug = slugNorm;
        slugNorm = canonicalizeSlug(seriesHit.data.slug);
      }
      series_slug = String(seriesHit.data.series_slug || series_slug);
      part_number = parseInt(seriesHit.data.part_number, 10) || part_number;
    }
  }

  // Ambiguous-identity backstop: long chat-sentence slugs + full journal body
  // with no resolved row are almost always lost-track forks, not new posts.
  const confirmedNew = !!(inputConfirmedNew === true || inputConfirmedNew === 'true');
  if (
    !existing &&
    kindNorm === 'journal' &&
    !confirmedNew &&
    slugNorm.length > AMBIGUOUS_NEW_DRAFT_SLUG_THRESHOLD &&
    isFullLengthDraftContent(contentNorm)
  ) {
    return {
      ok: false,
      gate: 'ambiguous_new_draft',
      error:
        'This looks like a continuation of an existing draft (very long slug + full journal length) but no draft_id / matching slug / series+part was found. Pass draft_id (or series_slug + part_number) for the piece you are continuing, or retry with confirmed_new=true only if this is genuinely a brand-new unrelated post.',
    };
  }

  const priorContent = existing?.content != null ? String(existing.content) : null;
  const priorTitle = existing?.title != null ? String(existing.title) : null;
  const contentUnchanged =
    priorContent != null &&
    normalizeContentForDiff(priorContent) === normalizeContentForDiff(contentNorm);

  // Persist pre-overwrite snapshot before replacing content (every save, full history).
  let versionId = null;
  if (existing?.id && priorContent != null) {
    const versionResult = await insertVersion({
      draftId: existing.id,
      content: priorContent,
      title: priorTitle,
      email: emailNorm,
    });
    if (!versionResult.ok) {
      return {
        ok: false,
        error: `Failed to save draft version history: ${versionResult.error}`,
      };
    }
    versionId = versionResult.version?.id || null;
  }

  const priorMeta =
    existing?.metadata && typeof existing.metadata === 'object' ? { ...existing.metadata } : {};
  let metadata = { ...priorMeta };
  if (inputMetadata && typeof inputMetadata === 'object') {
    const incomingBrief =
      inputMetadata.brief && typeof inputMetadata.brief === 'object' ? inputMetadata.brief : null;
    metadata = { ...metadata, ...inputMetadata };
    if (incomingBrief) {
      const priorBrief =
        priorMeta.brief && typeof priorMeta.brief === 'object' ? priorMeta.brief : {};
      metadata.brief = { ...priorBrief, ...incomingBrief };
    }
  }
  if (String(stage || '').trim() === 'outline') {
    const priorBrief = metadata.brief && typeof metadata.brief === 'object' ? metadata.brief : {};
    metadata.brief = {
      ...priorBrief,
      outline_text: contentNorm,
      outline_presented_at: new Date().toISOString(),
    };
  }

  const row = {
    created_by_email: emailNorm,
    kind: kindNorm,
    series_slug,
    part_number,
    title: titleNorm,
    slug: slugNorm,
    content: contentNorm,
    status: statusNorm,
    image_url: existing?.image_url || null,
    metadata,
    updated_at: new Date().toISOString(),
  };
  if (statusNorm === 'approved') {
    row.approved_at = new Date().toISOString();
  }

  const { data, error } = await contentDrafts()
    .upsert(row, {
      onConflict: 'created_by_email,slug,kind',
      ignoreDuplicates: false,
    })
    .select('id, slug, kind, status, series_slug, part_number, title, metadata')
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    id: data?.id || existing?.id || null,
    slug: data?.slug || slugNorm,
    kind: data?.kind || kindNorm,
    status: data?.status || statusNorm,
    series_slug: data?.series_slug || series_slug,
    part_number: data?.part_number != null ? data.part_number : part_number,
    title: data?.title || titleNorm,
    metadata: data?.metadata || metadata,
    content_unchanged: contentUnchanged,
    had_prior_version: priorContent != null,
    prior_content_length: priorContent != null ? priorContent.length : 0,
    content_length: contentNorm.length,
    redirected_from_slug: redirectedFromSlug,
    version_id: versionId,
    version_saved: Boolean(versionId),
  };
}

export async function approveDraft({ email, slug }) {
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  const targetSlug = canonicalizeSlug(slug);
  if (!emailNorm) return { ok: false, error: 'No authenticated email for approve_draft' };
  if (!targetSlug) return { ok: false, error: 'slug is required' };

  const { data, error } = await contentDrafts()
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('created_by_email', emailNorm)
    .eq('slug', targetSlug)
    .neq('status', 'published')
    .neq('status', 'abandoned')
    .select('id, slug, title, status, kind')
    .limit(1);

  if (error) return { ok: false, error: error.message };
  if (!data?.length) {
    return { ok: false, error: `No pending draft found for slug "${targetSlug}"` };
  }
  return {
    ok: true,
    slug: data[0].slug,
    title: data[0].title,
    status: data[0].status,
    kind: data[0].kind,
  };
}

export async function attachImageUrl({ email, slug, imageUrl, kind = 'journal' }) {
  if (!email || !imageUrl) return { attached: false };
  const emailNorm = String(email).toLowerCase().trim();
  const targetSlug = canonicalizeSlug(slug);
  if (!targetSlug) return { attached: false };

  const { data, error } = await contentDrafts()
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('created_by_email', emailNorm)
    .eq('slug', targetSlug)
    .eq('kind', kind)
    .neq('status', 'published')
    .neq('status', 'abandoned')
    .select('id, slug')
    .limit(1);

  if (!error && data?.length) {
    return { attached: true, id: data[0].id, slug: data[0].slug };
  }
  return { attached: false };
}

/**
 * Mark draft published by slug identity (email + slug + kind when known).
 */
export async function markPublished({
  email,
  slug,
  kind,
  id,
  selectAfter = 'id, slug, status',
}) {
  const emailNorm = email
    ? String(email)
        .toLowerCase()
        .trim()
    : null;
  const targetSlug = slug ? canonicalizeSlug(slug) : null;
  const now = new Date().toISOString();

  let query = contentDrafts()
    .update({
      status: 'published',
      published_at: now,
      updated_at: now,
    })
    .neq('status', 'abandoned');

  if (id) {
    query = query.eq('id', id);
  } else if (emailNorm && targetSlug) {
    query = query.eq('created_by_email', emailNorm).eq('slug', targetSlug);
    if (kind) query = query.eq('kind', kind);
  } else {
    return { ok: false, error: 'id or (email + slug) required to mark published' };
  }

  const { data, error } = await query.select(selectAfter).limit(1);
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: 'No matching draft to mark published' };
  return { ok: true, row: data[0] };
}
