/**
 * Bart's design calls, kept so they never have to be made twice.
 *
 * Bart, 2026-10-27, hiring Des: "I started this journey as a designer ... the
 * system needs to understand the expectations I have for her are extremely
 * high. I will override a lot. She's hired, but build her the right way."
 *
 * Every time Bart changes, rejects or corrects something visual, Des saves his
 * words here (save_design_note). The notes are read into Des's instructions on
 * every turn, and into Cam's and Ada's so they hold her to them. Table:
 * ao_design_notes (database/ao_design_notes.sql), server-only.
 */
import { supabaseAdmin } from '../../supabase-admin.js';

export const DESIGN_NOTES_PROMPT_CAP = 60;

const clean = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Pure: is this worth keeping as a design note? A real note, not a stray word. */
export function validateDesignNote(note) {
  const text = clean(note, 1200);
  if (text.length < 8) return { ok: false, error: 'Write the note in Bart\'s words, a full sentence.' };
  return { ok: true, note: text };
}

export async function saveDesignNote({ email, note, appliesTo = 'all', about = null, threadId = null }) {
  const owner = clean(email, 200).toLowerCase();
  if (!owner) return { ok: false, error: 'email is required' };
  const check = validateDesignNote(note);
  if (!check.ok) return check;
  const row = {
    owner_email: owner,
    note: check.note,
    applies_to: clean(appliesTo, 120) || 'all',
    about: about ? clean(about, 200) : null,
    thread_id: threadId || null,
  };
  const { data, error } = await supabaseAdmin.from('ao_design_notes').insert(row).select('id, note, applies_to, about, created_at').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, saved: data, message: 'Saved. It is now one of Bart\'s design notes and applies from here on.' };
}

export async function listDesignNotes(email, { limit = DESIGN_NOTES_PROMPT_CAP } = {}) {
  const owner = clean(email, 200).toLowerCase();
  if (!owner) return [];
  const { data, error } = await supabaseAdmin
    .from('ao_design_notes')
    .select('id, note, applies_to, about, created_at')
    .eq('owner_email', owner)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[designNotes] list failed:', error.message);
    return [];
  }
  return (data || []).reverse();
}

/** Pure: the section of the instructions that carries Bart's design notes. */
export function formatDesignNotesForPrompt(notes) {
  const list = Array.isArray(notes) ? notes.filter((n) => n?.note) : [];
  const head =
    '## Bart\'s design notes\n\nEvery design call Bart has made, in his words, oldest first. They are the standard: apply every one that fits the piece, and never repeat a mistake one of them names.';
  if (!list.length) return `${head}\n\nNone saved yet. Save his first one the moment he makes a design call.`;
  return [
    head,
    '',
    ...list.map((n) => {
      const day = String(n.created_at || '').slice(0, 10);
      const scope = n.applies_to && n.applies_to !== 'all' ? ` [${n.applies_to}]` : '';
      return `- ${day}${scope}: ${n.note}${n.about ? ` (on ${n.about})` : ''}`;
    }),
  ].join('\n');
}

/** Who reads the notes: Des makes the work; Cam and Ada hold her to them. */
export const DESIGN_NOTE_READERS = new Set(['designer', 'producer', 'auto']);
