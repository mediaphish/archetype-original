import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

function FirstCommentStatusBadge({ status, errorMessage }) {
  if (!status) return <span className="text-xs text-gray-400">First comment: —</span>;
  const label = `First comment: ${status}`;
  const colors = {
    posted: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    skipped: 'bg-gray-100 text-gray-600',
    unsupported: 'bg-amber-100 text-amber-800',
    pending: 'bg-blue-50 text-blue-700'
  };
  const cls = colors[status] || 'bg-gray-100 text-gray-700';
  return (
    <span title={errorMessage || label} className={`text-xs px-2 py-0.5 rounded ${cls}`}>
      {label}
      {status === 'failed' && errorMessage && (
        <span className="ml-1" title={errorMessage}> (hover for error)</span>
      )}
    </span>
  );
}

export default function Publishing() {
  const [email, setEmail] = useState('');
  const [scheduled, setScheduled] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishLoading, setPublishLoading] = useState(false);
  const [filter, setFilter] = useState('scheduled'); // scheduled | history
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [patchLoading, setPatchLoading] = useState(false);

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

  const handlePatchFirstComment = useCallback(async (id, first_comment) => {
    if (!email) return;
    setPatchLoading(true);
    try {
      const res = await fetch(`/api/ao/scheduled-posts/${id}?email=${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setEditingId(null);
        setEditValue('');
        await fetchPosts();
      }
    } catch (_) {}
    setPatchLoading(false);
  }, [email, fetchPosts]);

  const startEdit = (post) => {
    setEditingId(post.id);
    setEditValue(post.first_comment || '');
  };
  const saveEdit = () => {
    if (editingId == null) return;
    handlePatchFirstComment(editingId, editValue.trim() || null);
  };
  const removeFirstComment = (post) => {
    if (!post.id) return;
    handlePatchFirstComment(post.id, null);
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
                  <li key={p.id} className="p-4 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-900">{p.platform} / {p.account_id}</span>
                      <span className="text-gray-500 text-sm ml-2">{new Date(p.scheduled_at).toLocaleString()}</span>
                      <p className="text-sm text-gray-600 mt-1 truncate max-w-xl">{p.text}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <FirstCommentStatusBadge status={p.first_comment_status || (p.first_comment ? 'pending' : null)} errorMessage={p.first_comment_error_message} />
                        {p.first_comment && !editingId && (
                          <span className="text-xs text-gray-500 max-w-md truncate" title={p.first_comment}>{p.first_comment}</span>
                        )}
                      </div>
                      {editingId === p.id ? (
                        <div className="mt-2">
                          <label className="sr-only">Edit first comment</label>
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="First comment (optional)"
                            rows={2}
                            className="mt-1 block w-full max-w-xl rounded border border-gray-300 px-2 py-1 text-sm"
                          />
                          <div className="mt-1 flex gap-2">
                            <button type="button" onClick={saveEdit} disabled={patchLoading} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
                            <button type="button" onClick={() => { setEditingId(null); setEditValue(''); }} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 flex gap-2">
                          <button type="button" onClick={() => startEdit(p)} className="text-xs text-blue-600 hover:underline">Edit first comment</button>
                          {p.first_comment && (
                            <button type="button" onClick={() => removeFirstComment(p)} disabled={patchLoading} className="text-xs text-red-600 hover:underline disabled:opacity-50">Remove first comment</button>
                          )}
                        </div>
                      )}
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
                  <li key={p.id} className="p-4 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-900">{p.platform} / {p.account_id}</span>
                      <span className="text-gray-500 text-sm ml-2">{new Date(p.updated_at || p.scheduled_at).toLocaleString()}</span>
                      <p className="text-sm text-gray-600 mt-1 truncate max-w-xl">{p.text}</p>
                      <div className="mt-2">
                        <FirstCommentStatusBadge status={p.first_comment_status} errorMessage={p.first_comment_error_message} />
                        {p.first_comment_status === 'failed' && p.first_comment_error_message && (
                          <p className="text-xs text-red-600 mt-1 max-w-xl">{p.first_comment_error_message}</p>
                        )}
                      </div>
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
          <p className="text-gray-600 text-sm mt-2">
            <strong>First comment supported:</strong> Facebook Page, Instagram, LinkedIn, X. You can add, edit, or remove an optional first comment on each scheduled post above; it is published after the main post (or as a reply on X). Comment status is tracked separately (pending, posted, failed, skipped).
          </p>
        </section>

        <section className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Media / assets</h2>
          <p className="text-gray-500 text-sm">Quote card images and uploads will appear here when the feature is connected.</p>
        </section>
      </main>
    </div>
  );
}
