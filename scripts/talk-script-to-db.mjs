/**
 * Copies a talk script (notes/talk-*.md) onto the talk in Auto, one section
 * per slide, so the iPad presenter screen (/ao/remote) shows what Bart says
 * on each slide (2026-11-08).
 *
 *   node --env-file=.env.local scripts/talk-script-to-db.mjs notes/talk-neosho-2026-11-11-script.md neosho-chamber-2026
 *
 * The script's "## 1. ..." headings map to the talk's slides in order. The
 * SCREEN block is left out, since the iPad shows the slide's own lines.
 */
import fs from 'fs';
import { supabaseAdmin } from '../lib/supabase-admin.js';

/** Pure: the script split into one text per "## N." section, in order. */
export function scriptSections(md) {
  const parts = String(md || '').split(/^## \d+\.[^\n]*\n/m).slice(1);
  return parts.map((p) =>
    p
      .split(/\n### /)[0]
      .replace(/^\*\*SCREEN:[^\n]*\*\*\n(?:- [^\n]*\n)*/m, '')
      .replace(/\n---\s*$/, '')
      .trim()
  );
}

const [file, slug] = process.argv.slice(2);
if (file && slug) {
  const texts = scriptSections(fs.readFileSync(file, 'utf8'));
  const { data, error } = await supabaseAdmin.from('ao_talks').select('sections').eq('slug', slug).maybeSingle();
  if (error || !data) throw new Error(error?.message || `No talk ${slug}`);
  if (texts.length !== data.sections.length) throw new Error(`The script has ${texts.length} sections and the talk has ${data.sections.length} slides.`);
  const sections = data.sections.map((s, i) => ({ ...s, script: texts[i] }));
  const up = await supabaseAdmin.from('ao_talks').update({ sections, updated_at: new Date().toISOString() }).eq('slug', slug);
  if (up.error) throw new Error(up.error.message);
  console.log(`talk-script-to-db: ${texts.length} slides of script saved on ${slug}.`);
}
