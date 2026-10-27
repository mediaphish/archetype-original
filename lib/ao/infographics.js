/**
 * Infographic posts, from draft to schedule.
 *
 * Bart, 2026-10-23: "I want 3 images a week with captions." 2026-10-24:
 * "These I will want to approve." So nothing here posts on its own: each one
 * waits in the Queue in Auto until Bart approves it, asks for a redo, or sets
 * it aside. Approved ones go out on all five channels, one a day on Tuesday,
 * Wednesday and Thursday at 12:30 Central, so they never land on a quote card
 * or reshare morning.
 *
 * A weekday job keeps up to three waiting for him, making one per run (a
 * graphic takes a minute or two to write and draw).
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { insertScheduledPostsSafely } from '../db/scheduledPosts.js';
import { uploadQuoteCardPngBuffer } from './quoteCardImageUrl.js';
import { renderInfographicPng } from './infographicCanvas.js';
import { LAYOUTS, eligibleSources, rankSources, writeInfographic, loadKnowledgeDocs, toSourceUrl } from './infographicContent.js';
import { BUNDLE_PLATFORMS, fitForX } from './scheduleWeeklyBundle.js';

export const WAITING_TARGET = 3;
export const POST_DAYS = [2, 3, 4]; // Tuesday, Wednesday, Thursday
const POST_HOUR_UTC = 17;
const POST_MINUTE_UTC = 30;

const table = () => supabaseAdmin.from('ao_infographics');

/** The layout used least lately, so the week does not look the same three times. */
export function nextLayout(recent) {
  const counts = Object.fromEntries(LAYOUTS.map((l) => [l, 0]));
  for (const r of recent || []) if (counts[r.layout] !== undefined) counts[r.layout] += 1;
  return LAYOUTS.slice().sort((a, b) => counts[a] - counts[b])[0];
}

/** Pure: the next Tuesday, Wednesday or Thursday slot after `from` that is not taken. */
export function nextSlot(from, taken = []) {
  const takenDays = new Set(taken.map((t) => new Date(t).toISOString().slice(0, 10)));
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(POST_HOUR_UTC, POST_MINUTE_UTC, 0, 0);
  for (let i = 0; i < 60; i += 1) {
    if (POST_DAYS.includes(d.getUTCDay()) && !takenDays.has(d.toISOString().slice(0, 10))) return new Date(d);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

export async function listInfographics({ status = 'pending' } = {}) {
  const { data, error } = await table().select('*').eq('status', status).order('created_at', { ascending: true }).limit(50);
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Write, draw and keep one graphic for Bart to review.
 * @param {{ slug?: string, layout?: string, redoNote?: string }} [opts]
 */
export async function makeInfographic({ slug = null, layout = null, redoNote = '' } = {}) {
  const docs = (await loadKnowledgeDocs()) || [];
  const { data: recent } = await table().select('layout, source_slug').order('created_at', { ascending: false }).limit(200);
  const used = new Set((recent || []).map((r) => r.source_slug).filter(Boolean));
  let doc = slug ? docs.find((d) => d.slug === slug) : null;
  if (!doc) {
    const pool = rankSources(eligibleSources(docs, used));
    // A little variety among the strongest fits, rather than always the top one.
    doc = pool[Math.floor(Math.random() * Math.min(5, pool.length))];
  }
  if (!doc) return { ok: false, error: 'No published piece left that has not had a graphic.' };
  const shape = LAYOUTS.includes(layout) ? layout : nextLayout((recent || []).slice(0, 9));

  const written = await writeInfographic(doc, shape, { redoNote });
  if (!written.ok) return written;
  const png = await renderInfographicPng(written.graphic);
  if (!png.ok) return { ok: false, error: png.error };
  const up = await uploadQuoteCardPngBuffer(png.buffer, { subfolder: 'infographics' });
  if (!up.ok) return { ok: false, error: up.error };

  const { data, error } = await table()
    .insert({
      layout: shape,
      content: written.graphic,
      caption: written.caption,
      caption_x: written.caption_x,
      image_url: up.publicUrl,
      source_slug: doc.slug,
      source_title: doc.title,
      source_url: toSourceUrl(doc.slug, doc.type, doc),
      redo_note: redoNote || null,
    })
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, infographic: data };
}

/** Keep up to three waiting. One per call. */
export async function keepInfographicsWaiting() {
  const { count, error } = await table().select('id', { count: 'exact', head: true }).eq('status', 'pending');
  if (error) throw new Error(error.message);
  if ((count || 0) >= WAITING_TARGET) return { ok: true, skipped: true, waiting: count };
  const r = await makeInfographic();
  return { ...r, waiting: (count || 0) + (r.ok ? 1 : 0) };
}

/** Post text for one channel: the caption, then where it came from. */
export function postText(row, platform) {
  const title = String(row.source_title || '').trim();
  const url = String(row.source_url || '').trim();
  if (platform === 'twitter') return fitForX(row.caption_x || row.caption, title, url);
  // Instagram does not make links in captions clickable; it points to the link in bio (the site's link policy).
  const where = platform === 'instagram' ? (url ? 'link in bio' : '') : url;
  const tail = [title ? `From "${title}"` : '', where].filter(Boolean).join(' · ');
  return [row.caption, tail].filter(Boolean).join('\n\n').slice(0, 2200);
}

/** Bart approved it, maybe after editing the captions: schedule it on every channel. */
export async function approveInfographic(id, { caption = null, caption_x = null } = {}) {
  const { data: row, error } = await table().select('*').eq('id', id).single();
  if (error || !row) return { ok: false, error: 'Not found' };
  if (row.status !== 'pending') return { ok: false, error: 'Already decided' };
  const final = { ...row, caption: String(caption ?? row.caption).trim(), caption_x: String(caption_x ?? row.caption_x).trim() };

  const { data: taken } = await table().select('scheduled_at').eq('status', 'approved').gt('scheduled_at', new Date().toISOString());
  const when = nextSlot(new Date(), (taken || []).map((t) => t.scheduled_at));
  const posts = BUNDLE_PLATFORMS.map((ch) => ({
    platform: ch.platform,
    account_id: ch.account_id,
    scheduled_at: when.toISOString(),
    text: postText(final, ch.platform),
    image_url: row.image_url,
    first_comment: null,
    status: 'scheduled',
    source_kind: 'infographic',
    intent: { infographic_id: row.id, layout: row.layout, source_slug: row.source_slug },
    best_move: 'infographic',
  }));
  const result = await insertScheduledPostsSafely(posts, {
    select: 'id, platform, scheduled_at',
    spread: true,
    allowMinimalFallback: true,
    stripForFallback: ({ source_kind, intent, best_move, ...rest }) => rest,
  });
  if (!result.ok) return { ok: false, error: result.error || 'Could not schedule' };
  await table()
    .update({ status: 'approved', caption: final.caption, caption_x: final.caption_x, scheduled_at: when.toISOString(), decided_at: new Date().toISOString() })
    .eq('id', id);
  return { ok: true, scheduled_at: when.toISOString(), posts: result.inserted?.length || posts.length };
}

export async function discardInfographic(id) {
  const { error } = await table().update({ status: 'discarded', decided_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending');
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Bart asked for another take: the same piece and layout, with his note, and the old one set aside. */
export async function redoInfographic(id, note) {
  const { data: row } = await table().select('*').eq('id', id).single();
  if (!row) return { ok: false, error: 'Not found' };
  const r = await makeInfographic({ slug: row.source_slug, layout: row.layout, redoNote: String(note || '').trim() || 'Try a different angle on the same piece.' });
  if (r.ok) await discardInfographic(id);
  return r;
}
