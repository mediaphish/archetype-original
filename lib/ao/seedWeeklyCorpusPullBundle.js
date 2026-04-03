import { supabaseAdmin } from '../supabase-admin.js';
import { buildWeeklyCorpusPullBundle, weekStartMonday } from './buildWeeklyCorpusPullBundle.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

async function alreadyHaveBundleForWeek(email, weekStart) {
  const owner = String(email || '').trim().toLowerCase();
  if (!owner || !weekStart) return false;
  try {
    const { data } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('id, studio_playbook, created_at')
      .eq('created_by_email', owner)
      .order('created_at', { ascending: false })
      .limit(40);
    const rows = Array.isArray(data) ? data : [];
    for (const r of rows) {
      const ws = r?.studio_playbook?.weekly_corpus_pull?.week_start;
      if (ws === weekStart) return true;
    }
  } catch (_) {}
  return false;
}

/**
 * Creates one Review inbox row with cards + captions for the week (approval required).
 */
export async function seedWeeklyCorpusPullBundle({
  email,
  queryText,
  limit = 5,
  force = false,
} = {}) {
  const owner = String(email || '').trim().toLowerCase();
  if (!owner) return { ok: false, error: 'email required', inserted: false };

  const weekStart = weekStartMonday();
  if (!force && (await alreadyHaveBundleForWeek(owner, weekStart))) {
    return {
      ok: true,
      inserted: false,
      skipped: true,
      message: `Weekly corpus bundle for week starting ${weekStart} already exists.`,
      week_start: weekStart,
    };
  }

  const bundle = await buildWeeklyCorpusPullBundle({ queryText, limit });
  if (!bundle.ok || !bundle.items?.length) {
    return {
      ok: false,
      error: bundle.error || 'no_items',
      inserted: false,
      week_start: bundle.week_start,
    };
  }

  const title = `Weekly pull quotes — week of ${bundle.week_start}`;
  const firstQuote = bundle.items[0]?.quote || '';

  const studio_playbook = {
    weekly_corpus_pull: {
      week_start: bundle.week_start,
      theme_query: bundle.theme_query,
      generated_at: new Date().toISOString(),
      items: bundle.items,
    },
  };

  const out = await supabaseAdmin
    .from('ao_quote_review_queue')
    .insert({
      created_by_email: owner,
      quote_text: safeText(title, 500),
      author: null,
      source_slug_or_url: 'weekly-corpus-pull-bundle',
      source_type: 'internal_weekly_bundle',
      is_internal: true,
      status: 'pending',
      source_url: 'https://www.archetypeoriginal.com/ao/review',
      source_name: 'AO Automation',
      source_title: title,
      source_excerpt: safeText(firstQuote, 900),
      content_kind: 'weekly_corpus_bundle',
      best_move: 'weekly_pull_bundle',
      ao_lane: 'Weekly corpus pull quotes',
      pull_quote: safeText(firstQuote, 500),
      why_it_matters: `Automated weekly pick from your published writing (${safeText(bundle.theme_query, 120)}). Lines are chosen to stand alone with impact. Review the cards and interpretive captions (they should explain or enhance the line—the image carries the quote), then schedule or reject.`,
      summary_interpretation: `This bundle is ready for your review—no Analyst brief step. Use “Schedule week” to queue image + caption posts to your connected channels, or reject if you want a different week.`,
      studio_playbook,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (out.error) {
    return { ok: false, error: out.error.message || 'insert failed', inserted: false };
  }

  return {
    ok: true,
    inserted: true,
    id: out.data?.id || null,
    week_start: bundle.week_start,
    theme_query: bundle.theme_query,
    items_count: bundle.items.length,
  };
}
