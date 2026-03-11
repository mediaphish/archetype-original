/**
 * AO Automation — Import inbox batches.
 * GET /api/ao/import/batches
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const limit = Math.max(1, Math.min(50, Number(req.query?.limit || 20)));

  try {
    const { data: batches, error: batchErr } = await supabaseAdmin
      .from('ao_import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (batchErr) {
      if (String(batchErr.message || '').includes('ao_import_batches')) {
        return res.status(500).json({
          ok: false,
          error: 'Import inbox is not set up yet. Run database/ao_imports.sql in Supabase, then refresh.',
        });
      }
      return res.status(500).json({ ok: false, error: batchErr.message });
    }

    const ids = (batches || []).map((b) => b.id);
    let items = [];
    if (ids.length > 0) {
      const { data: itemRows, error: itemErr } = await supabaseAdmin
        .from('ao_import_items')
        .select('batch_id,status')
        .in('batch_id', ids);
      if (itemErr) {
        if (String(itemErr.message || '').includes('ao_import_items')) {
          return res.status(500).json({
            ok: false,
            error: 'Import inbox is not set up yet. Run database/ao_imports.sql in Supabase, then refresh.',
          });
        }
        return res.status(500).json({ ok: false, error: itemErr.message });
      }
      items = itemRows || [];
    }

    const countsByBatch = new Map();
    for (const it of items) {
      const bid = it.batch_id;
      const prev = countsByBatch.get(bid) || { total: 0, validated: 0, rejected: 0, published: 0 };
      prev.total += 1;
      if (it.status === 'validated') prev.validated += 1;
      if (it.status === 'rejected') prev.rejected += 1;
      if (it.status === 'published') prev.published += 1;
      countsByBatch.set(bid, prev);
    }

    const out = (batches || []).map((b) => ({
      ...b,
      counts: countsByBatch.get(b.id) || { total: 0, validated: 0, rejected: 0, published: 0 },
    }));

    return res.status(200).json({ ok: true, batches: out });
  } catch (e) {
    console.error('[ao/import/batches]', e);
    if (String(e.message || '').toLowerCase().includes('does not exist') && String(e.message || '').includes('ao_import_')) {
      return res.status(500).json({
        ok: false,
        error: 'Import inbox is not set up yet. Run database/ao_imports.sql in Supabase, then refresh.',
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
}

