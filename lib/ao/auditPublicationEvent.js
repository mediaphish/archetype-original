/**
 * Best-effort insert into ao_publication_audit. Never throws to callers.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and the table from database/ao_publication_audit.sql.
 */

import { supabaseAdmin } from '../supabase-admin.js';

/**
 * @param {{
 *   source: string,
 *   action: string,
 *   outcome?: 'success' | 'failure' | 'partial',
 *   actor_email?: string | null,
 *   resource_paths?: string[] | null,
 *   detail?: Record<string, unknown>,
 *   error_message?: string | null,
 *   vercel_id?: string | null,
 *   github_commit_sha?: string | null,
 * }} row
 */
export async function auditPublicationEvent(row) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, skipped: true, reason: 'no_supabase_env' };
  }
  if (!row?.source || !row?.action) {
    console.warn('[auditPublicationEvent] missing source or action');
    return { ok: false, skipped: true, reason: 'invalid_payload' };
  }

  const payload = {
    source: String(row.source).slice(0, 500),
    action: String(row.action).slice(0, 500),
    outcome: ['success', 'failure', 'partial'].includes(String(row.outcome))
      ? String(row.outcome)
      : 'success',
    actor_email: row.actor_email ? String(row.actor_email).slice(0, 320) : null,
    resource_paths: Array.isArray(row.resource_paths)
      ? row.resource_paths.map((p) => String(p).slice(0, 500)).slice(0, 200)
      : null,
    detail:
      row.detail && typeof row.detail === 'object' && !Array.isArray(row.detail)
        ? row.detail
        : {},
    error_message: row.error_message ? String(row.error_message).slice(0, 8000) : null,
    vercel_id:
      row.vercel_id ||
      process.env.VERCEL_DEPLOYMENT_ID ||
      process.env.VERCEL_ID ||
      null,
    github_commit_sha: row.github_commit_sha ? String(row.github_commit_sha).slice(0, 64) : null,
  };

  try {
    const { error } = await supabaseAdmin.from('ao_publication_audit').insert(payload);
    if (error) {
      if (String(error.message || '').toLowerCase().includes('does not exist')) {
        console.warn('[auditPublicationEvent] table missing — run database/ao_publication_audit.sql');
      } else {
        console.error('[auditPublicationEvent] insert failed:', error.message);
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error('[auditPublicationEvent]', e);
    return { ok: false, error: e.message };
  }
}
