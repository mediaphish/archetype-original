/**
 * Infographic posts waiting on Bart (Auto > Queue). See lib/ao/infographics.js.
 *
 * GET                                   waiting ones, and the approved ones still to post
 * POST {action:'approve', id, caption?, caption_x?}   schedule it on every channel
 * POST {action:'redo', id, note}        another take on the same piece, with Bart's note
 * POST {action:'discard', id}           set it aside
 * POST {action:'make'}                  make one more now
 *
 * Owner session only. Nothing posts until Bart approves it.
 */

import { requireAoSession } from '../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { listInfographics, approveInfographic, redoInfographic, discardInfographic, makeInfographic } from '../../lib/ao/infographics.js';

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;
  try {
    if (req.method === 'GET') {
      const pending = await listInfographics({ status: 'pending' });
      const { data: upcoming } = await supabaseAdmin
        .from('ao_infographics')
        .select('id, image_url, source_title, scheduled_at')
        .eq('status', 'approved')
        .gt('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });
      return res.status(200).json({ ok: true, pending, upcoming: upcoming || [] });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    const body = await readJson(req);
    const id = String(body.id || '');
    let r;
    if (body.action === 'approve') r = await approveInfographic(id, { caption: body.caption, caption_x: body.caption_x });
    else if (body.action === 'redo') r = await redoInfographic(id, body.note);
    else if (body.action === 'discard') r = await discardInfographic(id);
    else if (body.action === 'make') r = await makeInfographic();
    else return res.status(400).json({ ok: false, error: 'Unknown action' });
    return res.status(r.ok ? 200 : 502).json(r);
  } catch (err) {
    console.error('[infographics] failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
