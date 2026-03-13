/**
 * PATCH /api/ao/scheduled-posts/[id]?email=xxx
 * Body:
 * - { first_comment: string | null } — update or remove first comment (only when status is 'scheduled')
 * - { feedback_rating: 'good'|'meh'|'bad', feedback_notes?: string } — store manual feedback (only when status is 'posted' or 'failed')
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Post ID required' });
  }

  const first_comment = req.body?.first_comment;
  const feedback_rating = req.body?.feedback_rating;
  const feedback_notes = req.body?.feedback_notes;

  if (first_comment !== undefined && first_comment !== null && typeof first_comment !== 'string') {
    return res.status(400).json({ ok: false, error: 'first_comment must be a string or null' });
  }
  if (feedback_rating !== undefined && typeof feedback_rating !== 'string') {
    return res.status(400).json({ ok: false, error: 'feedback_rating must be a string' });
  }
  if (feedback_notes !== undefined && feedback_notes !== null && typeof feedback_notes !== 'string') {
    return res.status(400).json({ ok: false, error: 'feedback_notes must be a string' });
  }

  const { data: row, error: fetchError } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .select('id, status')
    .eq('id', id)
    .single();

  if (fetchError || !row) {
    return res.status(404).json({ ok: false, error: 'Post not found' });
  }
  const updatingFirstComment = first_comment !== undefined;
  const updatingFeedback = feedback_rating !== undefined || feedback_notes !== undefined;

  if (!updatingFirstComment && !updatingFeedback) {
    return res.status(400).json({ ok: false, error: 'Nothing to update' });
  }

  if (updatingFirstComment && row.status !== 'scheduled') {
    return res.status(400).json({ ok: false, error: 'Can only update first_comment for scheduled posts' });
  }
  if (updatingFeedback && row.status !== 'posted' && row.status !== 'failed') {
    return res.status(400).json({ ok: false, error: 'Can only add feedback for posted or failed posts' });
  }

  const patch = { updated_at: new Date().toISOString() };
  if (updatingFirstComment) {
    patch.first_comment = first_comment === null || first_comment === '' ? null : String(first_comment).trim() || null;
  }
  if (updatingFeedback) {
    const rating = String(feedback_rating || '').trim().toLowerCase();
    const allowed = new Set(['good', 'meh', 'bad']);
    patch.feedback_rating = allowed.has(rating) ? rating : null;
    patch.feedback_notes = feedback_notes == null ? null : String(feedback_notes).trim().slice(0, 800) || null;
    patch.feedback_at = new Date().toISOString();
  }

  // Select may fail if new columns haven't been migrated yet; fall back to base columns.
  let updated = null;
  let updateError = null;
  try {
    const out = await supabaseAdmin
      .from('ao_scheduled_posts')
      .update(patch)
      .eq('id', id)
      .select('id, platform, account_id, scheduled_at, text, image_url, status, first_comment, first_comment_status, first_comment_error_message, source_kind, source_quote_id, source_idea_id, intent, best_move, why_it_matters, ao_lane, topic_tags, posted_at, feedback_rating, feedback_notes, feedback_at, created_at, updated_at')
      .single();
    updated = out.data;
    updateError = out.error;
    if (updateError) throw updateError;
  } catch (e2) {
    const msg = String(e2?.message || '');
    const missingFeedbackCols = msg.includes('feedback_rating') || msg.includes('feedback_notes') || msg.includes('feedback_at');
    if (updatingFeedback && missingFeedbackCols) {
      return res.status(500).json({
        ok: false,
        error: 'Feedback fields are not set up yet. Run database/ao_scheduled_posts_intent_and_feedback.sql in Supabase.',
      });
    }
    const out = await supabaseAdmin
      .from('ao_scheduled_posts')
      .update({ ...(updatingFirstComment ? { first_comment: patch.first_comment } : {}), updated_at: patch.updated_at })
      .eq('id', id)
      .select('id, platform, account_id, scheduled_at, text, image_url, status, first_comment, first_comment_status, first_comment_error_message, created_at, updated_at')
      .single();
    updated = out.data;
    updateError = out.error;
  }

  if (updateError) {
    return res.status(500).json({ ok: false, error: updateError.message });
  }
  return res.status(200).json({ ok: true, post: updated });
}
