/**
 * AO Automation — Generate / refresh Analyst brief for a quote item.
 * POST /api/ao/quotes/[id]/brief
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { prepareQuoteBrief } from '../../../../lib/ao/prepareQuoteBrief.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Quote ID required' });
  }

  try {
    const { data: row, error: readErr } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('*')
      .eq('id', id)
      .single();
    if (readErr) {
      if (readErr.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Quote not found' });
      return res.status(500).json({ ok: false, error: readErr.message });
    }

    const outcome = await prepareQuoteBrief({
      id,
      row,
      email: auth.email,
      bumpAttempt: true,
      removeAfterAttempts: 3,
    });

    if (!outcome.ok) {
      const msg = String(outcome.error || '');
      const looksLikeMissingColumns =
        msg.includes('best_move') ||
        msg.includes('why_it_matters') ||
        msg.includes('pull_quote') ||
        msg.includes('risk_flags') ||
        msg.includes('summary_interpretation') ||
        msg.includes('alt_moves') ||
        msg.includes('similarity_notes') ||
        msg.includes('content_kind') ||
        msg.includes('ao_lane') ||
        msg.includes('topic_tags') ||
        msg.includes('studio_playbook');
      if (looksLikeMissingColumns) {
        return res.status(500).json({
          ok: false,
          error: 'Brief fields are not set up yet. Run database/ao_quote_review_queue_intelligence_fields.sql, database/ao_quote_review_queue_brief_and_hold_fields.sql, and database/ao_quote_review_queue_playbook.sql in Supabase.',
        });
      }
      return res.status(500).json({ ok: false, error: outcome.error || 'Could not generate brief' });
    }

    if (outcome.removed) {
      return res.status(200).json({ ok: true, removed: true, not_ready: !!outcome.not_ready });
    }
    if (outcome.not_ready) {
      return res.status(200).json({ ok: true, not_ready: true, quote: outcome.quote || row });
    }

    return res.status(200).json({ ok: true, quote: outcome.quote });
  } catch (e) {
    console.error('[ao/quotes/brief]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

