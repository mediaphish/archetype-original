import React, { useState } from 'react';

function linesToArray(text) {
  return String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function arrayToLines(arr) {
  return (Array.isArray(arr) ? arr : []).join('\n');
}

export default function EpisodeDraftReview({ draft, onDraftUpdated, onPublished }) {
  const [title, setTitle] = useState(draft?.title || '');
  const [summary, setSummary] = useState(draft?.summary || '');
  const [showNotesText, setShowNotesText] = useState(arrayToLines(draft?.show_notes));
  const [takeawaysText, setTakeawaysText] = useState(arrayToLines(draft?.key_takeaways));
  const [categoriesText, setCategoriesText] = useState(arrayToLines(draft?.categories));
  const [tagsText, setTagsText] = useState(arrayToLines(draft?.tags));
  const [slug, setSlug] = useState(draft?.slug || '');
  const [youtubeId, setYoutubeId] = useState(draft?.youtube_id || '');
  const [videoSourceUrl, setVideoSourceUrl] = useState(draft?.video_source_url || '');
  const [spotifyUrl, setSpotifyUrl] = useState(draft?.spotify_embed_url || '');
  const [duration, setDuration] = useState(draft?.duration || '');
  const [approvalToken, setApprovalToken] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [videoUploadStatus, setVideoUploadStatus] = useState('idle');

  if (!draft?.draft_id) return null;

  const saveDraft = async () => {
    setStatus('saving');
    setMessage('');
    try {
      const res = await fetch(`/api/ao/auto/episode-drafts/${draft.draft_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          show_notes: linesToArray(showNotesText),
          key_takeaways: linesToArray(takeawaysText),
          categories: linesToArray(categoriesText),
          tags: linesToArray(tagsText),
          slug: slug.trim() || undefined,
          youtube_id: youtubeId.trim(),
          video_source_url: videoSourceUrl.trim(),
          spotify_embed_url: spotifyUrl.trim(),
          duration: duration.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not save draft');
      onDraftUpdated?.(json.draft);
      setStatus('saved');
      setMessage('Draft saved.');
      return true;
    } catch (e) {
      setStatus('error');
      setMessage(e.message || 'Save failed');
      return false;
    }
  };

  const mintApproval = async () => {
    const slugValue = slug.trim();
    if (!slugValue) {
      setStatus('error');
      setMessage('Enter a slug before approving.');
      return;
    }
    setStatus('approving');
    setMessage('');
    const saved = await saveDraft();
    if (!saved) return;
    try {
      const res = await fetch('/api/ao/journal/publish-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slugValue, kind: 'episode' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not mint approval token');
      setApprovalToken(json.publish_approval_token || '');
      setStatus('approved');
      setMessage('Approval token ready. Click Publish episode.');
    } catch (e) {
      setStatus('error');
      setMessage(e.message || 'Approval failed');
    }
  };

  const uploadEpisodeVideo = async (file) => {
    if (!file) return;
    setVideoUploadStatus('uploading');
    setMessage('');
    try {
      const mint = await fetch('/api/ao/auto/episode-video-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: file.name, mime_type: file.type || 'video/mp4' }),
      });
      const mintJson = await mint.json().catch(() => ({}));
      if (!mint.ok || !mintJson.ok) throw new Error(mintJson.error || 'Could not start video upload');

      const put = await fetch(mintJson.upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'video/mp4',
          'x-upsert': 'true',
        },
        body: file,
      });
      if (!put.ok) throw new Error(`Video upload failed (${put.status}).`);

      setVideoSourceUrl(mintJson.public_url || '');
      setVideoUploadStatus('done');
      setMessage('Video uploaded. Public URL saved for YouTube upload on publish.');
    } catch (e) {
      setVideoUploadStatus('error');
      setMessage(e.message || 'Video upload failed');
    }
  };

  const publishEpisode = async () => {
    const slugValue = slug.trim();
    if (!slugValue || !approvalToken) {
      setStatus('error');
      setMessage('Slug and approval token are required.');
      return;
    }
    setStatus('publishing');
    setMessage('');
    try {
      const res = await fetch('/api/ao/auto/episode-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: draft.draft_id,
          slug: slugValue,
          youtube_id: youtubeId.trim(),
          video_source_url: videoSourceUrl.trim(),
          spotify_embed_url: spotifyUrl.trim(),
          duration: duration.trim(),
          publish_approval_token: approvalToken,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Publish failed');
      setLiveUrl(json.podcast_url || '');
      if (json.youtube_id) setYoutubeId(json.youtube_id);
      setStatus('published');
      if (json.youtube_upload && json.youtube_upload.ok === false) {
        setMessage(json.message || `Episode published, but YouTube upload failed: ${json.youtube_upload.error}`);
      } else {
        setMessage(json.message || 'Episode published.');
      }
      onPublished?.(json);
    } catch (e) {
      setStatus('error');
      setMessage(e.message || 'Publish failed');
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4 overflow-y-auto">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Podcast episode draft</p>

      <label className="block text-xs font-medium text-gray-600">
        Title
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-xs font-medium text-gray-600">
        Summary (callout)
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-xs font-medium text-gray-600">
        Show notes (one per line)
        <textarea
          value={showNotesText}
          onChange={(e) => setShowNotesText(e.target.value)}
          rows={4}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
        />
      </label>

      <label className="block text-xs font-medium text-gray-600">
        Key takeaways (one per line)
        <textarea
          value={takeawaysText}
          onChange={(e) => setTakeawaysText(e.target.value)}
          rows={3}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
        />
      </label>

      <label className="block text-xs font-medium text-gray-600">
        Categories (one per line)
        <textarea
          value={categoriesText}
          onChange={(e) => setCategoriesText(e.target.value)}
          rows={2}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
        />
      </label>

      <label className="block text-xs font-medium text-gray-600">
        Tags (one per line)
        <textarea
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          rows={2}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
        />
      </label>

      <div className="border-t border-gray-200 pt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Publish details</p>
        <label className="block text-xs font-medium text-gray-600">
          Slug
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="episode-slug"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Video source URL (for automatic YouTube upload)
          <input
            type="url"
            value={videoSourceUrl}
            onChange={(e) => setVideoSourceUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wide border border-gray-300 rounded-md hover:bg-gray-100 cursor-pointer">
            Upload video file
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              className="hidden"
              disabled={videoUploadStatus === 'uploading'}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadEpisodeVideo(file);
                e.target.value = '';
              }}
            />
          </label>
          {videoUploadStatus === 'uploading' && (
            <span className="text-xs text-gray-500">Uploading video...</span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 leading-snug">
          Leave YouTube video ID blank to upload from the video source URL on publish. If upload fails,
          the episode still publishes without a video embed.
        </p>
        <label className="block text-xs font-medium text-gray-600">
          YouTube video ID (optional if video source URL is set)
          <input
            type="text"
            value={youtubeId}
            onChange={(e) => setYoutubeId(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Spotify embed URL
          <input
            type="text"
            value={spotifyUrl}
            onChange={(e) => setSpotifyUrl(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Duration
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="42 min"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
      </div>

      {message && (
        <p
          className={`text-sm ${status === 'error' ? 'text-red-600' : status === 'published' ? 'text-green-700' : 'text-gray-600'}`}
        >
          {message}
        </p>
      )}

      {liveUrl && (
        <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline break-all">
          {liveUrl}
        </a>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          onClick={saveDraft}
          disabled={status === 'saving' || status === 'publishing'}
          className="px-3 py-2 text-xs font-semibold uppercase tracking-wide border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
        >
          Save edits
        </button>
        <button
          type="button"
          onClick={mintApproval}
          disabled={status === 'publishing'}
          className="px-3 py-2 text-xs font-semibold uppercase tracking-wide bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={publishEpisode}
          disabled={!approvalToken || status === 'publishing'}
          className="px-3 py-2 text-xs font-semibold uppercase tracking-wide bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          Publish episode
        </button>
      </div>
    </div>
  );
}
