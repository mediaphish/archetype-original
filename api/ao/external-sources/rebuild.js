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
  const targetCount = clampInt(req.body?.target_count, 12, 6, 25);

  try {
    const startedAt = new Date().toISOString();
    let inserted = 0;
    const seenUrls = new Set();

    // Insert as we go so partial progress is saved even if the request is cut short.
    async function insertOne(v) {
      const url = String(v?.feed_url || '').trim();
      if (!url) return;
      if (seenUrls.has(url)) return;
      seenUrls.add(url);

      const row = {
        url,
        name: `AI — ${String(v?.name || '').trim()}`.slice(0, 120) || 'AI — Source',
        source_type: 'rss',
        origin: 'ai',
        is_protected: false,
        created_at: new Date().toISOString(),
      };

      const ins = await supabaseAdmin.from('ao_external_sources').insert(row);
      if (!ins.error) inserted += 1;
    }

    const built = await buildExternalSourcesFromPrompt({
      promptText: prompt,
      targetCount,
      onVerified: insertOne,
      maxCandidates: 30,
    });
    if (!built.ok) {
      return res.status(500).json({ ok: false, error: built.error || 'Rebuild failed' });
    }

    const verified = built.verified || [];
    if (verified.length === 0 || inserted === 0) {
      return res.status(200).json({
        ok: true,
        inserted: inserted || 0,
        message: built.note || 'No working feed sources found. Try again or provide a narrower prompt.',
        verified: [],
      });
    }

    // Only after we have at least some new sources, delete older AI sources.
    const wipeOld = await supabaseAdmin
      .from('ao_external_sources')
      .delete()
      .eq('is_protected', false)
      .eq('origin', 'ai')
      .lt('created_at', startedAt);
    if (wipeOld.error) {
      if (String(wipeOld.error.message || '').includes('ao_external_sources')) {
        return res.status(500).json({
          ok: false,
          error: 'External sources table is not set up yet. Run database/ao_queue_and_scan_schema.sql in Supabase.',
        });
      }
      if (String(wipeOld.error.message || '').includes('is_protected')) {
        return res.status(500).json({
          ok: false,
          error: 'Sources protection is not set up yet. Run database/ao_external_sources_protected.sql in Supabase.',
        });
      }
    }

    return res.status(200).json({
      ok: true,
      inserted,
      message: built.note || null,
      verified: verified.map((v) => ({ name: v.name, feed_url: v.feed_url, homepage_url: v.homepage_url })),
    });
  } catch (e) {
    console.error('[ao/external-sources rebuild]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

