/**
 * POST /api/ao/auto/episode-publish
 *
 * Body: {
 *   draft_id: string,
 *   slug: string,
 *   youtube_id: string,
 *   video_source_url: string,
 *   spotify_embed_url: string,
 *   duration: string,
 *   publish_approval_token: string
 * }
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getEpisodeDraftForUser, updateEpisodeDraftForUser } from '../../../lib/ao/episodeDraftStore.js';
import { validateJournalPublishApproval, consumeJournalPublishApprovalRow } from '../../../lib/ao/consumeJournalPublishApproval.js';
import { auditPublicationEvent } from '../../../lib/ao/auditPublicationEvent.js';
import { buildEpisodeFrontmatter, episodeTargetPath } from '../../../lib/ao/buildEpisodeFrontmatter.js';
import { commitGithubFile, getGithubFileSha } from '../../../lib/ao/githubAutoPublish.js';
import {
  buildYoutubeDescription,
  uploadVideoToYoutube,
} from '../../../lib/ao/youtubeUpload.js';

function vercelRequestId(req) {
  return req.headers['x-vercel-id'] || req.headers['x-request-id'] || null;
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_PUBLISH_TOKEN;
  if (!token) {
    return res.status(500).json({
      ok: false,
      error: 'GITHUB_PUBLISH_TOKEN is not set in environment variables.',
    });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const draftId = String(body.draft_id || '').trim();
  const slugInput = String(body.slug || '').trim();
  const youtube_id_input = String(body.youtube_id || '').trim();
  const video_source_url_input = String(body.video_source_url || '').trim();
  const spotify_embed_url = String(body.spotify_embed_url || '').trim();
  const duration = String(body.duration || '').trim();
  const approvalToken = String(body.publish_approval_token || '').trim();

  if (!draftId || !slugInput || !approvalToken) {
    return res.status(400).json({
      ok: false,
      error: 'draft_id, slug, and publish_approval_token are required.',
    });
  }

  const { safeSlug, path: filePath, liveUrl } = episodeTargetPath(slugInput);
  if (!safeSlug) {
    return res.status(400).json({ ok: false, error: 'Invalid slug.' });
  }

  const approval = await validateJournalPublishApproval({
    token: approvalToken,
    email: auth.email,
    targetPath: filePath,
  });

  if (!approval.ok) {
    await auditPublicationEvent({
      source: 'api:ao/auto/episode-publish',
      action: 'episode_publish_approval_rejected',
      outcome: 'failure',
      actor_email: auth.email,
      resource_paths: [filePath],
      detail: { draft_id: draftId, slug: safeSlug, reason: approval.error },
      vercel_id: vercelRequestId(req),
    });
    return res.status(403).json({ ok: false, error: approval.error || 'Invalid approval token' });
  }

  const loaded = await getEpisodeDraftForUser(draftId, auth.email);
  if (!loaded.ok) {
    return res.status(404).json({ ok: false, error: loaded.error || 'Draft not found' });
  }

  const draft = loaded.draft;
  const publishDate = draft.recorded_date || new Date().toISOString().split('T')[0];
  const video_source_url = video_source_url_input || String(draft.video_source_url || '').trim();

  let youtube_id = youtube_id_input || String(draft.youtube_id || '').trim();
  let youtube_upload = null;

  if (video_source_url && !youtube_id) {
    try {
      const description = buildYoutubeDescription({
        summary: draft.summary,
        slug: safeSlug,
        spotifyUrl: spotify_embed_url,
      });
      const upload = await uploadVideoToYoutube({
        videoSourceUrl: video_source_url,
        title: draft.title,
        description,
        tags: draft.tags || [],
      });
      if (upload.ok) {
        youtube_id = upload.youtube_id;
        youtube_upload = {
          ok: true,
          youtube_id: upload.youtube_id,
          youtube_url: upload.youtube_url,
        };
      } else {
        youtube_upload = { ok: false, error: upload.error || 'YouTube upload failed.' };
      }
    } catch (err) {
      youtube_upload = { ok: false, error: err?.message || 'YouTube upload failed.' };
    }
  }

  const frontmatter = buildEpisodeFrontmatter({
    title: draft.title,
    slug: safeSlug,
    publish_date: publishDate,
    summary: draft.summary,
    episode_type: draft.episode_type || 'solo',
    duration,
    youtube_id,
    spotify_embed_url,
    categories: draft.categories || [],
    tags: draft.tags || [],
    show_notes: draft.show_notes || [],
    key_takeaways: draft.key_takeaways || [],
    related: draft.related || [],
    guest: draft.guest,
    transcript: draft.transcript || '',
    status: 'published',
  });

  const fullContent = `${frontmatter}\n\n${String(draft.body_md || '').trim()}\n`;

  try {
    const existingSha = await getGithubFileSha(token, filePath);
    const commitMessage = existingSha
      ? `Update podcast episode: ${draft.title}`
      : `Publish podcast episode: ${draft.title}`;

    const result = await commitGithubFile(token, filePath, fullContent, commitMessage, existingSha);

    const consumed = await consumeJournalPublishApprovalRow(approval.rowId);
    if (!consumed.ok) {
      console.warn('[episode-publish] token consume failed after commit:', consumed.error);
    }

    await updateEpisodeDraftForUser(draftId, auth.email, {
      status: 'published',
      slug: safeSlug,
      youtube_id,
      spotify_embed_url,
      duration,
      video_source_url: video_source_url || null,
      target_path: filePath,
      meta: {
        ...(draft.meta || {}),
        published_via: 'api:ao/auto/episode-publish',
        github_ok: true,
        commit_sha: result.commitSha,
        youtube_upload,
      },
    });

    await auditPublicationEvent({
      source: 'api:ao/auto/episode-publish',
      action: 'episode_publish_github_push',
      outcome: 'success',
      actor_email: auth.email,
      resource_paths: [filePath],
      detail: {
        draft_id: draftId,
        slug: safeSlug,
        title: draft.title,
        podcast_url: liveUrl,
      },
      github_commit_sha: result.commitSha,
      vercel_id: vercelRequestId(req),
    });

    const publishMessage = youtube_upload && !youtube_upload.ok
      ? `Episode published without YouTube video. Video upload failed: ${youtube_upload.error} You can add a YouTube ID manually and republish, or upload to YouTube yourself. Site URL: ${liveUrl}`
      : `Episode published. Vercel will deploy in about 60 seconds. URL: ${liveUrl}`;

    return res.status(200).json({
      ok: true,
      slug: safeSlug,
      file_path: filePath,
      commit_sha: result.commitSha,
      podcast_url: liveUrl,
      youtube_id: youtube_id || null,
      youtube_upload,
      journal_crosspost:
        'Journal feed cross-post is created automatically by build-knowledge when the site deploys. No separate file is committed.',
      message: publishMessage,
    });
  } catch (err) {
    console.error('[episode-publish]', err?.message || err);
    await auditPublicationEvent({
      source: 'api:ao/auto/episode-publish',
      action: 'episode_publish_github_push',
      outcome: 'failure',
      actor_email: auth.email,
      resource_paths: [filePath],
      detail: { draft_id: draftId, slug: safeSlug },
      error_message: err?.message,
      vercel_id: vercelRequestId(req),
    });
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
