/**
 * Append-only audit log for the reviewer role. Every login, page load, and
 * action a reviewer session takes gets written here. This is the record
 * that exists if a reviewer session ever does something unexpected to the
 * live platform — what they did, when, and what happened.
 *
 * Logging failures never block the actual request. If the log write fails,
 * it's caught and swallowed with a console.error — the reviewer's action
 * still completes normally.
 */

import { supabaseAdmin } from '../supabase-admin.js';

export async function logReviewerEvent({
  eventType,
  route = null,
  method = null,
  requestSummary = null,
  resultOk = null,
  resultSummary = null,
  req = null,
}) {
  try {
    const ip =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.socket?.remoteAddress ||
      null;
    const userAgent = req?.headers?.['user-agent'] || null;

    const { error } = await supabaseAdmin.from('ao_reviewer_audit_log').insert({
      event_type: eventType,
      route,
      method,
      request_summary: requestSummary,
      result_ok: resultOk,
      result_summary: resultSummary,
      ip_address: ip,
      user_agent: userAgent,
    });

    if (error) {
      console.error('[reviewerAuditLog] Failed to write log entry (non-blocking):', error.message);
    }
  } catch (err) {
    console.error('[reviewerAuditLog] Failed to write log entry (non-blocking):', err?.message || err);
  }
}
