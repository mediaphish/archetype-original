/**
 * Sanctioned access layer for ao_scheduled_posts.
 *
 * The literal from() call for this table must appear ONLY in this file.
 * All other api/ + lib/ code must import helpers from here.
 * Enforced by scripts/verify-no-direct-table-access.mjs at build time.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import {
  validateScheduledPostRows,
  formatIntegrityRejectedSummary,
  syncScheduledPostCopyFields,
} from '../social/scheduledPostIntegrity.js';
import {
  buildSyncedScheduledCopy,
  syncedCopyFields,
} from '../ao/scheduledPostCopy.js';

// Loaded on use, by a path the site bundler does not follow: this file is also
// pulled into the browser (via journalPanelData), and quoteSource reads files.
const QUOTE_SOURCE = '../ao/quoteSource.js';
const quoteSource = () => import(/* @vite-ignore */ QUOTE_SOURCE);

/** Query builder for this table — reads and non-insert mutations. Prefer named helpers for writes. */
export function scheduledPosts() {
  return supabaseAdmin.from('ao_scheduled_posts');
}

/**
 * Validate then insert. Prefer this over scheduledPosts().insert(...).
 * @param {object[]} rows
 * @param {{
 *   select?: string,
 *   allowMinimalFallback?: boolean,
 *   stripForFallback?: (row: object) => object,
 * }} [options]
 */
/**
 * Quote cards, resurfaces and infographics also go to the LinkedIn company page
 * (Bart, 2026-11-02: "going out automatically to all channels we are connected
 * to"). The page gets the LinkedIn caption an hour after his personal post, so
 * the two do not land together. Journal launches are not copied: he posts those
 * on the page himself.
 */
const COMPANY_PAGE_KINDS = new Set(['auto_quote_card', 'ao_journal_reshare', 'infographic']);
const COMPANY_PAGE_ACCOUNT = 'page_1';

/** Pure: one company page row for a personal LinkedIn row of those kinds, or null. */
export function companyPageCopy(row) {
  if (row?.platform !== 'linkedin' || row?.account_id !== 'personal' || !COMPANY_PAGE_KINDS.has(row?.source_kind)) return null;
  const at = Date.parse(row.scheduled_at);
  if (!Number.isFinite(at)) return null;
  const { id, created_at, updated_at, external_id, ...rest } = row;
  return {
    ...rest,
    account_id: COMPANY_PAGE_ACCOUNT,
    scheduled_at: new Date(at + 60 * 60000).toISOString(),
    intent: { ...(row.intent || {}), channel_label: 'linkedin_business' },
  };
}

async function withCompanyPageCopies(rows) {
  const copies = rows.map(companyPageCopy).filter(Boolean);
  if (!copies.length) return rows;
  // Only while the page is connected, so a lost connection never adds posts that must fail.
  const { loadPageConnection } = await import('../social/linkedinPage.js');
  const page = await loadPageConnection().catch(() => null);
  return page ? [...rows, ...copies] : rows;
}

export async function insertScheduledPostsSafely(rows, options = {}) {
  const {
    select = 'id, platform, scheduled_at, status',
    allowMinimalFallback = false,
    stripForFallback = null,
    spread = false,
  } = options;

  // A devotional is linked at its devotional page, never the journal (2026-10-28).
  const { withDevotionalLinksFixed } = await quoteSource();
  const fixed = Array.isArray(rows) ? await Promise.all((await withCompanyPageCopies(rows)).map(withDevotionalLinksFixed)) : rows;
  const checked = validateScheduledPostRows(fixed);
  const { rejected } = checked;
  let { valid } = checked;
  // Automatic schedulers pass spread: true so posts on one account do not pile up.
  // Times Bart sets himself never pass it. See lib/ao/channelSpacing.js.
  if (spread && valid.length > 0) {
    valid = await spreadAgainstCalendar(valid);
  }
  const integrity_summary = formatIntegrityRejectedSummary(rejected);

  if (valid.length === 0) {
    return {
      ok: false,
      inserted: [],
      rejected,
      error: integrity_summary || 'No valid scheduled posts to insert',
      integrity_summary,
    };
  }

  const tryInsert = async (payload) =>
    scheduledPosts().insert(payload).select(select);

  let out = await tryInsert(valid);

  if (out.error && allowMinimalFallback && typeof stripForFallback === 'function') {
    const msg = String(out.error.message || '');
    const looksLikeSchema =
      /schema cache|source_kind|source_quote_id|source_idea_id|intent|first_comment|best_move|why_it_matters|ao_lane|topic_tags|account_id|platform/i.test(
        msg
      );
    if (looksLikeSchema) {
      out = await tryInsert(valid.map(stripForFallback));
    }
  }

  if (out.error) {
    return {
      ok: false,
      inserted: [],
      rejected,
      error: out.error.message,
      integrity_summary,
    };
  }

  return {
    ok: true,
    inserted: out.data || [],
    rejected,
    error: null,
    integrity_summary,
  };
}

