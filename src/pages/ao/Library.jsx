import React, { useCallback, useEffect, useState, useMemo } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

// --- Helpers ---

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

const TYPE_LABELS = {
  'journal-post': 'Journal',
  chapter: 'Chapter',
  preface: 'Preface',
  book: 'Book',
  devotional: 'Devotional',
  article: 'Article',
  'culture-science': 'Culture Science',
  faq: 'FAQ',
  'podcast-episode': 'Podcast',
  other: 'Other',
};

const TYPE_ORDER = [
  'journal-post',
  'devotional',
  'faq',
  'culture-science',
  'article',
  'chapter',
  'book',
  'preface',
  'podcast-episode',
  'other',
];

function TypeBadge({ type }) {
  const label = TYPE_LABELS[type] || type || 'Other';
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-gray-100 text-gray-600">
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const colors = {
    posted: 'bg-green-100 text-green-800',
    scheduled: 'bg-amber-100 text-amber-900',
    failed: 'bg-red-100 text-red-800',
    approved: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors[s] || 'bg-gray-100 text-gray-700'}`}>
      {s || 'unknown'}
    </span>
  );
}

// --- Corpus document row with inline expand ---

function CorpusDocRow({ doc }) {
  const [expanded, setExpanded] = useState(false);
  const [overlap, setOverlap] = useState(null);
  const [overlapLoading, setOverlapLoading] = useState(false);

  const checkOverlap = async () => {
    if (overlap !== null) return;
    setOverlapLoading(true);
    try {
      const res = await fetch('/api/ao/auto/corpus-overlap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `${doc.title} ${doc.summary || ''}`.trim(),
          threshold: 0.65,
          max_results: 5,
          exclude_slug: doc.slug,
        }),
      });
      const json = await res.json().catch(() => ({}));
      setOverlap(res.ok && json.ok ? json.results : []);
    } catch {
      setOverlap([]);
    } finally {
      setOverlapLoading(false);
    }
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && overlap === null) checkOverlap();
  };

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={handleExpand}
        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 leading-snug">{doc.title || doc.slug}</p>
            {doc.summary && (
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{doc.summary}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <TypeBadge type={doc.doc_type} />
              {Array.isArray(doc.categories) && doc.categories.slice(0, 3).map((cat) => (
                <span key={cat} className="text-[10px] text-gray-400">{cat}</span>
              ))}
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {doc.body_preview && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Content preview</p>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{doc.body_preview.slice(0, 800)}{doc.body_preview.length > 800 ? '…' : ''}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Similar documents {overlapLoading ? '(checking…)' : overlap !== null ? `(${overlap.length} found)` : ''}
            </p>
            {overlapLoading && <p className="text-xs text-gray-400">Checking corpus for overlap…</p>}
            {!overlapLoading && overlap !== null && overlap.length === 0 && (
              <p className="text-xs text-gray-400">No significant overlap found.</p>
            )}
            {!overlapLoading && overlap !== null && overlap.length > 0 && (
              <div className="space-y-2">
                {overlap.map((item) => (
                  <div key={item.slug} className="flex items-start justify-between gap-3 py-2 border-t border-gray-100 first:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800">{item.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{item.slug}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        item.similarity >= 0.8
                          ? 'bg-red-100 text-red-700'
                          : item.similarity >= 0.65
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {Math.round(item.similarity * 100)}% match
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-400">Slug: {doc.slug} · Updated {fmtDate(doc.updated_at)}</p>
        </div>
      )}
    </div>
  );
}

// --- Main ---

export default function Library() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('corpus');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Corpus state
  const [corpus, setCorpus] = useState([]);
  const [corpusTotal, setCorpusTotal] = useState(0);
  const [corpusStats, setCorpusStats] = useState({});
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Scheduling state
  const [entries, setEntries] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [reshareQueue, setReshareQueue] = useState([]);

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
        if (!res.ok || !json.ok) { window.location.replace('/ao/login'); return; }
        if (!cancelled) { setEmail(json.email || ''); setAuthChecked(true); }
      } catch (_) { window.location.replace('/ao/login'); }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchLibrary = useCallback(async (opts = {}) => {
    if (!authChecked) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: '100',
        offset: '0',
        ...(opts.type || typeFilter ? { type: opts.type ?? typeFilter } : {}),
        ...(opts.search || searchQuery ? { search: opts.search ?? searchQuery } : {}),
      });

      const res = await fetch(`/api/ao/auto/library?${params}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load library');

      setCorpus(Array.isArray(json.corpus) ? json.corpus : []);
      setCorpusTotal(json.corpus_total || 0);
      setCorpusStats(json.corpus_stats || {});
      setEntries(Array.isArray(json.entries) ? json.entries : []);
      setDrafts(Array.isArray(json.drafts) ? json.drafts : []);
      setReshareQueue(Array.isArray(json.reshare_queue) ? json.reshare_queue : []);
    } catch (e) {
      setError(e.message || 'Could not load library');
    } finally {
      setLoading(false);
    }
  }, [authChecked, typeFilter, searchQuery]);

  useEffect(() => { if (authChecked) fetchLibrary(); }, [authChecked, fetchLibrary]);

  const handleTypeFilter = (t) => {
    setTypeFilter(t);
    fetchLibrary({ type: t, search: searchQuery });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    fetchLibrary({ type: typeFilter, search: searchInput });
  };

  const totalDocs = useMemo(
    () => Object.values(corpusStats).reduce((a, b) => a + b, 0),
    [corpusStats]
  );

  const tabs = [
    { id: 'corpus', label: `Corpus${totalDocs ? ` (${totalDocs})` : ''}` },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'drafts', label: `Drafts${drafts.length ? ` (${drafts.length})` : ''}` },
    { id: 'reshare', label: 'Reshare' },
  ];

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

      <main className="container mx-auto px-4 py-6 max-w-4xl pb-16">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Library</h1>
          <p className="text-sm text-gray-500 mt-1">Full content memory — everything written, scheduled, and queued.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
        )}

        {/* Tab nav */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <LoadingSpinner />
            <p className="text-sm text-gray-500">Loading library…</p>
          </div>
        ) : (
          <>
            {/* CORPUS TAB */}
            {activeTab === 'corpus' && (
              <div className="space-y-4">
                {/* Stats strip */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleTypeFilter('')}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      !typeFilter
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    All ({totalDocs})
                  </button>
                  {TYPE_ORDER.filter((t) => corpusStats[t]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTypeFilter(t)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        typeFilter === t
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {TYPE_LABELS[t] || t} ({corpusStats[t]})
                    </button>
                  ))}
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search titles and summaries…"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Search
                  </button>
                  {(searchQuery || typeFilter) && (
                    <button
                      type="button"
                      onClick={() => { setSearchInput(''); setSearchQuery(''); setTypeFilter(''); fetchLibrary({ type: '', search: '' }); }}
                      className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  )}
                </form>

                {/* Document list */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {corpus.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-gray-500">
                      {searchQuery || typeFilter ? 'No documents match this filter.' : 'Corpus not loaded. Use Settings to seed.'}
                    </p>
                  ) : (
                    <>
                      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500">
                          Showing {corpus.length} of {corpusTotal} documents
                          {typeFilter ? ` · ${TYPE_LABELS[typeFilter] || typeFilter}` : ''}
                          {searchQuery ? ` · "${searchQuery}"` : ''}
                        </p>
                      </div>
                      {corpus.map((doc) => (
                        <CorpusDocRow key={doc.slug} doc={doc} />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* SCHEDULED TAB */}
            {activeTab === 'scheduled' && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200">
                  <h2 className="text-base font-semibold text-gray-900">Published &amp; Scheduled</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Journal entries with social posts in the queue.</p>
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
                            className="text-sm font-semibold text-gray-900 hover:text-blue-700 underline-offset-2 hover:underline"
                          >
                            {entry.slug}
                          </a>
                          <p className="text-xs text-gray-400 mt-0.5">{entry.journal_url}</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                                <th className="pb-2 pr-4 font-medium">Platform</th>
                                <th className="pb-2 pr-4 font-medium">Scheduled</th>
                                <th className="pb-2 pr-4 font-medium">Status</th>
                                <th className="pb-2 font-medium">Error</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {(entry.posts || []).map((post) => (
                                <tr key={post.id}>
                                  <td className="py-2.5 pr-4 text-gray-800 capitalize text-xs">{post.intent?.channel_label || post.platform || 'unknown'}</td>
                                  <td className="py-2.5 pr-4 text-gray-600 whitespace-nowrap text-xs">{fmtDateTime(post.scheduled_at)}</td>
                                  <td className="py-2.5 pr-4"><StatusBadge status={post.status} /></td>
                                  <td className="py-2.5 text-red-700 text-xs max-w-xs truncate">{post.status === 'failed' && post.error_message ? post.error_message : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DRAFTS TAB */}
            {activeTab === 'drafts' && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200">
                  <h2 className="text-base font-semibold text-gray-900">Approved Drafts</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Approved content not yet published to the site.</p>
                </div>
                {drafts.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-gray-500">No approved drafts saved yet.</p>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {drafts.map((draft) => (
                      <div key={draft.slug || draft.title} className="px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{draft.title || draft.slug}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{draft.slug}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {draft.kind === 'devotional' ? 'Devotional' : 'Journal'} · Approved {fmtDate(draft.approved_at)}
                          </p>
                          {!draft.image_url && (
                            <p className="text-xs text-amber-700 mt-1 font-medium">Header image missing</p>
                          )}
                        </div>
                        <StatusBadge status={draft.status || 'approved'} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* RESHARE TAB */}
            {activeTab === 'reshare' && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200">
                  <h2 className="text-base font-semibold text-gray-900">Reshare Queue</h2>
                  <p className="text-sm text-gray-500 mt-0.5">One journal entry per week, rotated automatically. Next up first.</p>
                </div>
                {reshareQueue.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-gray-500">Reshare queue not seeded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                          <th className="px-5 py-3 font-medium">Title</th>
                          <th className="px-5 py-3 font-medium">Last reshared</th>
                          <th className="px-5 py-3 font-medium">Times</th>
                          <th className="px-5 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {reshareQueue.map((item) => (
                          <tr key={item.slug}>
                            <td className="px-5 py-3">
                              <a
                                href={`https://www.archetypeoriginal.com/journal/${item.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-gray-900 hover:text-blue-700 underline-offset-2 hover:underline"
                              >
                                {item.title || item.slug}
                              </a>
                              <p className="text-xs text-gray-400 mt-0.5">{item.slug}</p>
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{item.last_reshared_at ? fmtDate(item.last_reshared_at) : 'Never'}</td>
                            <td className="px-5 py-3 text-xs text-gray-500">{item.reshare_count ?? 0}</td>
                            <td className="px-5 py-3">
                              {item.paused
                                ? <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">Paused</span>
                                : <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-100 text-green-800">Active</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
