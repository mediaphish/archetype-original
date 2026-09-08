/**
 * Persistence for the review queue.
 *
 * Lives at ao_content_drafts.metadata.notes. That column is jsonb, already
 * exists, and already carries the outline brief, so this needs no migration.
 * Attaching it to the draft rather than the thread is deliberate: the notes
 * belong to the post, so they survive a reload, a new thread, and tomorrow.
 *
 * Bart's requirement, 2026-09-08: "I submit a single message with a whole bunch
 * of notes... we have a dialogue, then I approve, and then we move on to the
 * next one. Once we're done going through all of those, I am happy to give a
 * command to tell it to go write."
 */

import { contentDrafts, canonicalizeSlug } from '../db/contentDrafts.js';
import { buildQueue, resolveNote as resolveInQueue } from './noteQueue.js';

async function loadRow(email, slug) {
  const { data, error } = await contentDrafts()
    .select('id, slug, metadata')
    .eq('created_by_email', String(email || '').toLowerCase().trim())
    .eq('slug', canonicalizeSlug(slug))
    .eq('kind', 'journal')
    .neq('status', 'abandoned')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

/** The open queue for a draft, or null. */
export async function loadNoteQueue({ email, slug }) {
  const row = await loadRow(email, slug);
  if (!row) return null;
  const q = row.metadata?.notes || null;
  return q ? { ...q, draftId: row.id, draftSlug: row.slug } : null;
}

/**
 * Save a queue, merging into existing metadata.
 *
 * Reads and merges rather than overwriting, because metadata already holds the
 * outline brief and clobbering it would silently destroy the brief that
 * produced the post.
 */
export async function saveNoteQueue({ email, slug, queue }) {
  const row = await loadRow(email, slug);
  if (!row) return { ok: false, error: `No draft found for slug "${slug}".` };

  const metadata = { ...(row.metadata || {}), notes: queue };
  const { error } = await contentDrafts().update({ metadata }).eq('id', row.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, draftId: row.id };
}

/** Start a fresh pass. Replaces any previous queue for this draft. */
export async function openNoteQueue({ email, slug, noteTexts }) {
  const queue = buildQueue(noteTexts, { draftSlug: canonicalizeSlug(slug) });
  const saved = await saveNoteQueue({ email, slug, queue });
  if (!saved.ok) return saved;
  return { ok: true, queue };
}

/** Settle one note. */
export async function resolveNoteInStore({ email, slug, id, status, resolution }) {
  const queue = await loadNoteQueue({ email, slug });
  if (!queue) return { ok: false, error: `No open note queue for "${slug}".` };
  if (!queue.notes?.some((n) => n.id === id)) {
    return { ok: false, error: `Note ${id} is not in the queue for "${slug}".` };
  }
  const next = resolveInQueue(queue, id, status, resolution);
  const saved = await saveNoteQueue({ email, slug, queue: next });
  if (!saved.ok) return saved;
  return { ok: true, queue: next };
}

/** Clear the queue once a pass has been written. */
export async function clearNoteQueue({ email, slug }) {
  const row = await loadRow(email, slug);
  if (!row) return { ok: false, error: `No draft found for slug "${slug}".` };
  const metadata = { ...(row.metadata || {}) };
  delete metadata.notes;
  const { error } = await contentDrafts().update({ metadata }).eq('id', row.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
