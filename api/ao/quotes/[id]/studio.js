/**
 * AO Automation — Studio: save edits to drafts + quote card caption.
 * PATCH /api/ao/quotes/[id]/studio
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';

function cleanJsonObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
}

function cleanDraftsByChannel(obj) {
  const o = cleanJsonObject(obj);
  if (!o) return null;
  const out = {};
  for (const k of ['linkedin', 'facebook', 'instagram', 'x']) {
    const s = String(o[k] ?? '').trim();
    if (s) out[k] = s.slice(0, k === 'x' ? 260 : k === 'instagram' ? 400 : k === 'facebook' ? 500 : 600);
  }
  return Object.keys(out).length ? out : null;
}

function cleanHashtagsByChannel(obj) {
  const o = cleanJsonObject(obj);
  if (!o) return null;
  const out = {};
  for (const k of ['linkedin', 'facebook', 'instagram', 'x']) {
    const arr = Array.isArray(o[k]) ? o[k] : [];
    const tags = [];
    const seen = new Set();
    for (const t of arr) {
      const s = String(t || '').trim();
      if (!s) continue;
      const norm = (s.startsWith('#') ? s : `#${s.replace(/^#+/, '')}`).slice(0, 40);
      const key = norm.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(norm);
      if (tags.length >= 6) break;
    }
    if (tags.length) out[k] = tags;
  }
  return Object.keys(out).length ? out : null;
}

function cleanFirstComment(obj) {
  const o = cleanJsonObject(obj);
  if (!o) return null;
  const out = {};
  for (const k of ['linkedin', 'facebook', 'instagram', 'x']) {
    const raw = o[k];
    if (raw == null) continue;
    const s = String(raw).trim();
    out[k] = s ? s.slice(0, 400) : null;
  }
  return Object.keys(out).length ? out : null;
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Quote ID required' });
  }

  try {
    const drafts_by_channel = cleanDraftsByChannel(req.body?.drafts_by_channel);
    const hashtags_by_channel = cleanHashtagsByChannel(req.body?.hashtags_by_channel);
    const first_comment_suggestions = cleanFirstComment(req.body?.first_comment_suggestions);
    const quote_card_caption = req.body?.quote_card_caption == null ? undefined : String(req.body.quote_card_caption || '').trim().slice(0, 500) || null;

    const patch = {
      updated_at: new Date().toISOString(),
    };
    if (drafts_by_channel !== null) patch.drafts_by_channel = drafts_by_channel;
    if (hashtags_by_channel !== null) patch.hashtags_by_channel = hashtags_by_channel;
    if (first_comment_suggestions !== null) patch.first_comment_suggestions = first_comment_suggestions;
    if (quote_card_caption !== undefined) patch.quote_card_caption = quote_card_caption;

    const { data, error } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      const msg = String(error.message || '');
      const missingDraftCols =
        msg.includes('drafts_by_channel') ||
        msg.includes('hashtags_by_channel') ||
        msg.includes('first_comment_suggestions') ||
        msg.includes('quote_card_caption');
      if (missingDraftCols) {
        return res.status(500).json({
          ok: false,
          error: 'Draft fields are not set up yet. Run database/ao_quote_review_queue_add_drafts.sql in Supabase.',
        });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, quote: data });
  } catch (e) {
    console.error('[ao/quotes/studio PATCH]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

