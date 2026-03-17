import { supabaseAdmin } from '../supabase-admin.js';
import { runExternalScan } from './runExternalScan.js';

function hostOf(url) {
  try {
    const u = new URL(String(url || '').trim());
    return String(u.hostname || '').toLowerCase();
  } catch {
    return '';
  }
}

function platformOf(url) {
  const h = hostOf(url);
  if (!h) return 'unknown';
  if (h.includes('linkedin.com')) return 'linkedin';
  if (h === 'x.com' || h.endsWith('.x.com') || h.includes('twitter.com')) return 'x';
  if (h.includes('instagram.com')) return 'instagram';
  if (h.includes('facebook.com')) return 'facebook';
  if (h.includes('tiktok.com')) return 'tiktok';
  return 'web';
}

function isProbablyHardToRead(url) {
  const p = platformOf(url);
  return p === 'linkedin' || p === 'instagram' || p === 'facebook' || p === 'tiktok';
}

function bump(map, key) {
  const k = String(key || 'unknown');
  map[k] = Number(map[k] || 0) + 1;
}

export async function runCompetitorDigest(opts = {}) {
  const ownerEmail = String(process.env.AO_OWNER_EMAIL || '').toLowerCase().trim();
  if (!ownerEmail) return { ok: false, error: 'AO owner email is not set.' };

  const insertedCap = Math.max(5, Math.min(40, Number(opts.insertedCap || 20)));

  const attemptedPlatforms = {};
  const reachablePlatforms = {};
  let runId = null;

  try {
    const { data: runRow, error: runErr } = await supabaseAdmin
      .from('ao_competitor_digest_runs')
      .insert({
        created_by_email: ownerEmail,
        started_at: new Date().toISOString(),
        sources_count: 0,
        people_count: 0,
        attempted_platforms: {},
        reachable_platforms: {},
        inserted_count: 0,
      })
      .select('id')
      .single();
    if (runErr) {
      if (String(runErr.message || '').includes('ao_competitor_digest_runs')) {
        return { ok: false, error: 'Competitor digest is not set up yet. Run database/ao_competitor_watch_lane.sql in Supabase.' };
      }
      return { ok: false, error: runErr.message };
    }
    runId = runRow?.id || null;

    const tiers = ['friendly', 'competitor'];

    const { data: sources, error: sourcesErr } = await supabaseAdmin
      .from('ao_external_sources')
      .select('id,url,name,source_type,competitor_tier')
      .in('competitor_tier', tiers)
      .order('created_at', { ascending: false })
      .limit(200);
    if (sourcesErr) {
      const msg = String(sourcesErr.message || '');
      const friendly = msg.includes('competitor_tier')
        ? 'Competitor tagging is not set up yet. Run database/ao_competitor_watch_lane.sql in Supabase.'
        : msg;
      await supabaseAdmin
        .from('ao_competitor_digest_runs')
        .update({ finished_at: new Date().toISOString(), error_message: friendly })
        .eq('id', runId);
      return { ok: false, error: friendly };
    }

    const { data: people, error: peopleErr } = await supabaseAdmin
      .from('ao_brain_trust_sources')
      .select('id,name,profile_urls,competitor_tier,active')
      .in('competitor_tier', tiers)
      .order('created_at', { ascending: false })
      .limit(400);
    if (peopleErr) {
      const msg = String(peopleErr.message || '');
      const friendly = msg.includes('competitor_tier')
        ? 'Competitor tagging is not set up yet. Run database/ao_competitor_watch_lane.sql in Supabase.'
        : msg;
      await supabaseAdmin
        .from('ao_competitor_digest_runs')
        .update({ finished_at: new Date().toISOString(), error_message: friendly })
        .eq('id', runId);
      return { ok: false, error: friendly };
    }

    // Build scan override list.
    const overrides = [];
    const seen = new Set();

    for (const s of sources || []) {
      const url = String(s?.url || '').trim();
      if (!url) continue;
      bump(attemptedPlatforms, platformOf(url));
      const key = `src:${url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Even if social URLs exist in watched sources, keep them as "attempted" but don't scan them.
      if (isProbablyHardToRead(url)) continue;
      bump(reachablePlatforms, platformOf(url));
      overrides.push({
        id: s.id,
        url,
        name: s.name || url,
        source_type: String(s.source_type || 'rss'),
        competitor_tier: String(s.competitor_tier || 'none'),
      });
      if (overrides.length >= 35) break;
    }

    for (const p of people || []) {
      if (p?.active === false) continue;
      const urls = Array.isArray(p.profile_urls) ? p.profile_urls : [];
      for (const u of urls) {
        const url = String(u || '').trim();
        if (!url) continue;
        bump(attemptedPlatforms, platformOf(url));
        const key = `p:${url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (isProbablyHardToRead(url)) continue;
        bump(reachablePlatforms, platformOf(url));
        overrides.push({
          url,
          name: p.name || url,
          source_type: 'article',
          competitor_tier: String(p.competitor_tier || 'none'),
        });
        if (overrides.length >= 50) break;
      }
      if (overrides.length >= 50) break;
    }

    await supabaseAdmin
      .from('ao_competitor_digest_runs')
      .update({
        sources_count: Array.isArray(sources) ? sources.length : 0,
        people_count: Array.isArray(people) ? people.length : 0,
        attempted_platforms: attemptedPlatforms,
        reachable_platforms: reachablePlatforms,
      })
      .eq('id', runId);

    // Nothing reachable today (common for social-only profiles).
    if (overrides.length === 0) {
      await supabaseAdmin
        .from('ao_competitor_digest_runs')
        .update({
          finished_at: new Date().toISOString(),
          inserted_count: 0,
          error_message: null,
        })
        .eq('id', runId);
      return {
        ok: true,
        inserted: 0,
        message: 'No reachable competitor targets today (many social sites block reading).',
        attempted_platforms: attemptedPlatforms,
        reachable_platforms: reachablePlatforms,
      };
    }

    const scan = await runExternalScan({
      sourcesOverride: overrides,
      sourcesLimit: overrides.length,
      entriesPerSource: 8,
      candidatesCap: 140,
      insertedCap,
      enrichAnalyst: true,
      enrichLimit: 10,
      fetchFullText: true,
      tag: 'competitor',
    });

    const inserted = Number(scan?.candidatesInserted || 0) || 0;

    await supabaseAdmin
      .from('ao_competitor_digest_runs')
      .update({
        finished_at: new Date().toISOString(),
        inserted_count: inserted,
        error_message: scan?.ok ? null : (scan?.error || 'Competitor digest scan failed'),
      })
      .eq('id', runId);

    if (!scan?.ok) {
      return { ok: false, error: scan?.error || 'Competitor digest scan failed' };
    }

    return {
      ok: true,
      inserted,
      candidates_found: scan.candidatesFound ?? 0,
      attempted_platforms: attemptedPlatforms,
      reachable_platforms: reachablePlatforms,
    };
  } catch (e) {
    if (runId) {
      try {
        await supabaseAdmin
          .from('ao_competitor_digest_runs')
          .update({ finished_at: new Date().toISOString(), error_message: e.message || 'Competitor digest failed' })
          .eq('id', runId);
      } catch (_) {}
    }
    return { ok: false, error: e.message || 'Competitor digest failed' };
  }
}

