import { google } from 'googleapis';
import { Readable } from 'stream';

const SITE_ORIGIN = 'https://www.archetypeoriginal.com';

export function buildYoutubeDescription({ summary, slug, spotifyUrl }) {
  const lines = [String(summary || '').trim(), ''];
  lines.push(`Full episode, transcript, and show notes: ${SITE_ORIGIN}/podcast/${slug}`);
  const spotify = String(spotifyUrl || process.env.PODCAST_SPOTIFY_URL || '').trim();
  if (spotify) {
    lines.push('');
    lines.push(`Listen on Spotify: ${spotify}`);
  }
  return lines.join('\n').slice(0, 5000);
}

export function normalizeYoutubeTags(tags) {
  return (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((tag) => tag.slice(0, 30));
}

export async function validateVideoSourceUrl(url) {
  const value = String(url || '').trim();
  if (!value) return { ok: false, error: 'Video source URL is required.' };

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: 'Video source URL is not valid.' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Video source URL must use HTTPS.' };
  }

  try {
    const head = await fetch(value, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });

    if (head.ok) {
      return {
        ok: true,
        url: value,
        contentType: head.headers.get('content-type') || '',
        contentLength: head.headers.get('content-length') || null,
      };
    }

    const probe = await fetch(value, {
      method: 'GET',
      headers: { Range: 'bytes=0-1' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });

    if (!probe.ok) {
      return { ok: false, error: `Video source URL is not reachable (${probe.status}).` };
    }

    return {
      ok: true,
      url: value,
      contentType: probe.headers.get('content-type') || '',
      contentLength: probe.headers.get('content-length') || null,
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not reach video source URL.' };
  }
}

function getYoutubeClient() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('YouTube credentials are not configured on the server.');
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.youtube({ version: 'v3', auth: oauth2 });
}

/**
 * Stream a public HTTPS video URL to YouTube (unlisted) via resumable upload.
 */
export async function uploadVideoToYoutube({
  videoSourceUrl,
  title,
  description,
  tags = [],
}) {
  const validated = await validateVideoSourceUrl(videoSourceUrl);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const sourceResponse = await fetch(validated.url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(600000),
  });

  if (!sourceResponse.ok || !sourceResponse.body) {
    return {
      ok: false,
      error: `Could not read video file from source URL (${sourceResponse.status}).`,
    };
  }

  const youtube = getYoutubeClient();
  const mimeType =
    sourceResponse.headers.get('content-type')?.split(';')[0]?.trim() || 'video/mp4';
  const contentLength = sourceResponse.headers.get('content-length');

  const media = {
    mimeType,
    body: Readable.fromWeb(sourceResponse.body),
  };

  if (contentLength && Number(contentLength) > 0) {
    media.contentLength = Number(contentLength);
  }

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: String(title || 'Archetype Original Podcast').slice(0, 100),
        description: String(description || '').slice(0, 5000),
        tags: normalizeYoutubeTags(tags),
      },
      status: {
        privacyStatus: 'unlisted',
      },
    },
    media,
  });

  const youtubeId = response?.data?.id;
  if (!youtubeId) {
    return { ok: false, error: 'YouTube upload completed but no video id was returned.' };
  }

  return {
    ok: true,
    youtube_id: youtubeId,
    youtube_url: `https://www.youtube.com/watch?v=${youtubeId}`,
  };
}
