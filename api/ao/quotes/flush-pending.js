/**
 * AO Automation — Flush pending Analyst inbox without rejecting.
 * POST /api/ao/quotes/flush-pending
 *
 * Behavior:
 * - Moves all pending items to status='cleared' so they disappear from the Pending list
 * - Does NOT mark them rejected
 *
 * Note: Requires DB constraint update to allow 'cleared':
 * - Run database/ao_quote_review_queue_status_cleared.sql in Supabase
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  try {
    const { error, count } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .update({ status: 'cleared', updated_at: new Date().toISOString() })
      .eq('created_by_email', auth.email)
      .eq('status', 'pending')
      .select('id', { count: 'exact', head: true });

    if (error) {
      const msg = String(error.message || '');
      const looksLikeConstraint =
        msg.toLowerCase().includes('check constraint') ||
        msg.toLowerCase().includes('violates check constraint') ||
        msg.toLowerCase().includes('ao_quote_review_queue_status_check') ||
        msg.toLowerCase().includes('status');
      if (looksLikeConstraint) {
        return res.status(500).json({
          ok: false,
          error: "Flush isn't set up yet. Run database/ao_quote_review_queue_status_cleared.sql in Supabase, then retry.",
        });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, cleared: typeof count === 'number' ? count : null });
  } catch (e) {
    console.error('[ao/quotes/flush-pending]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

