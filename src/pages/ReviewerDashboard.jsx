import React, { useCallback, useEffect, useState } from 'react';
import ReviewerNav from '../components/ao/ReviewerNav';

export default function ReviewerDashboard() {
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [uploadedPost, setUploadedPost] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
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

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/ao/reviewer/upload-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/ao/reviewer-login';
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not save content.');
      setUploadedPost(json.post);
      setPublishResult(null);
    } catch (err) {
      setError(err.message || 'Could not save content.');
    } finally {
      setPosting(false);
    }
  };

  const handlePublish = async () => {
    if (!uploadedPost) return;
    setPublishing(true);
    setError('');
    try {
      const res = await fetch('/api/ao/reviewer/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: uploadedPost.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/ao/reviewer-login';
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not publish.');
      setPublishResult(json);
      loadAnalytics();
    } catch (err) {
      setError(err.message || 'Could not publish.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ReviewerNav active="publishing" />
      <div className="mx-auto max-w-2xl space-y-8 px-4 pb-10">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Content publishing</h1>
          <p className="text-sm text-gray-500 mt-1">Upload content, schedule it, and publish to the company LinkedIn page.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">1. Upload content</h2>
          <form onSubmit={handleUpload} className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Paste the text you want to publish…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
            <button
              type="submit"
              disabled={posting || !content.trim()}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {posting ? 'Saving…' : 'Save content'}
            </button>
          </form>
        </div>

        {uploadedPost && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">2. Publish to LinkedIn</h2>
            <p className="text-sm text-gray-600">Content saved and scheduled. Publish it now to the organization page.</p>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || Boolean(publishResult)}
              className="px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {publishing ? 'Publishing…' : publishResult ? 'Published' : 'Publish now'}
            </button>
            {publishResult && (
              <p className="text-sm text-green-700">
                Published successfully.
                {publishResult.post_url && (
                  <> <a href={publishResult.post_url} target="_blank" rel="noopener noreferrer" className="underline">View on LinkedIn</a></>
                )}
              </p>
            )}
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
                  <p className="text-sm text-gray-800 line-clamp-2">{post.caption}</p>
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
