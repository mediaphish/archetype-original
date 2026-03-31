import { supabaseAdmin } from '../supabase-admin.js';
import { analystDecision } from './analystDecision.js';
import { librarianAnnotate } from './librarianAnnotate.js';
import { rememberDiscarded } from './discardMemory.js';

function hasRealBrief(brief) {
  const hasRealWhy = typeof brief?.why_it_matters === 'string' && brief.why_it_matters.trim().length >= 40;
  const hasRealSummary = typeof brief?.summary_interpretation === 'string' && brief.summary_interpretation.trim().length >= 120;
  const hasMoves = Array.isArray(brief?.alt_moves) && brief.alt_moves.length > 0;
  const hasIdeas = Array.isArray(brief?.studio_playbook?.inbox_ideas) && brief.studio_playbook.inbox_ideas.length > 0;
  return { hasRealWhy, hasRealSummary, hasMoves, hasIdeas };
}

function buildPatch({ brief, similarityNotes, nextAttempts, attemptedAt }) {
  const patch = {
    updated_at: attemptedAt,
    brief_attempts: nextAttempts,
    brief_last_attempt_at: attemptedAt,
  };
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
  return patch;
}

async function removeQuote({ row, email, reason }) {
  await rememberDiscarded({ email, row, reason });
  const del = await supabaseAdmin
    .from('ao_quote_review_queue')
    .delete()
    .eq('id', row.id);
  if (del.error) throw del.error;
}

export async function prepareQuoteBrief({
  id,
  row: providedRow = null,
  email = '',
  bumpAttempt = true,
  removeAfterAttempts = 3,
} = {}) {
  let row = providedRow;
  if (!row?.id && !id) {
    return { ok: false, error: 'Quote ID required' };
  }

  if (!row?.id) {
    const read = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('*')
      .eq('id', id)
      .single();
    if (read.error) {
      return { ok: false, error: read.error.message, not_found: read.error.code === 'PGRST116' };
    }
    row = read.data;
  }

  const attemptedAt = new Date().toISOString();
  const prevAttempts = Number(row?.brief_attempts || 0);
  const nextAttempts = bumpAttempt ? (prevAttempts + 1) : prevAttempts;

  let brief;
  try {
    brief = await analystDecision(row);
  } catch (e) {
    brief = null;
  }
  if (!brief?.ok) {
    const patch = {
      updated_at: attemptedAt,
      brief_attempts: nextAttempts,
      brief_last_attempt_at: attemptedAt,
    };
    await supabaseAdmin.from('ao_quote_review_queue').update(patch).eq('id', row.id);
    const shouldRemove = nextAttempts >= removeAfterAttempts;
    if (shouldRemove) {
      await removeQuote({ row, email, reason: 'Could not generate a usable brief after repeated attempts' });
      return { ok: true, removed: true, not_ready: true, attempts: nextAttempts };
    }
    return { ok: true, not_ready: true, attempts: nextAttempts, quote: { ...row, ...patch } };
  }

  const ready = hasRealBrief(brief);
  const looksNotReady = !(ready.hasRealWhy || ready.hasRealSummary || ready.hasMoves || ready.hasIdeas);
  if (looksNotReady) {
    const patch = {
      updated_at: attemptedAt,
      brief_attempts: nextAttempts,
      brief_last_attempt_at: attemptedAt,
    };
    await supabaseAdmin.from('ao_quote_review_queue').update(patch).eq('id', row.id);
    const shouldRemove = nextAttempts >= removeAfterAttempts;
    if (shouldRemove) {
      await removeQuote({ row, email, reason: 'Could not prepare a decision-ready brief after repeated attempts' });
      return { ok: true, removed: true, not_ready: true, attempts: nextAttempts };
    }
    return { ok: true, not_ready: true, attempts: nextAttempts, quote: { ...row, ...patch } };
  }

  let similarityNotes = null;
  try {
    const lib = await librarianAnnotate({ candidateRow: row, decision: brief });
    if (lib?.ok && lib.similarity_notes) similarityNotes = lib.similarity_notes;
  } catch (_) {}

  const patch = buildPatch({ brief, similarityNotes, nextAttempts, attemptedAt });

  if ((brief.auto_discarded || brief.best_move === 'discard') && (ready.hasRealWhy || ready.hasRealSummary || ready.hasIdeas)) {
    await removeQuote({
      row: { ...row, ...patch },
      email,
      reason: String(brief.discard_reason || 'Analyst rejected this after briefing').slice(0, 200),
    });
    return { ok: true, removed: true, auto_discarded: true, attempts: nextAttempts };
  }

  const updated = await supabaseAdmin
    .from('ao_quote_review_queue')
    .update(patch)
    .eq('id', row.id)
    .select('*')
    .single();

  if (updated.error) {
    return { ok: false, error: updated.error.message, missing_columns: true };
  }

  return { ok: true, quote: updated.data, attempts: nextAttempts };
}
