import React, { useEffect, useState } from 'react';
import ReviewerNav from '../components/ao/ReviewerNav';

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const colors = {
    posted: 'bg-green-100 text-green-800',
    scheduled: 'bg-amber-100 text-amber-900',
    failed: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors[s] || 'bg-gray-100 text-gray-700'}`}>
      {s || 'unknown'}
    </span>
  );
}

export default function ReviewerLibrary() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [posts, setPosts] = useState([]);
  const [corpusSample, setCorpusSample] = useState([]);
  const [corpusNote, setCorpusNote] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/ao/reviewer/library');
        const json = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/ao/reviewer-login';
          return;
        }
        if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load library');
        setPosts(json.posts || []);
        setCorpusSample(json.corpus_sample || []);
        setCorpusNote(json.corpus_note || '');
      } catch (e) {
        setError(e.message || 'Could not load library');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <ReviewerNav active="library" />
      <div className="mx-auto max-w-3xl space-y-8 px-4 pb-10">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Library</h1>
          <p className="text-sm text-gray-500 mt-1">LinkedIn content and scheduling history.</p>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">LinkedIn posts</h2>
                <p className="text-xs text-gray-500 mt-0.5">Recent scheduled and published posts.</p>
              </div>
              {posts.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-500">No LinkedIn posts yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {posts.map((post) => (
                    <div key={post.id} className="px-5 py-4">
                      <p className="text-sm text-gray-800 line-clamp-2">{post.caption}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={post.status} />
                        <span className="text-xs text-gray-500">{fmtDate(post.scheduled_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">Content library</h2>
                {corpusNote && <p className="text-xs text-gray-500 mt-0.5">{corpusNote}</p>}
              </div>
              {corpusSample.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-500">No sample available.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {corpusSample.map((doc) => (
                    <div key={doc.slug} className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                      {doc.summary && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{doc.summary}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