/**
 * Space rows against what is already on the calendar for the same accounts,
 * and move automatic posts out of an anchor's way. Never fails the insert:
 * if the calendar cannot be read, the rows go in as given.
 * @param {object[]} rows
 * @returns {Promise<object[]>}
 */
export async function spreadAgainstCalendar(rows) {
  try {
    const { spreadRows } = await import('../ao/channelSpacing.js');
    const times = rows.map((r) => Date.parse(r.scheduled_at)).filter(Number.isFinite);
    if (times.length === 0) return rows;
    const from = new Date(Math.min(...times) - 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Math.max(...times) + 14 * 24 * 60 * 60 * 1000).toISOString();
    const platforms = [...new Set(rows.map((r) => r.platform).filter(Boolean))];
    const { data: existing, error } = await scheduledPosts()
      .select('id, platform, account_id, scheduled_at, source_kind')
      .in('status', ['scheduled', 'pending_review'])
      .in('platform', platforms)
      .gte('scheduled_at', from)
      .lte('scheduled_at', to);
    if (error) return rows;
    const ownIds = new Set(rows.map((r) => r.id).filter(Boolean));
    const others = (existing || []).filter((e) => !ownIds.has(e.id));
    const { rows: spaced, moves } = spreadRows(rows, others);
    for (const m of moves) {
      await scheduledPosts()
        .update({ scheduled_at: m.scheduled_at, updated_at: new Date().toISOString() })
        .eq('id', m.id)
        .eq('status', 'scheduled');
    }
    return spaced;
  } catch (err) {
    console.warn('[scheduledPosts] spreadAgainstCalendar skipped:', err?.message || err);
    return rows;
  }
}

/** Alias used by call sites that schedule a batch. */
export const scheduleBatch = insertScheduledPostsSafely;

/**
 * Always update text + caption together. Never separately.
 */
export async function updateCaptionAndText({ id, body, onlyIfStatus = 'scheduled' }) {
  const { fixDevotionalLinks, devotionalSlugs } = await quoteSource();
  const built = syncedCopyFields(typeof body === 'string' ? fixDevotionalLinks(body, await devotionalSlugs()) : body);
  if (!built.ok) return { ok: false, error: built.error };

  let query = scheduledPosts()
    .update({
      ...built.fields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (onlyIfStatus) {
    const statuses = Array.isArray(onlyIfStatus) ? onlyIfStatus : [onlyIfStatus];
    query = query.in('status', statuses);
  }

  const { data, error } = await query.select('id, text, caption, status').maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'No matching scheduled row to update' };
  return { ok: true, row: data };
}

export async function updateById(id, payload) {
  const out = await scheduledPosts().update(payload).eq('id', id);
  if (!out?.error) return out;
  const msg = String(out.error.message || '');
  if (msg.includes('posted_at') && payload && 'posted_at' in payload) {
    const { posted_at, ...rest } = payload;
    return scheduledPosts().update(rest).eq('id', id);
  }
  return out;
}

export async function markPosted(id, { external_id, posted_at, first_comment_status, first_comment_error_message } = {}) {
  const payload = {
    status: 'posted',
    updated_at: new Date().toISOString(),
    ...(posted_at ? { posted_at } : { posted_at: new Date().toISOString() }),
    ...(external_id ? { external_id } : {}),
  };
  if (first_comment_status != null) payload.first_comment_status = first_comment_status;
  if (first_comment_error_message != null) {
    payload.first_comment_error_message = first_comment_error_message;
  }
  return updateById(id, payload);
}

export async function markFailed(id, errorMessage) {
  return updateById(id, {
    status: 'failed',
    updated_at: new Date().toISOString(),
    ...(errorMessage ? { error_message: String(errorMessage).slice(0, 2000) } : {}),
  });
}

export async function deleteByIds(ids, { onlyStatuses } = {}) {
  let query = scheduledPosts().delete().in('id', ids);
  if (onlyStatuses?.length) query = query.in('status', onlyStatuses);
  return query;
}

// Re-export pure helpers so callers can import from one place.
export {
  validateScheduledPostRows,
  formatIntegrityRejectedSummary,
  syncScheduledPostCopyFields,
  buildSyncedScheduledCopy,
};
