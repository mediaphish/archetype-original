import React, { useCallback, useEffect, useState } from 'react';
import ReviewerNav from '../components/ao/ReviewerNav';

const PLATFORMS = [
  { id: 'linkedin_personal', label: 'LinkedIn Personal', disabled: false },
  { id: 'linkedin_business', label: 'LinkedIn Business', disabled: true },
  { id: 'facebook', label: 'Facebook', disabled: false },
  { id: 'instagram', label: 'Instagram', disabled: false },
  { id: 'twitter', label: 'X', disabled: false },
];

function platformLabel(id) {
  // Posts from the backend are stored with platform: 'linkedin' for personal
  // LinkedIn posts (matching the real schema). Display it as LinkedIn Personal
  // since that's the only LinkedIn option that can actually be selected.
  if (id === 'linkedin') return 'LinkedIn Personal';
  return PLATFORMS.find((p) => p.id === id)?.label || id;
}

export default function ReviewerDashboard() {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['linkedin_personal']);
  const [posting, setPosting] = useState(false);
  const [uploadedPosts, setUploadedPosts] = useState([]);
  const [publishingId, setPublishingId] = useState(null);
  const [publishResults, setPublishResults] = useState({});
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch('/api/ao/reviewer/analytics');
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/ao/reviewer-login';
        return;
      }
      if (res.ok && json.ok) setAnalytics(json.posts || []);
    } catch (_) {
      // non-fatal
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const togglePlatform = (id) => {
    const platform = PLATFORMS.find((p) => p.id === id);
    if (platform?.disabled) return;
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    if (!content.trim() || selectedPlatforms.length === 0) return;

    if (selectedPlatforms.includes('instagram') && !imageUrl.trim()) {
      setError('Instagram requires an image URL.');
      return;
    }

    setPosting(true);
    try {
      const res = await fetch('/api/ao/reviewer/upload-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          image_url: imageUrl.trim() || null,
          platforms: selectedPlatforms,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/ao/reviewer-login';
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not save content.');
      setUploadedPosts(json.posts || []);
      setPublishResults({});
    } catch (err) {
      setError(err.message || 'Could not save content.');
    } finally {
      setPosting(false);
    }
  };

  const handlePublish = async (postId) => {
    setPublishingId(postId);
    setError('');
    try {
      const res = await fetch('/api/ao/reviewer/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/ao/reviewer-login';
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not publish.');
      setPublishResults((prev) => ({ ...prev, [postId]: json }));
      loadAnalytics();
    } catch (err) {
      setPublishResults((prev) => ({ ...prev, [postId]: { ok: false, error: err.message } }));
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ReviewerNav active="publishing" />
      <div className="mx-auto max-w-2xl space-y-8 px-4 pb-10">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Content publishing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload content, choose platforms, and publish. This tool distributes to LinkedIn Personal, LinkedIn
            Business, Facebook, Instagram, and X. LinkedIn Business publishing is pending LinkedIn's approval of
            this application.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">1. Upload content</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Paste the text you want to publish…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Image URL (required for Instagram, optional for others)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Publish to</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    disabled={p.disabled}
                    title={p.disabled ? 'Pending LinkedIn approval' : undefined}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      p.disabled
                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                        : selectedPlatforms.includes(p.id)
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {p.label}
                    {p.disabled ? ' (pending)' : ''}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={posting || !content.trim() || selectedPlatforms.length === 0}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {posting ? 'Saving…' : 'Save content'}
            </button>
          </form>
        </div>

        {uploadedPosts.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">2. Publish</h2>
            <div className="space-y-3">
              {uploadedPosts.map((post) => {
                const result = publishResults[post.id];
                return (
                  <div key={post.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
                    <span className="text-sm font-medium text-gray-800">{platformLabel(post.platform)}</span>
                    {result?.ok ? (
                      <span className="text-sm text-green-700">Published</span>
                    ) : result && !result.ok ? (
                      <span className="text-sm text-red-700">{result.error}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePublish(post.id)}
                        disabled={publishingId === post.id}
                        className="px-3 py-1.5 bg-blue-700 text-white text-xs font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50"
                      >
                        {publishingId === post.id ? 'Publishing…' : 'Publish now'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">3. Post performance</h2>
          {loadingAnalytics ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : analytics.length === 0 ? (
            <p className="text-sm text-gray-500">No published posts yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {analytics.map((post) => (
                <div key={post.id} className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">{platformLabel(post.platform)}</span>
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2 mt-1">{post.caption}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>{post.engagement_likes ?? 0} likes</span>
                    <span>{post.engagement_comments ?? 0} comments</span>
                    <span>{post.engagement_shares ?? 0} shares</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
