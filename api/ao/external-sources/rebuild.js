/**
 * AO Automation — Rebuild external sources allowlist using Scout prompt.
 * POST /api/ao/external-sources/rebuild
 * Body (optional): { prompt?: string, target_count?: number }
 */

import { createClient } from '@supabase/supabase-js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { buildExternalSourcesFromPrompt, DEFAULT_SCOUT_SOURCES_PROMPT } from '../../../lib/ao/autoExternalSources.js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function clampInt(v, fallback, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : DEFAULT_SCOUT_SOURCES_PROMPT;
  const targetCount = clampInt(req.body?.target_count, 20, 10, 40);

  try {
    // Wipe first (start over).
    const wipe = await supabaseAdmin
      .from('ao_external_sources')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (wipe.error) {
      if (String(wipe.error.message || '').includes('ao_external_sources')) {
        return res.status(500).json({
          ok: false,
          error: 'External sources table is not set up yet. Run database/ao_queue_and_scan_schema.sql in Supabase.',
        });
      }
      return res.status(500).json({ ok: false, error: wipe.error.message });
    }

    const built = await buildExternalSourcesFromPrompt({ promptText: prompt, targetCount });
    if (!built.ok) {
      return res.status(500).json({ ok: false, error: 'Rebuild failed' });
    }

    const verified = built.verified || [];
    if (verified.length === 0) {
      return res.status(200).json({
        ok: true,
        inserted: 0,
        message: 'No working feed sources found. Try again or provide a narrower prompt.',
        verified: [],
      });
    }

    const rows = verified.map((v) => ({
      url: v.feed_url,
      name: `AI — ${String(v.name || '').trim()}`.slice(0, 120),
      source_type: 'rss',
      created_at: new Date().toISOString(),
    }));

    const ins = await supabaseAdmin.from('ao_external_sources').insert(rows);
    if (ins.error) {
      return res.status(500).json({ ok: false, error: ins.error.message });
    }

    return res.status(200).json({
      ok: true,
      inserted: rows.length,
      verified: verified.map((v) => ({ name: v.name, feed_url: v.feed_url, homepage_url: v.homepage_url })),
    });
  } catch (e) {
    console.error('[ao/external-sources rebuild]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

