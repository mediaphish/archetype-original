/**
 * Persist and query scheduled_publish_at on ao_content_drafts (#127).
 */

import { canonicalizeSlug, contentDrafts } from './contentDrafts.js';

/**
 * Parse a human or ISO publish target into an ISO timestamptz string.
 * Date-only (YYYY-MM-DD) → 06:00 America/Chicago that calendar day.
 * @param {string} raw
 * @returns {{ ok: true, iso: string } | { ok: false, error: string }}
 */
export function parseScheduledPublishAt(raw) {
  const s = String(raw || '').trim();
  if (!s) return { ok: false, error: 'scheduled_publish_at is required' };

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    // 06:00 CT ≈ America/Chicago; store as fixed offset for that instant.
    // Use Intl to resolve CST/CDT for that date.
    const noonUtcGuess = new Date(`${s}T12:00:00.000Z`);
    if (Number.isNaN(noonUtcGuess.getTime())) {
      return { ok: false, error: `Invalid date: ${s}` };
    }
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZoneName: 'shortOffset',
    }).formatToParts(noonUtcGuess);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-6';
    const m = offsetPart.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/i);
    let offsetHours = -6;
    let offsetMins = 0;
    if (m) {
      offsetHours = parseInt(m[1], 10);
      offsetMins = m[2] ? parseInt(m[2], 10) : 0;
    }
    const sign = offsetHours <= 0 ? '-' : '+';
    const absH = Math.abs(offsetHours);
    const off = `${sign}${String(absH).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    const localIso = `${s}T06:00:00${off}`;
    const d = new Date(localIso);
    if (Number.isNaN(d.getTime())) return { ok: false, error: `Invalid date: ${s}` };
    return { ok: true, iso: d.toISOString() };
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: `Could not parse scheduled_publish_at: ${s}` };
  }
  return { ok: true, iso: d.toISOString() };
}

/**
 * Set scheduled_publish_at on a journal draft (by id or email+slug).
 */
export async function setScheduledPublishAt({
  email,
  slug,
  draft_id: draftId = null,
  scheduled_publish_at: rawAt,
}) {
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  if (!emailNorm) return { ok: false, error: 'No authenticated email' };

  const parsed = parseScheduledPublishAt(rawAt);
  if (!parsed.ok) return parsed;

  const slugNorm = slug ? canonicalizeSlug(slug) : null;
  let query = contentDrafts()
    .update({
      scheduled_publish_at: parsed.iso,
      updated_at: new Date().toISOString(),
    })
    .eq('created_by_email', emailNorm)
    .eq('kind', 'journal')
    .neq('status', 'published')
    .neq('status', 'abandoned');

  if (draftId) {
    query = query.eq('id', draftId);
  } else if (slugNorm) {
    query = query.eq('slug', slugNorm);
  } else {
    return { ok: false, error: 'slug or draft_id is required' };
  }

  const { data, error } = await query
    .select('id, slug, title, status, scheduled_publish_at, image_url, approved_at')
    .limit(1);

  if (error) return { ok: false, error: error.message };
  if (!data?.length) {
    return {
      ok: false,
      error: `No updatable journal draft found${slugNorm ? ` for slug="${slugNorm}"` : ''}.`,
    };
  }

  return {
    ok: true,
    draft: data[0],
    scheduled_publish_at: data[0].scheduled_publish_at || parsed.iso,
    message: `Journal publish is scheduled for ${parsed.iso}. The live site will publish automatically when that time arrives (draft must be approved, with header image and required captions).`,
  };
}

/**
 * List approved journal drafts whose scheduled_publish_at is due.
 */
export async function listDueScheduledJournals({ limit = 20, nowIso = null } = {}) {
  const now = nowIso || new Date().toISOString();
  const { data, error } = await contentDrafts()
    .select(
      'id, slug, kind, series_slug, part_number, title, status, image_url, content, summary, metadata, approved_at, published_at, scheduled_publish_at, created_by_email, updated_at'
    )
    .eq('kind', 'journal')
    .eq('status', 'approved')
    .is('published_at', null)
    .not('scheduled_publish_at', 'is', null)
    .lte('scheduled_publish_at', now)
    .order('scheduled_publish_at', { ascending: true })
    .limit(Math.min(Math.max(Number(limit) || 20, 1), 50));

  if (error) return { ok: false, error: error.message, rows: [] };
  return { ok: true, rows: Array.isArray(data) ? data : [] };
}
