/**
 * Talks Bart gives from inside Auto (table ao_talks, 2026-10-28).
 * See notes/PLAN-talk-mode.md.
 */
import { supabaseAdmin } from '../supabase-admin.js';

export async function getTalk(slug) {
  const { data } = await supabaseAdmin.from('ao_talks').select('*').eq('slug', String(slug || '')).maybeSingle();
  return data || null;
}

export async function listTalks() {
  const { data } = await supabaseAdmin.from('ao_talks').select('slug, title, event, updated_at').order('updated_at', { ascending: false });
  return data || [];
}

/** Pure: a section kept to the shape the talk view draws. */
export function cleanSection(s, i) {
  const kind = s?.kind === 'demo' ? 'demo' : 'slide';
  return {
    id: String(s?.id || `s${i + 1}`),
    kind,
    title: String(s?.title || '').trim(),
    lines: (Array.isArray(s?.lines) ? s.lines : []).map((l) => String(l || '').trim()).filter(Boolean).slice(0, 6),
    image: s?.image && /^https:\/\//.test(s.image) ? s.image : null,
    notes: String(s?.notes || '').trim(),
    minutes: Number(s?.minutes) || null,
  };
}

export async function saveTalk({ slug, title, event = null, sections = [] }) {
  const row = { slug, title, event, sections: sections.map(cleanSection), updated_at: new Date().toISOString() };
  const { error } = await supabaseAdmin.from('ao_talks').upsert(row, { onConflict: 'slug' });
  return error ? { ok: false, error: error.message } : { ok: true, talk: row };
}
