/**
 * processEpisodeSignal.js
 *
 * Parses [EPISODE_PROCESS] signals from Auto's reply, writes the corpus
 * markdown file to disk, and upserts the episode draft record.
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { supabaseAdmin } from '../supabase-admin.js';
import { buildEpisodeFrontmatter, episodeTargetPath } from './buildEpisodeFrontmatter.js';
import { addWeekdays, dateFromYmd } from './unifiedScheduler.js';
import {
  insertEpisodeDraft,
  updateEpisodeDraftForUser,
} from './episodeDraftStore.js';

const EPISODE_SOCIAL_CHANNELS = [
  { platform: 'linkedin', account_id: 'personal', label: 'linkedin_personal', utcTime: '20:00:00' },
  { platform: 'instagram', account_id: 'meta', label: 'instagram_business', utcTime: '14:00:00' },
  { platform: 'facebook', account_id: 'meta', label: 'facebook_business', utcTime: '14:00:00' },
  { platform: 'twitter', account_id: 'personal', label: 'x', utcTime: '18:00:00' },
];

function episodeScheduledAt(baseDate, utcTime) {
  const ymd = new Date(baseDate).toISOString().split('T')[0];
  return new Date(`${ymd}T${utcTime}+00:00`).toISOString();
}

function buildEpisodeCaptionText({ showNotes, summary, episodeUrl, platform }) {
  const base = String(summary || showNotes || '').trim().slice(0, 2000);
  if (platform === 'instagram') {
    const noUrls = base.replace(/https?:\/\/[^\s]+/g, '').trim();
    return noUrls.includes('Link in bio') ? noUrls : `${noUrls}\n\nLink in bio.`;
  }
  return episodeUrl ? `${base}\n\n${episodeUrl}`.trim() : base;
}

async function scheduleEpisodeSocialPosts({
  slug,
  title,
  showNotes,
  summary,
  recordedDate,
  imageUrl,
  email,
}) {
  const baseDateInput = dateFromYmd(recordedDate) || new Date();
  const scheduleDate = addWeekdays(baseDateInput, 3);
  const episodeUrl = `https://www.archetypeoriginal.com/podcast/${slug}`;

  const rows = EPISODE_SOCIAL_CHANNELS.map((ch) => {
    const text = buildEpisodeCaptionText({
      showNotes,
      summary,
      episodeUrl,
      platform: ch.platform,
    });
    return {
      platform: ch.platform,
      account_id: ch.account_id,
      scheduled_at: episodeScheduledAt(scheduleDate, ch.utcTime),
      text,
      caption: text,
      image_url: imageUrl || null,
      status: 'scheduled',
      source_kind: 'episode_launch',
      intent: {
        auto_hub: true,
        channel_label: ch.label,
        episode_slug: slug,
        episode_url: episodeUrl,
        episode_title: title,
        created_by_email: email,
      },
    };
  });

  const { data, error } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .insert(rows)
    .select('id, platform, scheduled_at');

  if (error) throw new Error(error.message);
  return { posts_count: (data || []).length };
}

function parseTagAttributes(attrString) {
  const attrs = {};
  const pattern = /(\w+)="([^"]*)"/g;
  let match;
  while ((match = pattern.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function extractBlock(reply, tagName) {
  const re = new RegExp(`\\[${tagName}\\]([\\s\\S]*?)\\[\\/${tagName}\\]`, 'i');
  const match = reply.match(re);
  return match ? match[1].trim() : '';
}

function spotifyEpisodeIdFromUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  const idMatch = value.match(/episode\/([a-zA-Z0-9]+)/);
  return idMatch ? idMatch[1] : value;
}

function showNotesToArray(prose) {
  const lines = String(prose || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const bullets = lines
    .filter((line) => /^[-*]\s/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, ''));
  if (bullets.length) return bullets;
  return lines.filter((line) => line.length > 20).slice(0, 12);
}

function summaryFromShowNotes(showNotes) {
  const text = String(showNotes || '').trim();
  if (!text) return '';
  const firstParagraph = text.split(/\n\n+/)[0] || text;
  return firstParagraph.slice(0, 500).trim();
}

function injectSeasonEpisode(frontmatter, seasonNumber, episodeNumber) {
  if (!seasonNumber && !episodeNumber) return frontmatter;
  let extra = '';
  if (seasonNumber) {
    const season = parseInt(seasonNumber, 10);
    if (Number.isFinite(season)) extra += `season: ${season}\n`;
  }
  if (episodeNumber) {
    const episode = parseInt(episodeNumber, 10);
    if (Number.isFinite(episode)) extra += `episode: ${episode}\n`;
  }
  if (!extra) return frontmatter;
  return frontmatter.replace(/^episode_type: (.+)$/m, `episode_type: $1\n${extra.trim()}`);
}

async function upsertEpisodeDraft(email, payload) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const slug = String(payload.slug || '').trim();

  if (!normalizedEmail || !slug) {
    return { ok: false, error: 'email and slug are required for episode draft upsert' };
  }

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('ao_episode_drafts')
    .select('id')
    .eq('created_by_email', normalizedEmail)
    .eq('slug', slug)
    .maybeSingle();

  if (lookupError) {
    if (String(lookupError.message || '').includes('does not exist')) {
      return { ok: false, error: 'episode_drafts_table_missing' };
    }
    return { ok: false, error: lookupError.message };
  }

  if (existing?.id) {
    return updateEpisodeDraftForUser(existing.id, email, payload);
  }

  const inserted = await insertEpisodeDraft(email, {
    episode_type: payload.episode_type,
    recorded_date: payload.recorded_date,
    transcript: payload.transcript,
    title: payload.title,
    summary: payload.summary,
    body_md: payload.body_md,
    show_notes: payload.show_notes,
    guest: payload.guest,
    guest_id: payload.guest_id,
    meta: payload.meta || { source: 'processEpisodeSignal' },
  });

  if (!inserted.ok) return inserted;

  return updateEpisodeDraftForUser(inserted.draft.draft_id, email, payload);
}

/**
 * @param {string} reply — full Auto reply containing [EPISODE_PROCESS] signal
 * @param {string} email — authenticated user email
 * @returns {Promise<{ ok: boolean, slug?: string, filePath?: string, error?: string }>}
 */
