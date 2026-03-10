import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

export default function Writing() {
  const [email, setEmail] = useState('');
  const [writing, setWriting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('email') || localStorage.getItem('ao_email') || '';
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
        const res = await fetch(`/api/ao/writing/list?email=${encodeURIComponent(email)}`);
        if (cancelled) return;
        const json = await res.json().catch(() => ({}));
        if (json.ok && Array.isArray(json.writing)) setWriting(json.writing);
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [email]);

  const act = useCallback(async (kind, id) => {
    if (!email || acting) return;
    setActing(id);
    try {
      const url = kind === 'draft' ? `/api/ao/writing/${id}/draft` : `/api/ao/writing/${id}/discard`;
      const res = await fetch(`${url}?email=${encodeURIComponent(email)}`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (json.ok) {
        if (kind === 'draft' && json.writing) setWriting((prev) => prev.map((w) => (w.id === id ? json.writing : w)));
        else setWriting((prev) => prev.filter((w) => w.id !== id));
      }
    } finally {
      setActing(null);
    }
  }, [email, acting]);

  const pending = writing.filter((w) => w.status === 'pending' || w.status === 'drafting');
  const drafted = writing.filter((w) => w.status === 'drafted');

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="writing" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Writing</h1>
        <p className="text-gray-600 mb-8">Approved topics, drafting queue, and ready-for-site content.</p>

        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Drafting queue</h2>
            {loading ? (
              <LoadingSpinner />
            ) : pending.length === 0 ? (
              <p className="text-gray-500 text-sm">No items. Use Review → Journal → “Approve & draft” to add topics.</p>
            ) : (
              <ul className="space-y-4">
                {pending.map((w) => (
                  <li key={w.id} className="border border-gray-200 rounded p-4">
                    <h3 className="font-medium text-gray-900">{w.title || 'Untitled'}</h3>
                    <p className="text-gray-600 text-sm mt-1">{w.angle || w.source_notes?.slice(0, 120)}</p>
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={() => act('draft', w.id)} disabled={acting === w.id || w.status === 'drafting'} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">Generate draft</button>
                      <button type="button" onClick={() => act('discard', w.id)} disabled={acting === w.id} className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50">Discard</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ready for site</h2>
            {loading ? null : drafted.length === 0 ? (
              <p className="text-gray-500 text-sm">No drafted content yet.</p>
            ) : (
              <ul className="space-y-4">
                {drafted.map((w) => (
                  <li key={w.id} className="border border-gray-200 rounded p-4">
                    <h3 className="font-medium text-gray-900">{w.title || 'Untitled'}</h3>
                    <div className="mt-2 text-gray-700 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">{w.draft_content?.slice(0, 800)}{w.draft_content?.length > 800 ? '…' : ''}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
