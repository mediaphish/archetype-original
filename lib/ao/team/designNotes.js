/**
 * Bart's corrections, kept as standing lessons for the whole team.
 *
 * Bart, 2026-10-27, hiring Des: "I started this journey as a designer ... the
 * system needs to understand the expectations I have for her are extremely
 * high. I will override a lot. She's hired, but build her the right way." And
 * "Make sure my notes are not just saved, but used to train her." Then: "I
 * definitely want my input, especially, when I correct someone on the team to
 * locked in as training across the board."
 *
 * Every correction Bart makes, to anyone on the team, is saved here in his
 * words with the area it belongs to (design, writing, schedule ...). Every
 * teammate reads every lesson on every turn. Design lessons also go to the
 * image model with each image and are checked against the finished image
 * (lib/ao/team/designCheck.js). A teammate saves one with save_note; when no
 * one did, the chat keeps it anyway (lib/ao/team/correctionCapture.js).
 * Table: ao_design_notes (database/ao_design_notes.sql), server-only.
 */
import { supabaseAdmin } from '../../supabase-admin.js';

export const DESIGN_NOTES_PROMPT_CAP = 80;

/** Where a lesson applies. Design lessons also shape and check every image. */
export const NOTE_AREAS = ['design', 'writing', 'editing', 'schedule', 'captions', 'podcast', 'crm', 'general'];
const AREA_TITLES = {
  design: 'Design (Des owns these; they also go to every image and are checked on it)',
  writing: 'Writing',
  editing: 'Editing',
  schedule: 'Schedule and channels',
  captions: 'Captions',
  podcast: 'Podcast',
  crm: 'Clients and the CRM',
  general: 'How the team works',
};

const clean = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Pure: the area, or general when it is not one we know. */
export function normalizeArea(area) {
  const a = String(area || '').toLowerCase().trim();
  return NOTE_AREAS.includes(a) ? a : 'general';
}

/** Pure: is this worth keeping as a lesson? A real note, not a stray word. */
export function validateDesignNote(note) {
  const text = clean(note, 1200);
  if (text.length < 8) return { ok: false, error: 'Write the note in Bart\'s words, a full sentence.' };
  return { ok: true, note: text };
}

export async function saveDesignNote({ email, note, area = 'design', appliesTo = 'all', about = null, threadId = null, source = 'teammate' }) {
  const owner = clean(email, 200).toLowerCase();
  if (!owner) return { ok: false, error: 'email is required' };
  const check = validateDesignNote(note);
  if (!check.ok) return check;
  const row = {
    owner_email: owner,
    note: check.note,
    area: normalizeArea(area),
    applies_to: clean(appliesTo, 120) || 'all',
    about: about ? clean(about, 200) : null,
    thread_id: threadId || null,
    source: source === 'captured' ? 'captured' : 'teammate',
  };
  const { data, error } = await supabaseAdmin.from('ao_design_notes').insert(row).select('id, note, area, applies_to, about, created_at').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, saved: data, message: 'Saved. The whole team reads it from here on.' };
}

/** Every lesson, oldest first; pass an area to get only that area's. */
export async function listDesignNotes(email, { limit = DESIGN_NOTES_PROMPT_CAP, area = null } = {}) {
  const owner = clean(email, 200).toLowerCase();
  if (!owner) return [];
  let q = supabaseAdmin
    .from('ao_design_notes')
    .select('id, note, area, applies_to, about, created_at')
    .eq('owner_email', owner)
    .eq('active', true);
  if (area) q = q.eq('area', area);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
  if (error) {
    console.error('[designNotes] list failed:', error.message);
    return [];
  }
  return (data || []).reverse();
}

/** Pure: the section of every teammate's instructions that carries Bart's lessons, by area. */
export function formatDesignNotesForPrompt(notes) {
  const list = Array.isArray(notes) ? notes.filter((n) => n?.note) : [];
  const head =
    '## Bart\'s corrections\n\nEvery correction Bart has made to anyone on the team, in his words, oldest first, by area. They are standing training for the whole team, not notes for one piece: apply every one that fits what you are doing, whoever it was first said to, and never repeat a mistake one of them names. When Bart corrects anyone, save it with save_note so it joins this list.';
  if (!list.length) return `${head}\n\nNone saved yet. Save his first one with save_note the moment he corrects anyone.`;
  const out = [head];
  for (const area of NOTE_AREAS) {
    const inArea = list.filter((n) => normalizeArea(n.area || 'design') === area);
    if (!inArea.length) continue;
    out.push('', `### ${AREA_TITLES[area]}`);
    for (const n of inArea) {
      const day = String(n.created_at || '').slice(0, 10);
      const scope = n.applies_to && n.applies_to !== 'all' ? ` [${n.applies_to}]` : '';
      out.push(`- ${day}${scope}: ${n.note}${n.about ? ` (on ${n.about})` : ''}`);
    }
  }
  return out.join('\n');
}

/** Pure: only the design lessons. */
export function designOnly(notes) {
  return (Array.isArray(notes) ? notes : []).filter((n) => normalizeArea(n?.area || 'design') === 'design');
}

/**
 * Pure: the notes as hard constraints for the image model itself, so they hold
 * even when the prompt Des wrote leaves one out (2026-10-27, Bart: "Make sure
 * my notes are not just saved, but used to train her.").
 */
export function designNotesForImagePrompt(notes) {
  const list = Array.isArray(notes) ? notes.filter((n) => n?.note) : [];
  if (!list.length) return '';
  return [
    'STANDING DESIGN NOTES FROM THE CLIENT. Follow every note that applies to this piece; they override anything above that conflicts:',
    ...list.map((n) => `- ${n.applies_to && n.applies_to !== 'all' ? `(${n.applies_to}) ` : ''}${n.note}`),
  ].join('\n');
}

const APPROVAL_ONLY = /^\s*(>.*\n+)*\s*(yes|yep|yeah|approved?|ok(ay)?|looks (good|great)|love it|perfect|great|good|go|do it|ship it)\b[\s.!]*$/i;

/**
 * Pure: is Bart's message design feedback on an image the team just showed him?
 * An image was shown since his last message, and his reply is more than a yes.
 * @param {string} message Bart's message
 * @param {Array<{role: string, content?: string, meta?: object}>} priorMessages oldest first
 */
export function isDesignFeedback(message, priorMessages) {
  const text = String(message || '').trim();
  if (!text || /^\s*\[(TEAM|SYSTEM)/.test(text) || APPROVAL_ONLY.test(text)) return false;
  const words = text.replace(/^\s*>.*$/gm, '').trim().split(/\s+/).filter(Boolean).length;
  if (words < 6) return false;
  const list = Array.isArray(priorMessages) ? priorMessages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const m = list[i];
    if (m?.role === 'user' && !m?.meta?.team_note && !/^\s*\[(TEAM|SYSTEM)/.test(String(m.content || ''))) break;
    if (m?.role !== 'assistant') continue;
    const used = Array.isArray(m?.meta?.tools_used) ? m.meta.tools_used : [];
    if (used.includes('generate_image') || /!\[[^\]]*\]\(https?:\/\//.test(String(m.content || ''))) return true;
  }
  return false;
}

/** Pure: Bart's feedback as a note, his words with any quoted line dropped. */
export function feedbackAsNote(message) {
  return String(message || '')
    .replace(/^\s*>.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
}
