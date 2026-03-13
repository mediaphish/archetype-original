/**
 * AO Newsroom Shared Memory Loop
 * GET /api/ao/editorial/rebuild  -> status snapshot
 * POST /api/ao/editorial/rebuild -> rebuild memory (corpus + posted social)
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { rebuildEditorialMemory } from '../../../lib/ao/editorialMemory.js';

async function countsByKind(email) {
  const out = await supabaseAdmin
    .from('ao_editorial_memory_items')
    .select('kind', { count: 'exact' })
    .eq('created_by_email', email);
  if (out.error) throw out.error;
  const rows = Array.isArray(out.data) ? out.data : [];
  const counts = {};
  for (const r of rows) {
    const k = String(r?.kind || 'unknown');
    counts[k] = (counts[k] || 0) + 1;
  }
  return { total: rows.length, counts };
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;
  const email = auth.email;

  if (req.method === 'GET') {
    try {
      const stats = await countsByKind(email);
      return res.status(200).json({ ok: true, stats });
    } catch (e) {
      return res.status(200).json({
        ok: true,
        stats: { total: 0, counts: {} },
        warning: String(e?.message || e || 'Memory not ready yet'),
        missing_sql: [
          'database/ao_editorial_memory_items.sql',
          'database/ao_editorial_settings.sql',
          'database/ao_scout_chase_list.sql'
        ]
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const result = await rebuildEditorialMemory({ email });
      if (!result.ok) {
        return res.status(500).json({ ok: false, error: result.error || 'Rebuild failed', ...result });
      }
      return res.status(200).json({ ok: true, ...result });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: String(e?.message || e || 'Rebuild failed'),
        missing_sql: [
          'database/ao_editorial_memory_items.sql',
          'database/ao_editorial_settings.sql',
          'database/ao_scout_chase_list.sql'
        ]
      });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}

