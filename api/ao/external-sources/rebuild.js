/**
 * AO Automation — Rebuild external sources allowlist using Scout prompt.
 * POST /api/ao/external-sources/rebuild
 * Body (optional): { prompt?: string, target_count?: number }
 */

import { createClient } from '@supabase/supabase-js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { buildExternalSourcesFastFromPrompt, DEFAULT_SCOUT_SOURCES_PROMPT } from '../../../lib/ao/autoExternalSources.js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function clampInt(v, fallback, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function starterSources() {
  // Small, high-trust starter list to unblock external scanning when AI times out.
  // These are treated as article/listing pages (not feeds); the scan will follow links.
  return [
    { name: 'Center for Creative Leadership', url: 'https://www.ccl.org/articles/', source_type: 'article' },
    { name: 'Knowledge@Wharton', url: 'https://knowledge.wharton.upenn.edu/', source_type: 'article' },
    { name: 'First Round Review', url: 'https://review.firstround.com/', source_type: 'article' },
    { name: 'Atlassian Work Life', url: 'https://www.atlassian.com/blog', source_type: 'article' },
    { name: 'Gallup Workplace', url: 'https://www.gallup.com/workplace/', source_type: 'article' },
    { name: 'strategy+business', url: 'https://www.strategy-business.com/', source_type: 'article' },
    { name: 'Association for Talent Development', url: 'https://www.td.org/insights', source_type: 'article' },
    { name: 'MIT Sloan Management Review (free articles)', url: 'https://sloanreview.mit.edu/', source_type: 'article' },
  ];
}

async function getEditorialPromptAddendum({ supabaseAdmin, email }) {
  const ownerEmail = String(email || '').toLowerCase().trim();
  if (!ownerEmail) return '';
  try {
    const settingsOut = await supabaseAdmin
      .from('ao_editorial_settings')
      .select('beat_priorities')
      .eq('created_by_email', ownerEmail)
      .maybeSingle();
    const beat = Array.isArray(settingsOut.data?.beat_priorities) ? settingsOut.data.beat_priorities : [];

    const chaseOut = await supabaseAdmin
      .from('ao_scout_chase_list')
      .select('topic,why,priority')
      .eq('created_by_email', ownerEmail)
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(12);
    const chase = Array.isArray(chaseOut.data) ? chaseOut.data : [];

    const beatBlock = beat.length
      ? `Beat priorities (your universe):\n- ${beat.slice(0, 18).map((x) => String(x || '').trim()).filter(Boolean).join('\n- ')}\n`
      : '';
    const chaseBlock = chase.length
      ? `Chase list (what to pursue next):\n- ${chase.slice(0, 12).map((c) => {
        const t = String(c?.topic || '').trim();
        const why = String(c?.why || '').trim();
        return why ? `${t} — ${why}` : t;
      }).filter(Boolean).join('\n- ')}\n`
      : '';

    if (!beatBlock && !chaseBlock) return '';
    return `\n\nExtra guidance (use this to pick sources that actually fit AO):\n${beatBlock}${chaseBlock}\nRules:\n- Prefer sources that will reliably produce leadership content that matches the beat priorities.\n- Avoid paywalls.\n`;
  } catch (_) {
    return '';
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const basePrompt = typeof req.body?.prompt === 'string' ? req.body.prompt : DEFAULT_SCOUT_SOURCES_PROMPT;
  const targetCount = clampInt(req.body?.target_count, 12, 6, 25);

  try {
    const startedAt = new Date().toISOString();
    const addendum = await getEditorialPromptAddendum({ supabaseAdmin, email: auth.email });
    const prompt = `${String(basePrompt || '').trim()}${addendum}`;
    const built = await buildExternalSourcesFastFromPrompt({
      promptText: prompt,
      targetCount,
      maxCandidates: 30,
    });
    if (!built.ok) {
      const msg = String(built.error || 'Rebuild failed');
      const shouldFallback =
        msg.toLowerCase().includes('did not respond in time') ||
        msg.toLowerCase().includes('returned no candidates');
      if (!shouldFallback) {
        return res.status(500).json({ ok: false, error: msg });
      }
      const fallback = starterSources().slice(0, Math.max(4, Math.min(12, targetCount)));
      const rows = fallback.map((v) => ({
        url: v.url,
        name: `AI — ${String(v.name || '').trim()}`.slice(0, 120) || 'AI — Source',
        source_type: 'article',
        origin: 'ai',
        is_protected: false,
        created_at: startedAt,
      }));

      const ins = await supabaseAdmin.from('ao_external_sources').upsert(rows, { onConflict: 'url', ignoreDuplicates: true });
      if (ins.error) {
        if (String(ins.error.message || '').includes('ao_external_sources')) {
          return res.status(500).json({
            ok: false,
            error: 'External sources table is not set up yet. Run database/ao_queue_and_scan_schema.sql in Supabase.',
          });
        }
        if (String(ins.error.message || '').includes('is_protected') || String(ins.error.message || '').includes('origin')) {
          return res.status(500).json({
            ok: false,
            error: 'Sources protection is not set up yet. Run database/ao_external_sources_protected.sql in Supabase.',
          });
        }
        return res.status(500).json({ ok: false, error: ins.error.message });
      }

      // Only after we have at least some new sources, delete older AI sources.
      await supabaseAdmin
        .from('ao_external_sources')
        .delete()
        .eq('is_protected', false)
        .eq('origin', 'ai')
        .lt('created_at', startedAt);

      return res.status(200).json({
        ok: true,
        inserted: rows.length,
        message: 'AI timed out, so I saved a small starter list of trusted sources. Next scan will confirm which ones work.',
        verified: fallback.map((v) => ({ name: v.name, url: v.url, source_type: 'article', feed_url: null, homepage_url: v.url })),
      });
    }

    const verified = built.verified || [];
    if (verified.length === 0) {
      return res.status(200).json({
        ok: true,
        inserted: 0,
        message: 'No URLs were returned this time. Try rebuild again (it can vary) or add a URL manually.',
        verified: [],
      });
    }

    const rows = verified.map((v) => ({
      url: v.url || v.feed_url || v.homepage_url,
      name: `AI — ${String(v.name || '').trim()}`.slice(0, 120) || 'AI — Source',
      source_type: String(v.source_type || '').toLowerCase() === 'article' ? 'article' : 'rss',
      origin: 'ai',
      is_protected: false,
      created_at: startedAt,
    }));

    const ins = await supabaseAdmin.from('ao_external_sources').upsert(rows, { onConflict: 'url', ignoreDuplicates: true });
    if (ins.error) {
      if (String(ins.error.message || '').includes('ao_external_sources')) {
        return res.status(500).json({
          ok: false,
          error: 'External sources table is not set up yet. Run database/ao_queue_and_scan_schema.sql in Supabase.',
        });
      }
      if (String(ins.error.message || '').includes('is_protected') || String(ins.error.message || '').includes('origin')) {
        return res.status(500).json({
          ok: false,
          error: 'Sources protection is not set up yet. Run database/ao_external_sources_protected.sql in Supabase.',
        });
      }
      return res.status(500).json({ ok: false, error: ins.error.message });
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
      inserted: rows.length,
      message: built.note || 'Saved feed links. Next scan will confirm which ones work.',
      verified: verified.map((v) => ({
        name: v.name,
        url: v.url || v.feed_url || v.homepage_url,
        source_type: v.source_type || (v.feed_url ? 'rss' : 'article'),
        feed_url: v.feed_url || null,
        homepage_url: v.homepage_url,
      })),
    });
  } catch (e) {
    console.error('[ao/external-sources rebuild]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

