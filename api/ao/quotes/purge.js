/**
 * AO Automation — Permanent purge tools (danger zone).
 * POST /api/ao/quotes/purge
 *
 * Body:
 * - mode: 'delete_cleared' | 'flush_everything_today'
 *
 * Notes:
 * - Writes best-effort discard-memory so the same items don't come back.
 * - Deletes are permanent and cannot be undone.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

function normUrl(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function writeDiscardMemory({ email, rows, reason }) {
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) return;

  const inserts = [];
  for (const r of items) {
    const canonicalUrl = normUrl(r?.source_url);
    const canonicalSlug = r?.is_internal ? String(r?.source_slug_or_url || '').trim() || null : null;
    if (!canonicalUrl && !canonicalSlug) continue;
    inserts.push({
      created_by_email: email,
      item_kind: 'quote',
      canonical_url: canonicalUrl,
      canonical_slug: canonicalSlug,
      reason,
      created_at: new Date().toISOString(),
    });
    if (inserts.length >= 500) break;
  }
  if (!inserts.length) return;

  // Best-effort; skip if table isn't set up.
  try {
    await supabaseAdmin.from('ao_discard_memory').upsert(inserts);
  } catch (_) {}
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const mode = String(req.body?.mode || '').trim().toLowerCase();
  const allowed = new Set(['delete_cleared', 'flush_everything_today']);
  if (!allowed.has(mode)) return res.status(400).json({ ok: false, error: 'mode required' });

  const statusSet = mode === 'delete_cleared'
    ? ['cleared']
    : ['pending', 'held', 'approved', 'cleared'];

  try {
    // Load a subset for memory (avoid huge payloads).
    const { data: rows, error: listErr } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('id,is_internal,source_url,source_slug_or_url')
      .eq('created_by_email', auth.email)
      .in('status', statusSet)
      .limit(800);

    if (listErr) return res.status(500).json({ ok: false, error: listErr.message });

    await writeDiscardMemory({
      email: auth.email,
      rows: rows || [],
      reason: mode === 'delete_cleared' ? 'Purged cleared' : 'One-time full flush',
    });

    const { error, count } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .delete({ count: 'exact' })
      .eq('created_by_email', auth.email)
      .in('status', statusSet);

    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.status(200).json({
      ok: true,
      deleted: typeof count === 'number' ? count : null,
      mode,
    });
  } catch (e) {
    console.error('[ao/quotes/purge]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

