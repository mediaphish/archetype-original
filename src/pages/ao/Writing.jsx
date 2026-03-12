import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

export default function Writing() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [writing, setWriting] = useState([]);
  const [studioItems, setStudioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!email) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [wRes, qRes] = await Promise.all([
          fetch(`/api/ao/writing/list`),
          fetch(`/api/ao/quotes/list?status=approved&limit=200&offset=0`),
        ]);
        if (cancelled) return;
        const wJson = await wRes.json().catch(() => ({}));
        const qJson = await qRes.json().catch(() => ({}));
        if (wJson.ok && Array.isArray(wJson.writing)) setWriting(wJson.writing);
        if (qJson.ok && Array.isArray(qJson.quotes)) {
          const rows = qJson.quotes.filter((q) => q && q.status === 'approved' && q.next_stage === 'studio');
          setStudioItems(rows);
        } else {
          setStudioItems([]);
        }
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authChecked, email]);

  const act = useCallback(async (kind, id) => {
    if (!authChecked || acting) return;
    setActing(id);
    try {
      if (kind === 'send-to-publisher') {
        const res = await fetch(`/api/ao/quotes/${id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ next_stage: 'publisher' }),
        });
        const json = await res.json().catch(() => ({}));
        if (json.ok) {
          setStudioItems((prev) => prev.filter((x) => x.id !== id));
        }
        return;
      }

      const url = kind === 'draft' ? `/api/ao/writing/${id}/draft` : `/api/ao/writing/${id}/discard`;
      const res = await fetch(`${url}`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (json.ok) {
        if (kind === 'draft' && json.writing) setWriting((prev) => prev.map((w) => (w.id === id ? json.writing : w)));
        else setWriting((prev) => prev.filter((w) => w.id !== id));
      }
    } finally {
      setActing(null);
    }
  }, [authChecked, acting]);

  const pending = writing.filter((w) => w.status === 'pending' || w.status === 'drafting');
  const drafted = writing.filter((w) => w.status === 'drafted');
  const approvedToStudio = studioItems || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="studio" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Studio</h1>
        <p className="text-gray-600 mb-8">Finish work here: drafts, edits, and assets before sending to Publisher.</p>

        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Approved from Analyst</h2>
            <p className="text-sm text-gray-600 mb-4">These are approved items that still need finishing before scheduling.</p>
            {loading ? (
              <LoadingSpinner />
            ) : approvedToStudio.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing here yet. In Analyst, use “Approve → Studio”.</p>
            ) : (
              <ul className="space-y-4">
                {approvedToStudio.map((q) => (
                  <li key={q.id} className="border border-gray-200 rounded p-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {q.source_name || (q.is_internal ? 'Archetype Original' : 'External')}
                      {q.source_title ? <span className="font-normal text-gray-700"> — “{q.source_title}”</span> : null}
                    </div>
                    {q.pull_quote ? (
                      <blockquote className="border-l-4 border-gray-900 pl-4 py-1 mt-3">
                        <p className="text-gray-900 font-medium whitespace-pre-wrap">{q.pull_quote}</p>
                      </blockquote>
                    ) : (
                      <p className="text-gray-800 mt-3 whitespace-pre-wrap">{q.quote_text?.slice(0, 400)}{q.quote_text?.length > 400 ? '…' : ''}</p>
                    )}
                    {q.why_it_matters ? (
                      <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{q.why_it_matters}</p>
                    ) : null}

                    <details className="mt-3 border border-gray-200 rounded bg-gray-50 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-gray-800">Drafts + quote card</summary>
                      <div className="mt-3 space-y-4">
                        {q.quote_card_svg ? (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-2">Quote card preview</p>
                            <div className="border border-gray-200 rounded bg-white p-2 overflow-auto">
                              <div dangerouslySetInnerHTML={{ __html: q.quote_card_svg }} />
                            </div>
                          </div>
                        ) : null}
                        {q.drafts_by_channel ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {['linkedin', 'facebook', 'instagram', 'x'].map((ch) => {
                              const text = q.drafts_by_channel?.[ch] || '';
                              if (!text) return null;
                              return (
                                <div key={ch} className="border border-gray-200 rounded bg-white p-3">
                                  <div className="text-xs uppercase tracking-wide text-gray-500">{ch}</div>
                                  <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{text}</p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">No drafts saved yet.</p>
                        )}
                      </div>
                    </details>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => act('send-to-publisher', q.id)}
                        disabled={acting === q.id}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Send to Publisher
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNavigate('/ao/publisher')}
                        className="px-3 py-1.5 border border-gray-300 bg-white text-sm rounded hover:bg-gray-50"
                      >
                        Go to Publisher
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Drafting queue</h2>
            {loading ? (
              <LoadingSpinner />
            ) : pending.length === 0 ? (
              <p className="text-gray-500 text-sm">No items. In Analyst → Journal topics, use “Approve & draft” to add topics.</p>
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
