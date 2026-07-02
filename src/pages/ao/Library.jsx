import React, { useCallback, useEffect, useState } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      timeZone: 'America/Chicago',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function platformLabel(post) {
  return post.intent?.channel_label || post.platform || 'unknown';
}

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const colors = {
    posted: 'bg-green-100 text-green-800',
    scheduled: 'bg-amber-100 text-amber-900',
    failed: 'bg-red-100 text-red-800',
  };
  const cls = colors[s] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${cls}`}>
      {s || 'unknown'}
    </span>
  );
}

export default function Library() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState('');

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ao/me');
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          window.location.replace('/ao/login');
          return;
        }
        if (!cancelled) {
          setEmail(json.email || '');
          setAuthChecked(true);
        }
      } catch (_) {
        window.location.replace('/ao/login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchLibrary = useCallback(async () => {
    if (!authChecked) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ao/auto/library');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load library');
      setEntries(Array.isArray(json.entries) ? json.entries : []);
      setDrafts(Array.isArray(json.drafts) ? json.drafts : []);
    } catch (e) {
      setEntries([]);
      setDrafts([]);
      setError(e.message || 'Could not load library');
    } finally {
      setLoading(false);
    }
  }, [authChecked]);

  useEffect(() => {
    if (!authChecked) return;
    void fetchLibrary();
  }, [authChecked, fetchLibrary]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <LoadingSpinner />
        <p className="text-sm text-gray-600">Checking sign-in…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="library" email={email} onNavigate={handleNavigate} />

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-6xl pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Library</h1>
          <p className="text-sm text-gray-600 mt-1">
            What is live, what is queued, and what failed — journal entries and social posts in one place.
          </p>
        </div>

        {error ? (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
        ) : null}

        {loading ? (
          <LoadingSpinner message="Loading library…" />
        ) : (
          <div className="space-y-8">
            <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Published &amp; Scheduled</h2>
                <p className="text-sm text-gray-600 mt-1">Journal entries with social posts in the queue.</p>
              </div>

              {entries.length === 0 ? (
                <p className="px-5 py-8 text-sm text-gray-500">No journal social posts scheduled yet.</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <div key={entry.slug} className="px-5 py-5">
                      <div className="mb-3">
                        <a
                          href={entry.journal_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-semibold text-gray-900 hover:text-blue-700 underline-offset-2 hover:underline"
                        >
                          {entry.slug}
                        </a>
                        <p className="text-xs text-gray-500 mt-0.5">{entry.journal_url}</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                              <th className="pb-2 pr-4 font-medium">Platform</th>
                              <th className="pb-2 pr-4 font-medium">Scheduled</th>
                              <th className="pb-2 pr-4 font-medium">Status</th>
                              <th className="pb-2 font-medium">Error</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {(entry.posts || []).map((post) => (
                              <tr key={post.id}>
                                <td className="py-2.5 pr-4 text-gray-800 capitalize">{platformLabel(post)}</td>
                                <td className="py-2.5 pr-4 text-gray-600 whitespace-nowrap">{fmtDateTime(post.scheduled_at)}</td>
                                <td className="py-2.5 pr-4">
                                  <StatusBadge status={post.status} />
                                </td>
                                <td className="py-2.5 text-red-700 text-xs max-w-xs truncate" title={post.error_message || ''}>
                                  {post.status === 'failed' && post.error_message ? post.error_message : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Approved Drafts</h2>
                <p className="text-sm text-gray-600 mt-1">Approved journal content not yet published to the site.</p>
              </div>

              {drafts.length === 0 ? (
                <p className="px-5 py-8 text-sm text-gray-500">No approved drafts saved yet.</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {drafts.map((draft) => (
                    <div key={draft.slug || draft.title} className="px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{draft.title || draft.slug}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{draft.slug}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Approved {fmtDate(draft.approved_at)}
                          {draft.publish_date ? ` · Publish date ${draft.publish_date}` : ''}
                        </p>
                        {!draft.image_url && (
                          <p className="text-xs text-amber-700 mt-2 font-medium">Header image missing</p>
                        )}
                      </div>
                      <StatusBadge status={draft.status || 'approved'} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
