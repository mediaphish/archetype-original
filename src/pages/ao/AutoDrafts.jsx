import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

function fmtAgoShort(iso) {
  try {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return '';
    const mins = Math.round(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } catch {
    return '';
  }
}

function safeText(x, max = 400) {
  const s = String(x ?? '').trim();
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export default function AutoDrafts() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [pageSize] = useState(15);
  const [searchInput, setSearchInput] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [actingId, setActingId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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

  const loadDrafts = useCallback(async () => {
    if (!authChecked) return;
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
      });
      if (searchApplied.trim()) qs.set('q', searchApplied.trim());
      const res = await fetch(`/api/ao/auto/drafts?${qs.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load drafts');
      setDrafts(Array.isArray(json.drafts) ? json.drafts : []);
      setTotal(typeof json.total === 'number' ? json.total : 0);
    } catch (e) {
      setDrafts([]);
      setTotal(0);
      setError(e.message || 'Could not load drafts');
    } finally {
      setLoading(false);
    }
  }, [authChecked, offset, pageSize, searchApplied]);

  useEffect(() => {
    if (!authChecked) return;
    void loadDrafts();
  }, [authChecked, loadDrafts]);

  useEffect(() => {
    const onSaved = () => {
      void loadDrafts();
    };
    window.addEventListener('ao-auto-draft-saved', onSaved);
    return () => window.removeEventListener('ao-auto-draft-saved', onSaved);
  }, [loadDrafts]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const resumeDraft = useCallback(
    async (threadId) => {
      const id = String(threadId || '').trim();
      if (!id) return;
      setActingId(id);
      setError('');
      try {
        const res = await fetch('/api/ao/auto/thread/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: id }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || 'Could not open draft');
        setMessage('Opening Auto with this conversation…');
        handleNavigate('/ao/analyst');
      } catch (e) {
        setError(e.message || 'Could not open draft');
      } finally {
        setActingId(null);
      }
    },
    [handleNavigate]
  );

  const deleteDraft = useCallback(
    async (threadId) => {
      const id = String(threadId || '').trim();
      if (!id) return;
      const ok = window.confirm('Are you sure you want to delete this draft?');
      if (!ok) return;
      setActingId(id);
      setError('');
      try {
        const res = await fetch(`/api/ao/auto/thread/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || 'Could not delete draft');
        setMessage('Draft deleted.');
        await loadDrafts();
      } catch (e) {
        setError(e.message || 'Could not delete draft');
      } finally {
        setActingId(null);
      }
    },
    [loadDrafts]
  );

  const onSearchSubmit = useCallback(
    (e) => {
      e?.preventDefault?.();
      setOffset(0);
      setSearchApplied(searchInput.trim());
    },
    [searchInput]
  );

  const rangeLabel = useMemo(() => {
    if (!total) return '';
    const start = offset + 1;
    const end = Math.min(offset + drafts.length, total);
    return `Showing ${start}–${end} of ${total}`;
  }, [drafts.length, offset, total]);

  const canPrev = offset > 0;
  const canNext = offset + pageSize < total;

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="library" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Conversation drafts</h1>
            <p className="text-gray-600 mt-1 text-sm max-w-2xl">
              Saved Auto threads you parked with <strong>Save draft</strong>. Open one to continue in Auto, or delete what you no longer need.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleNavigate('/ao/analyst')}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
          >
            Back to Auto
          </button>
        </div>

        {error ? (
          <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>
        ) : null}
        {message ? (
          <div className="mb-4 p-3 rounded border border-green-200 bg-green-50 text-green-800 text-sm">{message}</div>
        ) : null}

        <form onSubmit={onSearchSubmit} className="mb-6 flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search titles or last message…"
            className="flex-1 min-h-[44px] border border-gray-300 rounded-lg px-3 py-2 text-base md:text-sm"
          />
          <button
            type="submit"
            className="min-h-[44px] px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Search
          </button>
          {searchApplied ? (
            <button
              type="button"
              className="min-h-[44px] px-3 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
              onClick={() => {
                setSearchInput('');
                setSearchApplied('');
                setOffset(0);
              }}
            >
              Clear
            </button>
          ) : null}
        </form>

        {loading ? (
          <div className="text-sm text-gray-500 py-8">Loading drafts…</div>
        ) : drafts.length === 0 ? (
          <p className="text-gray-500">
            No drafts match{searchApplied ? ' that search' : ''}. Use <strong>Save draft</strong> in Auto to park a conversation.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-sm text-gray-600">
              <span>{rangeLabel}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!canPrev || loading}
                  onClick={() => setOffset((o) => Math.max(0, o - pageSize))}
                  className="min-h-[40px] px-3 rounded-lg border border-gray-300 bg-white text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!canNext || loading}
                  onClick={() => setOffset((o) => o + pageSize)}
                  className="min-h-[40px] px-3 rounded-lg border border-gray-300 bg-white text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
            <ul className="space-y-3">
              {drafts.map((d) => (
                <li key={d.id} className="relative border border-gray-200 rounded-lg bg-gray-50 overflow-visible">
                  <div className="flex items-stretch gap-2 p-4">
                    <button
                      type="button"
                      disabled={actingId === d.id}
                      onClick={() => {
                        setMenuOpen(null);
                        resumeDraft(d.id);
                      }}
                      className="min-w-0 flex-1 text-left rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 active:bg-gray-100/80"
                    >
                      <div className="font-semibold text-gray-900 line-clamp-2 break-words">{d.title || 'Draft'}</div>
                      {d.updated_at ? (
                        <div className="text-xs text-gray-500 mt-1">Updated {fmtAgoShort(d.updated_at)}</div>
                      ) : null}
                      {d.preview ? (
                        <div className="text-sm text-gray-700 mt-2 line-clamp-6 whitespace-pre-wrap break-words">{safeText(d.preview, 480)}</div>
                      ) : null}
                      {actingId === d.id ? (
                        <div className="text-xs text-blue-600 mt-2">Opening…</div>
                      ) : (
                        <div className="text-xs text-blue-600 mt-2 md:hidden">Tap to continue in Auto</div>
                      )}
                    </button>
                    <div className="relative shrink-0 flex flex-col justify-start">
                      <button
                        type="button"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 text-xl leading-none hover:bg-gray-50"
                        aria-label="Draft actions"
                        aria-expanded={menuOpen === d.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen((prev) => (prev === d.id ? null : d.id));
                        }}
                      >
                        ⋯
                      </button>
                      {menuOpen === d.id ? (
                        <>
                          <button
                            type="button"
                            className="fixed inset-0 z-20 cursor-default bg-black/20 md:bg-transparent"
                            aria-label="Close menu"
                            onClick={() => setMenuOpen(null)}
                          />
                          <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg md:right-0">
                            <button
                              type="button"
                              className="w-full px-4 py-3 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setMenuOpen(null);
                                deleteDraft(d.id);
                              }}
                            >
                              Delete draft…
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
