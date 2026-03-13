/**
 * AO Newsroom Shared Memory Loop
 * Shared editorial memory built from:
 * - public/knowledge.json (site corpus)
 * - ao_scheduled_posts where status='posted' (social posts actually published)
 *
 * Best-effort, additive: if tables/columns are missing, functions return clear errors.
 */

import fs from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '../supabase-admin.js';

function safeText(v, max = 4000) {
  const s = String(v || '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s.slice(0, max);
}

function normTag(v) {
  const t = String(v || '').trim().toLowerCase();
  if (!t) return null;
  return t.slice(0, 80);
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr || []) {
    const v = String(x || '');
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

async function readKnowledgeJson() {
  const p = path.join(process.cwd(), 'public', 'knowledge.json');
  const raw = await fs.readFile(p, 'utf-8');
  const parsed = JSON.parse(raw);
  const docs = Array.isArray(parsed?.docs) ? parsed.docs : [];
  return docs;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function rebuildEditorialMemory({ email }) {
  const createdByEmail = String(email || '').toLowerCase().trim();
  if (!createdByEmail) {
    return { ok: false, error: 'Missing email' };
  }

  // Ensure settings row exists so UI can edit immediately.
  try {
    await supabaseAdmin
      .from('ao_editorial_settings')
      .upsert({ created_by_email: createdByEmail, updated_at: new Date().toISOString() }, { onConflict: 'created_by_email' });
  } catch (_) {}

  // Clear current memory for this owner (rebuild is authoritative).
  const del = await supabaseAdmin.from('ao_editorial_memory_items').delete().eq('created_by_email', createdByEmail);
  if (del.error) {
    return { ok: false, error: del.error.message || 'Could not clear editorial memory (missing table?)' };
  }

  let corpusInserted = 0;
  let socialInserted = 0;

  // 1) Corpus → memory
  try {
    const docs = await readKnowledgeJson();
    const rows = docs
      .filter((d) => String(d?.status || '').toLowerCase() === 'published')
      .map((d) => {
        const tags = uniq([...(Array.isArray(d?.tags) ? d.tags : []), ...(Array.isArray(d?.categories) ? d.categories : [])]
          .map(normTag)
          .filter(Boolean));
        const publishedAt = d?.updated_at || d?.created_at || null;
        return {
          created_by_email: createdByEmail,
          kind: 'corpus_doc',
          title: safeText(d?.title, 220),
          source_url_or_slug: safeText(d?.slug, 220),
          body_text: safeText(d?.body || d?.summary || '', 8000),
          published_at: publishedAt,
          ao_lane: safeText((Array.isArray(d?.categories) && d.categories[0]) ? d.categories[0] : (tags[0] || ''), 80),
          topic_tags: tags,
          updated_at: new Date().toISOString(),
        };
      });

    for (const part of chunk(rows, 200)) {
      const ins = await supabaseAdmin.from('ao_editorial_memory_items').insert(part);
      if (ins.error) throw ins.error;
      corpusInserted += part.length;
    }
  } catch (e) {
    // Don't fail the whole rebuild if corpus parsing is imperfect; return partial results.
    return { ok: false, error: e?.message || 'Failed to import corpus into memory', corpusInserted, socialInserted };
  }

  // 2) Posted social → memory
  try {
    // Select with intent + feedback if available.
    let rows = null;
    let selErr = null;
    const full = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('id,platform,text,scheduled_at,updated_at,posted_at,feedback_rating,feedback_notes,ao_lane,topic_tags,source_quote_id,source_idea_id')
      .eq('status', 'posted')
      .order('scheduled_at', { ascending: false })
      .limit(500);
    if (full.error) {
      selErr = full.error;
    } else {
      rows = full.data;
    }

    // Fallback to minimal columns (older schema).
    if (selErr) {
      const minimal = await supabaseAdmin
        .from('ao_scheduled_posts')
        .select('id,platform,text,scheduled_at,updated_at')
        .eq('status', 'posted')
        .order('scheduled_at', { ascending: false })
        .limit(500);
      if (minimal.error) throw minimal.error;
      rows = minimal.data;
    }

    const items = (Array.isArray(rows) ? rows : []).map((r) => {
      const tags = uniq((Array.isArray(r?.topic_tags) ? r.topic_tags : []).map(normTag).filter(Boolean));
      const publishedAt = r?.posted_at || r?.scheduled_at || r?.updated_at || null;
      return {
        created_by_email: createdByEmail,
        kind: 'social_post',
        title: safeText((String(r?.text || '').split('\n')[0] || '').slice(0, 160), 160),
        source_url_or_slug: null,
        body_text: safeText(r?.text, 8000),
        published_at: publishedAt,
        ao_lane: safeText(r?.ao_lane, 80),
        topic_tags: tags,
        source_quote_id: r?.source_quote_id || null,
        source_idea_id: r?.source_idea_id || null,
        source_scheduled_post_id: r?.id || null,
        external_platform: safeText(r?.platform, 40),
        feedback_rating: safeText(r?.feedback_rating, 20),
        feedback_notes: safeText(r?.feedback_notes, 1200),
        updated_at: new Date().toISOString(),
      };
    });

    for (const part of chunk(items, 200)) {
      const ins = await supabaseAdmin.from('ao_editorial_memory_items').insert(part);
      if (ins.error) throw ins.error;
      socialInserted += part.length;
    }
  } catch (e) {
    return { ok: false, error: e?.message || 'Failed to import posted social into memory', corpusInserted, socialInserted };
  }

  return { ok: true, corpusInserted, socialInserted, totalInserted: corpusInserted + socialInserted };
}

export async function getEditorialSettings({ email }) {
  const createdByEmail = String(email || '').toLowerCase().trim();
  if (!createdByEmail) return { ok: false, error: 'Missing email' };

  const out = await supabaseAdmin
    .from('ao_editorial_settings')
    .select('created_by_email,beat_priorities,updated_at')
    .eq('created_by_email', createdByEmail)
    .maybeSingle();
  if (out.error) return { ok: false, error: out.error.message || 'Could not load settings' };
  const row = out.data || { created_by_email: createdByEmail, beat_priorities: [], updated_at: null };
  return { ok: true, settings: row };
}

export async function saveEditorialSettings({ email, beatPriorities }) {
  const createdByEmail = String(email || '').toLowerCase().trim();
  if (!createdByEmail) return { ok: false, error: 'Missing email' };
  const cleaned = uniq((Array.isArray(beatPriorities) ? beatPriorities : [])
    .map((x) => String(x || '').trim())
    .filter(Boolean))
    .slice(0, 50);

  const up = await supabaseAdmin
    .from('ao_editorial_settings')
    .upsert(
      {
        created_by_email: createdByEmail,
        beat_priorities: cleaned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'created_by_email' }
    )
    .select('created_by_email,beat_priorities,updated_at')
    .single();

  if (up.error) return { ok: false, error: up.error.message || 'Could not save settings' };
  return { ok: true, settings: up.data };
}

export async function upsertMemoryFromScheduledPost({ email, scheduledPostRow }) {
  const createdByEmail = String(email || '').toLowerCase().trim();
  if (!createdByEmail) return { ok: false, error: 'Missing email' };
  const r = scheduledPostRow || null;
  if (!r?.id) return { ok: false, error: 'Missing scheduled post row' };

  const tags = uniq((Array.isArray(r?.topic_tags) ? r.topic_tags : []).map(normTag).filter(Boolean));
  const publishedAt = r?.posted_at || r?.scheduled_at || r?.updated_at || null;
  const patch = {
    created_by_email: createdByEmail,
    kind: 'social_post',
    title: safeText((String(r?.text || '').split('\n')[0] || '').slice(0, 160), 160),
    body_text: safeText(r?.text, 8000),
    published_at: publishedAt,
    ao_lane: safeText(r?.ao_lane, 80),
    topic_tags: tags,
    source_quote_id: r?.source_quote_id || null,
    source_idea_id: r?.source_idea_id || null,
    source_scheduled_post_id: r?.id || null,
    external_platform: safeText(r?.platform, 40),
    feedback_rating: safeText(r?.feedback_rating, 20),
    feedback_notes: safeText(r?.feedback_notes, 1200),
    updated_at: new Date().toISOString(),
  };

  const up = await supabaseAdmin
    .from('ao_editorial_memory_items')
    .upsert(patch, { onConflict: 'created_by_email,kind,source_scheduled_post_id' });
  if (up.error) return { ok: false, error: up.error.message || 'Could not mirror into editorial memory' };
  return { ok: true };
}

