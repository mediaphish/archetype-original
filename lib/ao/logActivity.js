/**
 * logActivity — writes one row to ao_activity_log for a real action that
 * just completed in server code. This is the ground-truth ledger: it exists
 * so anything Auto claims happened can be checked against something that
 * isn't the chat transcript itself.
 *
 * Rules for callers:
 * - Only call this AFTER a real action has actually succeeded (a real image
 *   URL came back, a real reshare completed) — never speculatively, never
 *   from anything the model wrote.
 * - This must never throw and never block the reply. If the write fails,
 *   log a warning and move on — a missing ledger row is a bug to fix later,
 *   not a reason to fail the user-facing action that already succeeded.
 */

import { supabaseAdmin } from '../supabase-admin.js';

export async function logActivity({
  action_type,
  source,
  reference_table = null,
  reference_id = null,
  created_by_email = null,
  detail = {},
}) {
  try {
    const { error } = await supabaseAdmin.from('ao_activity_log').insert({
      action_type,
      source,
      reference_table,
      reference_id: reference_id ? String(reference_id) : null,
      created_by_email,
      detail,
    });
    if (error) {
      console.warn(`[logActivity] insert failed for ${action_type}:`, error.message);
    }
  } catch (err) {
    console.warn(`[logActivity] unexpected error for ${action_type}:`, err?.message || err);
  }
}
