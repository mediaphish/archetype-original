import React, { useEffect, useState } from 'react';

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
  const [spotifyUrl, setSpotifyUrl] = useState(draft?.spotify_embed_url || '');
  const [duration, setDuration] = useState(draft?.duration || '');
  const [approvalToken, setApprovalToken] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [guestResults, setGuestResults] = useState([]);
  const [guestId, setGuestId] = useState(draft?.guest_id || '');
  const [selectedGuestLabel, setSelectedGuestLabel] = useState(
    draft?.guest?.name ? `${draft.guest.name}${draft.guest.company ? ` — ${draft.guest.company}` : ''}` : ''
  );
  const [guestSearchStatus, setGuestSearchStatus] = useState('idle');

  useEffect(() => {
    const q = guestSearch.trim();
    if (q.length < 2) {
      setGuestResults([]);
      setGuestSearchStatus('idle');
      return undefined;
    }

    setGuestSearchStatus('searching');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ao/auto/guest-search?q=${encodeURIComponent(q)}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || 'Search failed');
        setGuestResults(json.guests || []);
        setGuestSearchStatus('idle');
      } catch {
        setGuestResults([]);
        setGuestSearchStatus('error');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [guestSearch]);

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
          spotify_embed_url: spotifyUrl.trim(),
          duration: duration.trim(),
          guest_id: guestId || null,
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
      setMessage(json.message || 'Episode published.');
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

      <div className="border border-gray-200 rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Guest from intake</p>
        <p className="text-[11px] text-gray-500 leading-snug">
          Search by name or email to attach a submitted guest intake record to this episode.
        </p>
        <input
          type="text"
          value={guestSearch}
          onChange={(e) => setGuestSearch(e.target.value)}
          placeholder="Search guest name or email"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        {guestSearchStatus === 'searching' && (
          <p className="text-xs text-gray-500">Searching...</p>
        )}
        {guestResults.length > 0 && (
          <ul className="max-h-40 overflow-y-auto border border-gray-100 rounded-md divide-y divide-gray-100">
            {guestResults.map((guest) => (
              <li key={guest.id}>
                <button
                  type="button"
                  onClick={() => {
                    setGuestId(guest.id);
                    setSelectedGuestLabel(
                      `${guest.name}${guest.company ? ` — ${guest.company}` : ''} (${guest.email})`
                    );
                    setGuestSearch('');
                    setGuestResults([]);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{guest.name}</span>
                  {guest.company && <span className="text-gray-500"> — {guest.company}</span>}
                  <span className="block text-xs text-gray-500">{guest.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedGuestLabel && (
          <div className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-800">{selectedGuestLabel}</span>
            <button
              type="button"
              onClick={() => {
                setGuestId('');
                setSelectedGuestLabel('');
              }}
              className="text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-red-600"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Publish details</p>
        <p className="text-[11px] text-gray-500 leading-snug">
          Riverside handles YouTube, Spotify, and Apple distribution. Paste platform IDs and links here after
          Riverside publishes. Auto publishes the episode page on the site only.
        </p>
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
          YouTube video ID (from Riverside / YouTube URL)
          <input
            type="text"
            value={youtubeId}
            onChange={(e) => setYoutubeId(e.target.value)}
            placeholder="dQw4w9WgXcQ"
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
