import { generateReadyPostDrafts } from './readyPostSocialDrafts.js';
import { buildScheduleSuggestionForChannels } from './scheduleHeuristic.js';
import { supabaseAdmin } from '../supabase-admin.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

/**
 * Build source text for social draft generation from episode summary and takeaways.
 */
export function buildEpisodeMarketingSource({ title, summary, key_takeaways = [], podcast_url }) {
  const lines = [];
  const t = safeText(title, 200);
  if (t) lines.push(`Episode: ${t}`);
  const s = safeText(summary, 1200);
  if (s) {
    lines.push('');
    lines.push(s);
  }
  const takeaways = (Array.isArray(key_takeaways) ? key_takeaways : [])
    .map((x) => safeText(x, 240))
    .filter(Boolean);
  if (takeaways.length) {
    lines.push('');
    lines.push('Key takeaways:');
    for (const item of takeaways.slice(0, 6)) {
      lines.push(`- ${item}`);
    }
  }
  const url = safeText(podcast_url, 500);
  if (url) {
    lines.push('');
    lines.push(`Listen and read the full episode: ${url}`);
  }
  return lines.join('\n').trim();
}

const DEFAULT_CHANNELS = ['linkedin', 'facebook', 'instagram', 'x'];

/**
 * Generate channel drafts for an episode announcement and save to ao_auto_bundles.
 */
export async function createEpisodeMarketingBundle({
  email,
  title,
  summary,
  key_takeaways = [],
  podcast_url,
  slug = '',
  draft_id = null,
  thread_id = null,
} = {}) {
  const sourceText = buildEpisodeMarketingSource({ title, summary, key_takeaways, podcast_url });
  if (!sourceText) {
    return { ok: false, error: 'episode_marketing_source_empty' };
  }

  const finalTitle = safeText(title, 160) || 'New podcast episode';
  const social = await generateReadyPostDrafts({
    markdown: sourceText,
    title: finalTitle,
    channels: DEFAULT_CHANNELS,
  });
  if (!social.ok) {
    return { ok: false, error: social.error || 'draft_generation_failed' };
  }

  const scheduleSuggestion = await buildScheduleSuggestionForChannels(DEFAULT_CHANNELS);
  const now = new Date().toISOString();

  const payload = {
    created_by_email: String(email || '').trim().toLowerCase(),
    thread_id: thread_id || null,
    title: finalTitle,
    summary: safeText(summary, 300) || null,
    original_input: sourceText,
    original_input_frozen: true,
    channel_drafts: social,
    pull_quote_companions: [],
    schedule_suggestion: scheduleSuggestion,
    attachment_refs: podcast_url ? [{ type: 'episode_url', url: podcast_url, slug: safeText(slug, 120) }] : null,
    series_name: 'Podcast',
    tags: ['podcast', 'episode_marketing', ...(slug ? [slug] : [])].slice(0, 12),
    bundle_dna: {
      kind: 'episode_marketing',
      draft_id: draft_id || null,
      slug: safeText(slug, 120) || null,
      podcast_url: safeText(podcast_url, 500) || null,
      status: 'draft',
      approval_required: true,
    },
    created_at: now,
    updated_at: now,
  };

  const inserted = await supabaseAdmin.from('ao_auto_bundles').insert(payload).select('*').single();
  if (inserted.error) {
    return { ok: false, error: inserted.error.message || 'bundle_save_failed' };
  }

  return {
    ok: true,
    bundle: inserted.data,
    channel_drafts: social,
    channels: DEFAULT_CHANNELS,
  };
}
