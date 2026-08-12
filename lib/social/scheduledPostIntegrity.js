/**
 * Shared integrity gate for ao_scheduled_posts.
 *
 * Every insert path should call validateScheduledPostRows() (or
 * insertScheduledPostsSafely()) before writing. publishOne() re-checks
 * independently as last-mile protection.
 *
 * Never voids a whole batch because some rows are bad — returns valid + rejected.
 */

import {
  buildSyncedScheduledCopy,
  isPlaceholderScheduledText,
  assertPublishableScheduledText,
} from '../ao/scheduledPostCopy.js';

/**
 * Prefer real text; if text is empty/placeholder and caption is real, heal from caption.
 * Always emit identical text + caption when ok.
 *
 * @param {{ text?: unknown, caption?: unknown }} row
 * @returns {{ ok: true, text: string, caption: string, healed: boolean } | { ok: false, reason: string }}
 */
export function syncScheduledPostCopyFields(row) {
  const rawText = String(row?.text ?? '').trim();
  const rawCaption = String(row?.caption ?? '').trim();

  const textOk = rawText && !isPlaceholderScheduledText(rawText);
  const captionOk = rawCaption && !isPlaceholderScheduledText(rawCaption);

  let body = '';
  let healed = false;

  if (textOk) {
    body = rawText;
    if (rawCaption && rawCaption !== rawText) {
      // Prefer publish field (text) when both are real; still force sync so they cannot drift.
      healed = true;
    } else if (!rawCaption) {
      healed = true;
    }
  } else if (captionOk) {
    body = rawCaption;
    healed = true;
  } else if (rawText || rawCaption) {
    const bad = rawText || rawCaption;
    return {
      ok: false,
      reason: `Placeholder or unusable copy: "${String(bad).slice(0, 80)}"`,
    };
  } else {
    return { ok: false, reason: 'Empty text and caption' };
  }

  const synced = buildSyncedScheduledCopy(body);
  if (!synced.ok) {
    return { ok: false, reason: synced.error };
  }

  return {
    ok: true,
    text: synced.text,
    caption: synced.caption,
    healed,
  };
}

/**
 * Validate one row; return a normalized copy ready to insert.
 * @param {object} row
 * @returns {{ ok: true, row: object } | { ok: false, reason: string }}
 */
export function validateScheduledPostRow(row) {
  if (!row || typeof row !== 'object') {
    return { ok: false, reason: 'Row is not an object' };
  }

  const platform = String(row.platform || '').trim();
  if (!platform) {
    return { ok: false, reason: 'Missing platform' };
  }

  const synced = syncScheduledPostCopyFields(row);
  if (!synced.ok) {
    return { ok: false, reason: synced.reason };
  }

  return {
    ok: true,
    row: {
      ...row,
      text: synced.text,
      caption: synced.caption,
    },
  };
}

/**
 * Split a batch into insertable rows and rejected ones with reasons.
 * Does not throw; does not discard valid rows because siblings failed.
 *
 * @param {object[]} rows
 * @returns {{ valid: object[], rejected: Array<{ row: object, reason: string }> }}
 */
export function validateScheduledPostRows(rows) {
  const valid = [];
  const rejected = [];
  const list = Array.isArray(rows) ? rows : [];

  for (const row of list) {
    const result = validateScheduledPostRow(row);
    if (result.ok) {
      valid.push(result.row);
    } else {
      rejected.push({ row, reason: result.reason });
    }
  }

  return { valid, rejected };
}

/**
 * Human-readable summary for API / Auto replies when anything was rejected.
 */
export function formatIntegrityRejectedSummary(rejected) {
  if (!Array.isArray(rejected) || rejected.length === 0) return null;
  const reasons = rejected.map((r) => r.reason).filter(Boolean);
  const unique = [...new Set(reasons)];
  return `${rejected.length} scheduled post(s) blocked by integrity gate: ${unique.join('; ')}`;
}

/**
 * Last-mile check used by publishOne() — same rules as insert validation.
 * @param {object} row
 */
export function assertRowReadyToPublish(row) {
  return assertPublishableScheduledText(row);
}

/**
 * Validate then insert. Prefer this over raw supabaseAdmin.from('ao_scheduled_posts').insert(...)
 * so new call sites inherit the gate by default.
 *
 * @param {object[]} rows
 * @param {{
 *   client?: import('@supabase/supabase-js').SupabaseClient,
 *   select?: string,
 *   allowMinimalFallback?: boolean,
 *   stripForFallback?: (row: object) => object,
 * }} [options]
 * @returns {Promise<{
 *   ok: boolean,
 *   inserted: object[],
 *   rejected: Array<{ row: object, reason: string }>,
 *   error: string | null,
 *   integrity_summary: string | null,
 * }>}
 */
export async function insertScheduledPostsSafely(rows, options = {}) {
  const {
    client = null,
    select = 'id, platform, scheduled_at, status',
    allowMinimalFallback = false,
    stripForFallback = null,
  } = options;

  // Lazy-load admin client so pure validate/selftests do not require DB env at import time.
  const db = client || (await import('../supabase-admin.js')).supabaseAdmin;

  const { valid, rejected } = validateScheduledPostRows(rows);
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
    db.from('ao_scheduled_posts').insert(payload).select(select);

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
