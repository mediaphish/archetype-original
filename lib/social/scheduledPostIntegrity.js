/**
 * Shared integrity gate for ao_scheduled_posts (pure validation + last-mile helpers).
 *
 * Inserts go through lib/db/scheduledPosts.js (insertScheduledPostsSafely).
 * This module must NOT query the scheduled-posts table directly — use lib/db/scheduledPosts.js.
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

export function formatIntegrityRejectedSummary(rejected) {
  if (!Array.isArray(rejected) || rejected.length === 0) return null;
  const reasons = rejected.map((r) => r.reason).filter(Boolean);
  const unique = [...new Set(reasons)];
  return `${rejected.length} scheduled post(s) blocked by integrity gate: ${unique.join('; ')}`;
}

export function assertRowReadyToPublish(row) {
  return assertPublishableScheduledText(row);
}

/**
 * Back-compat wrapper — real insert lives in lib/db/scheduledPosts.js.
 */
export async function insertScheduledPostsSafely(rows, options = {}) {
  const { insertScheduledPostsSafely: insert } = await import('../db/scheduledPosts.js');
  return insert(rows, options);
}
