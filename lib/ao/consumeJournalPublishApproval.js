/**
 * One-time journal publish approval tokens (minted by POST /api/ao/journal/publish-approval).
 */

import { supabaseAdmin } from '../supabase-admin.js';

function baseCheck({ token, email, targetPath, row } = {}) {
  const target = String(targetPath || '').trim();
  const em = String(email || '').trim().toLowerCase();
  const nowIso = new Date().toISOString();
  if (!row) return { ok: false, error: 'invalid_or_unknown_token' };
  if (row.consumed_at) return { ok: false, error: 'token_already_used' };
  if (String(row.expires_at || '') < nowIso) return { ok: false, error: 'token_expired' };
  if (String(row.target_path || '') !== target) return { ok: false, error: 'token_path_mismatch' };
  if (String(row.created_by_email || '').trim().toLowerCase() !== em) {
    return { ok: false, error: 'token_email_mismatch' };
  }
  return { ok: true, rowId: row.id };
}

/**
 * Read-only: token valid for this path/email (does not consume).
 * @returns {Promise<{ ok: boolean, rowId?: string, error?: string }>}
 */
export async function validateJournalPublishApproval({ token, email, targetPath } = {}) {
  const tok = String(token || '').trim();
  const target = String(targetPath || '').trim();
  const em = String(email || '').trim().toLowerCase();
  if (!tok || !target || !em) return { ok: false, error: 'Missing token, path, or email.' };

  const { data: rows, error: selErr } = await supabaseAdmin
    .from('ao_journal_publish_approvals')
    .select('id, created_by_email, target_path, expires_at, consumed_at')
    .eq('token', tok)
    .limit(1);

  if (selErr) {
    if (String(selErr.message || '').includes('does not exist')) {
      return { ok: false, error: 'approval_table_missing' };
    }
    return { ok: false, error: selErr.message };
  }

  const row = rows?.[0];
  const checked = baseCheck({ email, targetPath, row });
  if (!checked.ok) return checked;
  return { ok: true, rowId: row.id };
}

/**
 * Marks a row consumed (call only after GitHub push succeeded).
 */
export async function consumeJournalPublishApprovalRow(rowId) {
  const nowIso = new Date().toISOString();
  const { error: updErr } = await supabaseAdmin
    .from('ao_journal_publish_approvals')
    .update({ consumed_at: nowIso })
    .eq('id', rowId)
    .is('consumed_at', null);

  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}

/**
 * @deprecated Prefer validate + consumeJournalPublishApprovalRow after successful push.
 */
export async function consumeJournalPublishApproval(opts) {
  const v = await validateJournalPublishApproval(opts);
  if (!v.ok || !v.rowId) return v;
  return consumeJournalPublishApprovalRow(v.rowId);
}
