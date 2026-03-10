import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

const TABS = [
  { key: 'social', label: 'Social Review Queue' },
  { key: 'journal', label: 'Journal Review Queue' },
  { key: 'expandable', label: 'Expandable Ideas Queue' },
];

function withEmail(path, email) {
  if (!email) return path;
  return `${path}${path.includes('?') ? '&' : '?'}email=${encodeURIComponent(email)}`;
}

export default function Review() {
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState('social');
  const [quotes, setQuotes] = useState([]);
  const [topics, setTopics] = useState([]);
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
        const [quotesRes, journalRes, writingRes] = await Promise.all([
          fetch(`/api/ao/quotes/list?email=${encodeURIComponent(email)}`),
          fetch(`/api/ao/journal-topics/list?email=${encodeURIComponent(email)}`),
          fetch(`/api/ao/writing/list?email=${encodeURIComponent(email)}`),
        ]);
        if (cancelled) return;
        const q = await quotesRes.json().catch(() => ({}));
        const j = await journalRes.json().catch(() => ({}));
        const w = await writingRes.json().catch(() => ({}));
        if (q.ok && Array.isArray(q.quotes)) setQuotes(q.quotes);
        if (j.ok && Array.isArray(j.topics)) setTopics(j.topics);
        if (w.ok && Array.isArray(w.writing)) setWriting(w.writing);
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [email]);

  const act = useCallback(async (kind, id, extra) => {
    if (!email || acting) return;
    setActing(id);
    try {
      const base = `/api/ao`;
      let url = '';
      if (kind === 'quote-approve') url = `${base}/quotes/${id}/approve?email=${encodeURIComponent(email)}`;
      else if (kind === 'quote-reject') url = `${base}/quotes/${id}/reject?email=${encodeURIComponent(email)}`;
      else if (kind === 'topic-approve') url = `${base}/journal-topics/${id}/approve?email=${encodeURIComponent(email)}`;
      else if (kind === 'topic-reject') url = `${base}/journal-topics/${id}/reject?email=${encodeURIComponent(email)}`;
      else if (kind === 'topic-approve-draft') url = `${base}/journal-topics/${id}/approve-and-draft?email=${encodeURIComponent(email)}`;
      else if (kind === 'writing-draft') url = `${base}/writing/${id}/draft?email=${encodeURIComponent(email)}`;
      else if (kind === 'writing-discard') url = `${base}/writing/${id}/discard?email=${encodeURIComponent(email)}`;
      if (!url) return;
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: extra ? JSON.stringify(extra) : undefined });
      const json = await res.json().catch(() => ({}));
      if (json.ok) {
        if (kind === 'quote-approve' || kind === 'quote-reject') setQuotes((prev) => prev.filter((x) => x.id !== id));
        if (kind === 'topic-approve' || kind === 'topic-reject' || kind === 'topic-approve-draft') setTopics((prev) => prev.filter((x) => x.id !== id));
        if (kind === 'topic-approve-draft' && json.writing) setWriting((prev) => [json.writing, ...prev]);
        if (kind === 'writing-draft' || kind === 'writing-discard') setWriting((prev) => prev.filter((x) => x.id !== id));
      }
    } finally {
      setActing(null);
    }
  }, [email, acting]);

  const pendingQuotes = quotes.filter((q) => q.status === 'pending');
  const pendingTopics = topics.filter((t) => t.status === 'pending');
  const pendingWriting = writing.filter((w) => w.status === 'pending' || w.status === 'drafting');

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="review" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Review</h1>
        <p className="text-gray-600 mb-8">Approve, reject, or hold candidates for social and journal.</p>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 -mb-px font-medium border-b-2 ${activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          {loading ? (
            <LoadingSpinner />
          ) : activeTab === 'social' && (
            <>
              {pendingQuotes.length === 0 ? (
                <p className="text-gray-500">No pending quotes. Run an internal scan from Command Center to add candidates.</p>
              ) : (
                <ul className="space-y-4">
                  {pendingQuotes.map((q) => (
                    <li key={q.id} className="border border-gray-200 rounded p-4">
                      <p className="text-gray-800 mb-2">{q.quote_text?.slice(0, 300)}{q.quote_text?.length > 300 ? '…' : ''}</p>
                      <p className="text-gray-500 text-sm mb-3">Source: {q.source_slug_or_url || '—'} · Score: {q.composite_score ?? '—'}</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => act('quote-approve', q.id)} disabled={acting === q.id} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50">Approve</button>
                        <button type="button" onClick={() => act('quote-reject', q.id)} disabled={acting === q.id} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50">Reject</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {!loading && activeTab === 'journal' && (
            <>
              {pendingTopics.length === 0 ? (
                <p className="text-gray-500">No pending journal topics.</p>
              ) : (
                <ul className="space-y-4">
                  {pendingTopics.map((t) => (
                    <li key={t.id} className="border border-gray-200 rounded p-4">
                      <h3 className="font-medium text-gray-900">{t.topic_title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{t.why_it_matters?.slice(0, 200)}</p>
                      <div className="flex gap-2 mt-3">
                        <button type="button" onClick={() => act('topic-approve', t.id)} disabled={acting === t.id} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50">Approve</button>
                        <button type="button" onClick={() => act('topic-approve-draft', t.id)} disabled={acting === t.id} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">Approve & draft</button>
                        <button type="button" onClick={() => act('topic-reject', t.id)} disabled={acting === t.id} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50">Reject</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {!loading && activeTab === 'expandable' && (
            <>
              {pendingWriting.length === 0 ? (
                <p className="text-gray-500">No items in the writing queue. Approve journal topics with “Approve & draft” to add them.</p>
              ) : (
                <ul className="space-y-4">
                  {pendingWriting.map((w) => (
                    <li key={w.id} className="border border-gray-200 rounded p-4">
                      <h3 className="font-medium text-gray-900">{w.title || 'Untitled'}</h3>
                      <p className="text-gray-600 text-sm mt-1">Status: {w.status}</p>
                      <div className="flex gap-2 mt-3">
                        <button type="button" onClick={() => act('writing-draft', w.id)} disabled={acting === w.id || w.status === 'drafting'} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">Draft</button>
                        <button type="button" onClick={() => act('writing-discard', w.id)} disabled={acting === w.id} className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50">Discard</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
