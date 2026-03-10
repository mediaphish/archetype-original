import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

function withEmail(path, email) {
  if (!email) return path;
  return `${path}${path.includes('?') ? '&' : '?'}email=${encodeURIComponent(email)}`;
}

export default function CommandCenter() {
  const [email, setEmail] = useState('');
  const [scheduled, setScheduled] = useState([]);
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('email') || (typeof window !== 'undefined' ? localStorage.getItem('ao_email') : null) || '';
    setEmail(e);
  }, []);

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [schedRes, failRes] = await Promise.all([
          fetch(`/api/ao/scheduled-posts?email=${encodeURIComponent(email)}&status=scheduled&limit=10`),
          fetch(`/api/ao/scheduled-posts?email=${encodeURIComponent(email)}&status=failed&limit=10`),
        ]);
        if (cancelled) return;
        const schedJson = await schedRes.json().catch(() => ({}));
        const failJson = await failRes.json().catch(() => ({}));
        if (schedJson.ok && schedJson.posts) setScheduled(schedJson.posts);
        if (failJson.ok && failJson.posts) setFailures(failJson.posts);
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [email]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="command-center" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Command Center</h1>
        <p className="text-gray-600 mb-8">At a glance: candidates, queues, scheduled posts, and scan status.</p>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New social candidates</h2>
            <p className="text-gray-500 text-sm">Queue will appear when the internal scanner and intelligence layer are connected.</p>
            <button type="button" onClick={() => handleNavigate(withEmail('/ao/review', email))} className="mt-3 text-blue-600 hover:underline text-sm">Go to Review → Social</button>
          </section>
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New journal candidates</h2>
            <p className="text-gray-500 text-sm">Queue will appear when the intelligence layer is connected.</p>
            <button type="button" onClick={() => handleNavigate(withEmail('/ao/review', email))} className="mt-3 text-blue-600 hover:underline text-sm">Go to Review → Journal</button>
          </section>
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Expandable ideas</h2>
            <p className="text-gray-500 text-sm">Placeholder until expandable-ideas queue exists.</p>
          </section>
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contradiction / clarification</h2>
            <p className="text-gray-500 text-sm">High-priority items will appear here after corpus comparison is connected.</p>
          </section>
        </div>

        <section className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scheduled posts</h2>
          {loading ? (
            <LoadingSpinner />
          ) : scheduled.length === 0 ? (
            <p className="text-gray-500">No scheduled posts.</p>
          ) : (
            <ul className="space-y-2">
              {scheduled.slice(0, 5).map((p) => (
                <li key={p.id} className="flex justify-between items-start text-sm">
                  <span className="text-gray-700">{p.platform} / {p.account_id} — {new Date(p.scheduled_at).toLocaleString()}</span>
                  <button type="button" onClick={() => handleNavigate(withEmail('/ao/publishing', email))} className="text-blue-600 hover:underline">View</button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => handleNavigate(withEmail('/ao/publishing', email))} className="mt-3 text-blue-600 hover:underline text-sm">View all in Publishing</button>
        </section>

        <section className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent failures</h2>
          {loading ? (
            <LoadingSpinner />
          ) : failures.length === 0 ? (
            <p className="text-gray-500">No recent failures.</p>
          ) : (
            <ul className="space-y-2">
              {failures.slice(0, 5).map((p) => (
                <li key={p.id} className="text-sm">
                  <span className="text-gray-700">{p.platform} — {p.error_message || 'Unknown error'}</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => handleNavigate(withEmail('/ao/publishing', email))} className="mt-3 text-blue-600 hover:underline text-sm">View in Publishing</button>
        </section>

        <section className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan status</h2>
          <p className="text-gray-500 text-sm">Last internal: — | Last external: — (scanners not yet connected)</p>
        </section>
      </main>
    </div>
  );
}
