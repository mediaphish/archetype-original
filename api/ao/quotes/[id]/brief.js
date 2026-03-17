/**
 * AO Automation — Generate / refresh Analyst brief for a quote item.
 * POST /api/ao/quotes/[id]/brief
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { analystDecision } from '../../../../lib/ao/analystDecision.js';
import { librarianAnnotate } from '../../../../lib/ao/librarianAnnotate.js';

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

    const brief = await analystDecision(row);
    if (!brief?.ok) {
      return res.status(500).json({ ok: false, error: 'Could not generate brief' });
    }

    // If the model fell back (or returned an “empty” brief), do NOT overwrite the row.
    // This prevents items from getting stuck on “Preparing…” by wiping existing data to null.
    const hasRealWhy = typeof brief.why_it_matters === 'string' && brief.why_it_matters.trim().length >= 12;
    const hasRealSummary = typeof brief.summary_interpretation === 'string' && brief.summary_interpretation.trim().length >= 30;
    const hasMoves = Array.isArray(brief.alt_moves) && brief.alt_moves.length > 0;
    const hasIdeas = Array.isArray(brief?.studio_playbook?.inbox_ideas) && brief.studio_playbook.inbox_ideas.length > 0;
    const looksNotReady = !(hasRealWhy || hasRealSummary || hasMoves || hasIdeas);
    if (looksNotReady) {
      return res.status(200).json({ ok: true, not_ready: true, quote: row });
    }

    // Librarian adds "we've said this before" + repeat warnings (best-effort).
    let similarityNotes = null;
    try {
      const lib = await librarianAnnotate({ candidateRow: row, decision: brief });
      if (lib?.ok && lib.similarity_notes) similarityNotes = lib.similarity_notes;
    } catch (_) {}

    const patch = { updated_at: new Date().toISOString() };
    if (brief.best_move) patch.best_move = brief.best_move;
    if (brief.objectives_by_channel) patch.objectives_by_channel = brief.objectives_by_channel;
    if (typeof brief.why_it_matters === 'string' && brief.why_it_matters.trim()) patch.why_it_matters = brief.why_it_matters.trim();
    if (typeof brief.pull_quote === 'string' && brief.pull_quote.trim()) patch.pull_quote = brief.pull_quote.trim();
    if (Array.isArray(brief.risk_flags)) patch.risk_flags = brief.risk_flags;
    if (typeof brief.summary_interpretation === 'string' && brief.summary_interpretation.trim()) patch.summary_interpretation = brief.summary_interpretation.trim();
    if (Array.isArray(brief.alt_moves) && brief.alt_moves.length) patch.alt_moves = brief.alt_moves;
    if (similarityNotes) patch.similarity_notes = similarityNotes;
    if (typeof brief.auto_discarded === 'boolean') patch.auto_discarded = brief.auto_discarded;
    if (brief.discard_reason) patch.discard_reason = brief.discard_reason;
    if (brief.content_kind) patch.content_kind = brief.content_kind;
    if (brief.ao_lane) patch.ao_lane = brief.ao_lane;
    if (Array.isArray(brief.topic_tags)) patch.topic_tags = brief.topic_tags;
    if (brief.studio_playbook) patch.studio_playbook = brief.studio_playbook;

    // If Analyst decides this is not a fit (or is junk), auto-reject it so it never clutters Pending.
    // Only do this when we have a real (non-empty) brief — never on fallback.
    if ((brief.auto_discarded || brief.best_move === 'discard') && (hasRealWhy || hasRealSummary || hasIdeas)) {
      patch.status = 'rejected';
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (updErr) {
      const msg = String(updErr.message || '');
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
      return res.status(500).json({ ok: false, error: updErr.message });
    }

    return res.status(200).json({ ok: true, quote: updated });
  } catch (e) {
    console.error('[ao/quotes/brief]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