export async function processEpisodeSignal(reply, email) {
  try {
    if (!reply || !String(reply).includes('[EPISODE_PROCESS')) {
      return { ok: false, error: 'no_episode_process_signal' };
    }

    const signalMatch = reply.match(/\[EPISODE_PROCESS([^\]]*)\]/i);
    if (!signalMatch) {
      return { ok: false, error: 'could_not_parse_episode_process_signal' };
    }

    const attrs = parseTagAttributes(signalMatch[1]);
    const transcript = extractBlock(reply, 'EPISODE_TRANSCRIPT');
    const showNotes = extractBlock(reply, 'EPISODE_SHOW_NOTES');

    const slugInput = String(attrs.slug || '').trim();
    if (!slugInput) {
      return { ok: false, error: 'slug is required in [EPISODE_PROCESS]' };
    }
    if (!transcript) {
      return { ok: false, error: 'EPISODE_TRANSCRIPT block is required' };
    }
    if (!showNotes) {
      return { ok: false, error: 'EPISODE_SHOW_NOTES block is required' };
    }

    const { safeSlug, path: relativePath } = episodeTargetPath(slugInput);
    if (!safeSlug) {
      return { ok: false, error: 'invalid slug' };
    }

    const episodeType = attrs.episode_type === 'guest' ? 'guest' : 'solo';
    const guestName = String(attrs.guest_name || '').trim();
    const guest =
      episodeType === 'guest' && guestName
        ? { name: guestName }
        : null;

    const spotifyUrl = String(attrs.spotify_url || '').trim();
    const appleUrl = String(attrs.apple_url || '').trim();
    const showNotesArray = showNotesToArray(showNotes);
    const summary = summaryFromShowNotes(showNotes);
    const publishDate = attrs.recorded_date
      ? String(attrs.recorded_date).split('T')[0]
      : new Date().toISOString().split('T')[0];

    let frontmatter = buildEpisodeFrontmatter({
      title: attrs.title || guestName || safeSlug,
      slug: safeSlug,
      publish_date: publishDate,
      summary,
      episode_type: episodeType,
      duration: attrs.duration || '',
      youtube_id: attrs.youtube_id || '',
      spotify_embed_url: spotifyUrl,
      spotify_episode_id: spotifyEpisodeIdFromUrl(spotifyUrl),
      apple_podcasts_url: appleUrl,
      show_notes: showNotesArray,
      guest,
      transcript,
      status: 'published',
    });

    frontmatter = injectSeasonEpisode(
      frontmatter,
      attrs.season_number,
      attrs.episode_number
    );

    const fileContent = `${frontmatter}\n\n${showNotes.trim()}\n`;
    const absolutePath = join(process.cwd(), relativePath);

    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, fileContent, 'utf8');

    const draftResult = await upsertEpisodeDraft(email, {
      episode_type: episodeType,
      recorded_date: publishDate,
      transcript,
      title: attrs.title || guestName || safeSlug,
      summary,
      body_md: showNotes,
      show_notes: showNotesArray,
      guest,
      slug: safeSlug,
      youtube_id: attrs.youtube_id || '',
      spotify_embed_url: spotifyUrl,
      duration: attrs.duration || '',
      status: 'approved',
      target_path: relativePath,
      meta: {
        source: 'processEpisodeSignal',
        featured_image_url: attrs.featured_image_url || '',
        season_number: attrs.season_number || '',
        episode_number: attrs.episode_number || '',
      },
    });

    if (!draftResult.ok) {
      console.warn('[processEpisodeSignal] draft upsert failed:', draftResult.error);
    }

    const episodeTitle = attrs.title || guestName || safeSlug;
    const featuredImageUrl = String(attrs.featured_image_url || '').trim();

    try {
      const socialResult = await scheduleEpisodeSocialPosts({
        slug: safeSlug,
        title: episodeTitle,
        showNotes,
        summary,
        recordedDate: publishDate,
        imageUrl: featuredImageUrl,
        email,
      });
      return {
        ok: true,
        slug: safeSlug,
        filePath: relativePath,
        social_scheduled: true,
        posts_count: socialResult.posts_count,
      };
    } catch (socialErr) {
      console.error('[processEpisodeSignal] social scheduling failed:', socialErr?.message || socialErr);
      return {
        ok: true,
        slug: safeSlug,
        filePath: relativePath,
        social_scheduled: false,
        social_error: socialErr?.message || 'Social scheduling failed',
      };
    }
  } catch (err) {
    console.error('[processEpisodeSignal]', err?.message || err);
    return { ok: false, error: err?.message || 'processEpisodeSignal failed' };
  }
}
