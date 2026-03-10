import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

export default function Publishing() {
  const [email, setEmail] = useState('');
  const [scheduled, setScheduled] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishLoading, setPublishLoading] = useState(false);
  const [filter, setFilter] = useState('scheduled'); // scheduled | history

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('email') || localStorage.getItem('ao_email') || '';
    setEmail(e);
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [schedRes, histRes] = await Promise.all([
        fetch(`/api/ao/scheduled-posts?email=${encodeURIComponent(email)}&status=scheduled&limit=50`),
        fetch(`/api/ao/scheduled-posts?email=${encodeURIComponent(email)}&limit=50`),
      ]);
      const schedJson = await schedRes.json().catch(() => ({}));
      const histJson = await histRes.json().catch(() => ({}));
      if (schedJson.ok && schedJson.posts) setScheduled(schedJson.posts);
      if (histJson.ok && histJson.posts) {
        const postedOrFailed = (histJson.posts || []).filter((p) => p.status === 'posted' || p.status === 'failed');
        setHistory(postedOrFailed);
      }
    } catch (_) {}
    setLoading(false);
  }, [email]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePublishNow = async () => {
    setPublishLoading(true);
    try {
      const secret = process.env.SOCIAL_POST_SECRET; // not available in browser; API may require header
      const res = await fetch('/api/social/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        await fetchPosts();
      }
    } catch (_) {}
    setPublishLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="publishing" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Publishing</h1>
            <p className="text-gray-600">Scheduled posts, history, and platform status.</p>
          </div>
          <button
            type="button"
            onClick={handlePublishNow}
            disabled={publishLoading}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {publishLoading ? 'Publishing…' : 'Publish due posts now'}
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setFilter('scheduled')}
            className={`px-4 py-2 rounded-lg font-medium ${filter === 'scheduled' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            Scheduled
          </button>
          <button
            type="button"
            onClick={() => setFilter('history')}
            className={`px-4 py-2 rounded-lg font-medium ${filter === 'history' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            History
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filter === 'scheduled' ? (
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <h2 className="sr-only">Scheduled posts</h2>
            {scheduled.length === 0 ? (
              <p className="p-6 text-gray-500">No scheduled posts.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {scheduled.map((p) => (
                  <li key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900">{p.platform} / {p.account_id}</span>
                      <span className="text-gray-500 text-sm ml-2">{new Date(p.scheduled_at).toLocaleString()}</span>
                      <p className="text-sm text-gray-600 mt-1 truncate max-w-xl">{p.text}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{p.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <h2 className="sr-only">Publishing history</h2>
            {history.length === 0 ? (
              <p className="p-6 text-gray-500">No history yet.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {history.map((p) => (
                  <li key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900">{p.platform} / {p.account_id}</span>
                      <span className="text-gray-500 text-sm ml-2">{new Date(p.updated_at || p.scheduled_at).toLocaleString()}</span>
                      <p className="text-sm text-gray-600 mt-1 truncate max-w-xl">{p.text}</p>
                      {p.status === 'failed' && p.error_message && (
                        <p className="text-sm text-red-600 mt-1">{p.error_message}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${p.status === 'posted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform status</h2>
          <p className="text-gray-500 text-sm">Configured platforms are set via environment variables. See notes/SOCIAL_VERCEL_ENV.md.</p>
        </section>

        <section className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Media / assets</h2>
          <p className="text-gray-500 text-sm">Quote card images and uploads will appear here when the feature is connected.</p>
        </section>
      </main>
    </div>
  );
}
