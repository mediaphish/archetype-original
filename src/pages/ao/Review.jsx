import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

function Pill({ tone = 'gray', children }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    green: 'bg-green-50 text-green-800 border-green-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

function safeUrl(u) {
  try {
    if (!u) return null;
    const url = new URL(String(u));
    return url.toString();
  } catch {
    return null;
  }
}

function buildCritique(q) {
  const good = [];
  const weak = [];

  const isInternal = !!q?.is_internal;
  const link = safeUrl(q?.source_url || q?.source_slug_or_url);
  if (link) good.push('Working source link.');
  else if (isInternal) good.push('Internal source (trusted).');
  else weak.push('Missing a working source link (hard to verify / trust).');

  if (q?.pull_quote) good.push('Strong pull quote (the signal is clear).');
  else if (q?.quote_text && String(q.quote_text).trim().length > 30) good.push('Signal text is present.');
  else weak.push('Signal text is thin (hard to turn into a good post).');

  if (q?.why_it_matters) good.push('Has a “why it matters” angle.');
  else weak.push('Missing “why it matters” (needs interpretation).');

  if (q?.drafts_by_channel) good.push('Channel drafts are ready.');
  else weak.push('Channel drafts are not ready yet.');

  if (q?.quote_card_svg) good.push('Branded quote card is ready.');

  if (Array.isArray(q?.risk_flags) && q.risk_flags.length) {
    weak.push(`Risk flags: ${q.risk_flags.slice(0, 4).map((x) => String(x)).join(', ')}${q.risk_flags.length > 4 ? '…' : ''}`);
  }

  if (q?.similarity_notes?.matches?.length) {
    weak.push('Feels close to things you’ve already said (needs a fresh angle).');
  }

  let recommended = 'studio';
  if (q?.drafts_by_channel && link && (!Array.isArray(q?.risk_flags) || q.risk_flags.length === 0)) {
    recommended = 'publisher';
  }

  return { good, weak, recommended, link };
}

const TABS = [
  { key: 'social', label: 'Social signals' },
  { key: 'held', label: 'Held' },
  { key: 'journal', label: 'Journal topics' },
  { key: 'expandable', label: 'Long-form drafts' },
];

export default function Review() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('social');
  const [quotes, setQuotes] = useState([]);
  const [quotesPage, setQuotesPage] = useState({ status: 'pending', limit: 10, offset: 0, total: null });
  const [pageSize, setPageSize] = useState(10);
  const [pageOffset, setPageOffset] = useState(0);

  const [heldQuotes, setHeldQuotes] = useState([]);
  const [heldPage, setHeldPage] = useState({ status: 'held', limit: 10, offset: 0, total: null });
  const [heldOffset, setHeldOffset] = useState(0);
  const [topics, setTopics] = useState([]);
  const [writing, setWriting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

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
        const [quotesRes, heldRes, journalRes, writingRes] = await Promise.all([
          fetch(`/api/ao/quotes/list?status=pending&limit=${encodeURIComponent(pageSize)}&offset=${encodeURIComponent(pageOffset)}`),
          fetch(`/api/ao/quotes/list?status=held&limit=${encodeURIComponent(pageSize)}&offset=${encodeURIComponent(heldOffset)}`),
          fetch(`/api/ao/journal-topics/list`),
          fetch(`/api/ao/writing/list`),
        ]);
        if (cancelled) return;
        const q = await quotesRes.json().catch(() => ({}));
        const h = await heldRes.json().catch(() => ({}));
        const j = await journalRes.json().catch(() => ({}));
        const w = await writingRes.json().catch(() => ({}));
        if (q.ok && Array.isArray(q.quotes)) {
          setQuotes(q.quotes);
          if (q.page) setQuotesPage(q.page);
        }
        if (h.ok && Array.isArray(h.quotes)) {
          setHeldQuotes(h.quotes);
          if (h.page) setHeldPage(h.page);
        }
        if (j.ok && Array.isArray(j.topics)) setTopics(j.topics);
        if (w.ok && Array.isArray(w.writing)) setWriting(w.writing);
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authChecked, email, pageSize, pageOffset, heldOffset]);

  const act = useCallback(async (kind, id, extra) => {
    if (!authChecked || acting) return;
    setActing(id);
    setActionError('');
    setActionMessage('');
    try {
      const base = `/api/ao`;
      let url = '';
      if (kind === 'quote-approve') url = `${base}/quotes/${id}/approve`;
      else if (kind === 'quote-reject') url = `${base}/quotes/${id}/reject`;
      else if (kind === 'quote-hold') url = `${base}/quotes/${id}/hold`;
      else if (kind === 'quote-unhold') url = `${base}/quotes/${id}/unhold`;
      else if (kind === 'topic-approve') url = `${base}/journal-topics/${id}/approve`;
      else if (kind === 'topic-reject') url = `${base}/journal-topics/${id}/reject`;
      else if (kind === 'topic-approve-draft') url = `${base}/journal-topics/${id}/approve-and-draft`;
      else if (kind === 'writing-draft') url = `${base}/writing/${id}/draft`;
      else if (kind === 'writing-discard') url = `${base}/writing/${id}/discard`;
      if (!url) return;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: extra ? JSON.stringify(extra) : undefined,
      });

      const rawText = await res.text().catch(() => '');
      let json = {};
      try {
        json = rawText ? JSON.parse(rawText) : {};
      } catch {
        json = {};
      }

      if (!res.ok || !json.ok) {
        const fallback = rawText ? rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220) : '';
        setActionError(json.error || fallback || 'Action failed');
        return;
      }

      if (json.ok) {
        if (kind === 'quote-approve' || kind === 'quote-reject') setQuotes((prev) => prev.filter((x) => x.id !== id));
        if (kind === 'quote-hold') {
          setQuotes((prev) => prev.filter((x) => x.id !== id));
          window.location.reload();
        }
        if (kind === 'quote-unhold') {
          setHeldQuotes((prev) => prev.filter((x) => x.id !== id));
          window.location.reload();
        }
        if (kind === 'topic-approve' || kind === 'topic-reject' || kind === 'topic-approve-draft') setTopics((prev) => prev.filter((x) => x.id !== id));
        if (kind === 'topic-approve-draft' && json.writing) setWriting((prev) => [json.writing, ...prev]);
        if (kind === 'writing-draft' || kind === 'writing-discard') setWriting((prev) => prev.filter((x) => x.id !== id));

        if (kind === 'quote-approve') {
          const ns = String(extra?.next_stage || '').toLowerCase();
          setActionMessage(ns === 'publisher' ? 'Approved and sent to Publisher.' : 'Approved and sent to Studio.');
        } else if (kind === 'quote-reject') {
          setActionMessage('Rejected.');
        } else if (kind === 'topic-approve') {
          setActionMessage('Topic approved.');
        } else if (kind === 'topic-approve-draft') {
          setActionMessage('Topic approved and sent to drafting.');
        }
      }
    } finally {
      setActing(null);
    }
  }, [authChecked, acting]);

  const pendingQuotes = quotes.filter((q) => q.status === 'pending');
  const heldList = heldQuotes.filter((q) => q.status === 'held');
  const pendingTopics = topics.filter((t) => t.status === 'pending');
  const pendingWriting = writing.filter((w) => w.status === 'pending' || w.status === 'drafting');

  const canPrev = pageOffset > 0;
  const canNext = typeof quotesPage.total === 'number' ? (pageOffset + pageSize) < quotesPage.total : pendingQuotes.length === pageSize;

  const canHeldPrev = heldOffset > 0;
  const canHeldNext = typeof heldPage.total === 'number' ? (heldOffset + pageSize) < heldPage.total : heldList.length === pageSize;

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="analyst" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analyst</h1>
        <p className="text-gray-600 mb-8">Decision desk: approve, reject, or hold. This is where items get their next home.</p>
        {actionError ? (
          <div className="mb-6 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
            {actionError}
          </div>
        ) : null}
        {actionMessage ? (
          <div className="mb-6 p-3 rounded border border-green-200 bg-green-50 text-green-800 text-sm">
            {actionMessage}
          </div>
        ) : null}

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
              <p className="text-gray-600 text-sm mb-4">
                First comment supported on: Facebook Page, Instagram, LinkedIn, X. You can add, edit, or remove an optional first comment in <button type="button" onClick={() => handleNavigate('/ao/publisher')} className="text-blue-600 hover:underline">Publisher</button> when scheduling posts.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">Show</span>
                  <select
                    value={String(pageSize >= 200 ? 'all' : pageSize)}
                    onChange={(e) => {
                      const v = String(e.target.value);
                      const n = v === 'all' ? 200 : Number.parseInt(v, 10);
                      setPageSize(Number.isFinite(n) ? n : 10);
                      setPageOffset(0);
                    }}
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value="all">All</option>
                  </select>
                  <span>per page</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canPrev}
                    onClick={() => setPageOffset((x) => Math.max(0, x - pageSize))}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={!canNext}
                    onClick={() => setPageOffset((x) => x + pageSize)}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                  {typeof quotesPage.total === 'number' ? (
                    <span className="text-xs text-gray-500">
                      {Math.min(quotesPage.total, pageOffset + 1)}–{Math.min(quotesPage.total, pageOffset + pendingQuotes.length)} of {quotesPage.total}
                    </span>
                  ) : null}
                </div>
              </div>
              {pendingQuotes.length === 0 ? (
                <p className="text-gray-500">No pending social items. Run a scan in Scout to add candidates.</p>
              ) : (
                <ul className="space-y-4">
                  {pendingQuotes.map((q) => (
                    <li key={q.id} className="border border-gray-200 rounded p-4">
                      {/** Decision-ready brief (above the fold) */}
                      {(() => {
                        const crit = buildCritique(q);
                        const trailFrom = safeUrl(q?.scout_discovered_from_url);
                        const watched = safeUrl(q?.scout_watched_source_url);
                        return (
                          <>
                      <div className="mb-2 text-sm text-gray-800">
                        <span className="font-semibold">Source:</span>{' '}
                        <span className="font-medium">
                          {q.source_name || (q.is_internal ? 'Archetype Original' : 'External')}
                        </span>
                        {q.source_title ? <span> — “{q.source_title}”</span> : null}
                        {crit.link ? (
                          <span>
                            {' '}
                            <a
                              className="text-blue-700 hover:underline"
                              href={crit.link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              (link)
                            </a>
                          </span>
                        ) : null}
                      </div>
                      {(watched || trailFrom) ? (
                        <div className="mb-2 text-xs text-gray-600">
                          <span className="font-semibold">Scout trail:</span>{' '}
                          {watched ? (
                            <a className="text-blue-700 hover:underline" href={watched} target="_blank" rel="noreferrer">
                              watched source
                            </a>
                          ) : (
                            <span>watched source</span>
                          )}
                          {trailFrom && (!watched || trailFrom !== watched) ? (
                            <>
                              {' '}
                              →{' '}
                              <a className="text-blue-700 hover:underline" href={trailFrom} target="_blank" rel="noreferrer">
                                followed lead
                              </a>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-gray-900">
                            {q.source_title || q.source_name || (q.is_internal ? 'AO internal' : 'External')}
                          </h3>
                          {q.ao_lane || (Array.isArray(q.topic_tags) && q.topic_tags.length) || q.content_kind ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {q.content_kind ? <Pill tone="gray">{String(q.content_kind).replace(/_/g, ' ')}</Pill> : null}
                              {q.ao_lane ? <Pill tone="blue">{q.ao_lane}</Pill> : null}
                              {Array.isArray(q.topic_tags) ? q.topic_tags.slice(0, 6).map((t, idx) => (
                                <Pill key={idx} tone="gray">{String(t)}</Pill>
                              )) : null}
                            </div>
                          ) : null}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            <span className="truncate max-w-[520px]">
                              {q.source_name ? <span className="font-medium text-gray-700">{q.source_name}</span> : null}
                              {q.source_author ? <span> · {q.source_author}</span> : null}
                              {q.source_published_at ? <span> · {new Date(q.source_published_at).toLocaleDateString()}</span> : null}
                            </span>
                            {safeUrl(q.source_url) ? (
                              <a className="text-blue-600 hover:underline" href={safeUrl(q.source_url)} target="_blank" rel="noreferrer">
                                Open source
                              </a>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {q.best_move ? <Pill tone="blue">{String(q.best_move).replace(/_/g, ' ')}</Pill> : null}
                          {Array.isArray(q.risk_flags) && q.risk_flags.length ? (
                            <Pill tone="yellow">{q.risk_flags.length} risk flag{q.risk_flags.length === 1 ? '' : 's'}</Pill>
                          ) : (
                            <Pill tone="green">low risk</Pill>
                          )}
                        </div>
                      </div>

                      {q.pull_quote ? (
                        <blockquote className="border-l-4 border-gray-900 pl-4 py-1 mb-3">
                          <p className="text-gray-900 font-medium whitespace-pre-wrap">{q.pull_quote}</p>
                        </blockquote>
                      ) : (
                        <p className="text-gray-800 mb-3">{q.quote_text?.slice(0, 260)}{q.quote_text?.length > 260 ? '…' : ''}</p>
                      )}

                      {q.why_it_matters ? (
                        <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{q.why_it_matters}</p>
                      ) : null}

                      <div className="mb-3 grid gap-3 md:grid-cols-3">
                        <div className="md:col-span-1">
                          <p className="text-xs font-semibold text-gray-900 mb-1">What’s good</p>
                          <ul className="text-xs text-gray-700 space-y-1">
                            {(crit.good.length ? crit.good : ['No clear strengths yet.']).slice(0, 4).map((x, idx) => (
                              <li key={idx}>- {x}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="md:col-span-1">
                          <p className="text-xs font-semibold text-gray-900 mb-1">What’s weak</p>
                          <ul className="text-xs text-gray-700 space-y-1">
                            {(crit.weak.length ? crit.weak : ['No obvious weaknesses flagged.']).slice(0, 4).map((x, idx) => (
                              <li key={idx}>- {x}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="md:col-span-1">
                          <p className="text-xs font-semibold text-gray-900 mb-1">Recommended next step</p>
                          <div className="text-sm text-gray-900">
                            {crit.recommended === 'publisher' ? (
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-green-50 text-green-800 border-green-200">
                                Approve → Publisher
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-800 border-blue-200">
                                Approve → Studio
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            You can override this with the buttons below.
                          </p>
                        </div>
                      </div>

                      <details className="mb-3 border border-gray-200 rounded bg-gray-50 p-3">
                        <summary className="cursor-pointer text-sm font-medium text-gray-800">Details (drafts, quote card, similarity)</summary>
                        <div className="mt-3 space-y-4">
                          {q.source_excerpt ? (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Source excerpt</p>
                              <p className="text-xs text-gray-700 whitespace-pre-wrap">{q.source_excerpt}</p>
                            </div>
                          ) : null}

                          {q.summary_interpretation ? (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Summary + interpretation</p>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{q.summary_interpretation}</p>
                            </div>
                          ) : null}

                          {q.suggested_schedule?.slots?.length ? (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium text-gray-700">Suggested timing:</span>{' '}
                              {q.suggested_schedule.slots.slice(0, 3).map((s, idx) => (
                                <span key={idx} className="mr-2">
                                  {s.kind || 'slot'}: {s.recommended_at_utc ? new Date(s.recommended_at_utc).toLocaleString() : '—'}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {q.similarity_notes?.scheduling_hint ? (
                            <div className="text-xs text-gray-700">
                              <span className="font-medium text-gray-800">Scheduling hint:</span>{' '}
                              {q.similarity_notes.scheduling_hint}
                            </div>
                          ) : null}

                          {q.similarity_notes?.matches?.length ? (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-2">We’ve said this before (closest AO matches)</p>
                              <ul className="space-y-2">
                                {q.similarity_notes.matches.slice(0, 3).map((m, idx) => (
                                  <li key={idx} className="text-xs text-gray-700">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-900">{m.title || 'AO post'}</span>
                                      {safeUrl(m.url) ? (
                                        <a className="text-blue-600 hover:underline" href={safeUrl(m.url)} target="_blank" rel="noreferrer">
                                          Open
                                        </a>
                                      ) : null}
                                    </div>
                                    {m.excerpt ? <p className="text-xs text-gray-600 mt-1">{m.excerpt}</p> : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {q.quote_card_svg ? (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-2">AO quote card preview</p>
                              <div className="border border-gray-200 rounded bg-white p-2 overflow-auto">
                                <div dangerouslySetInnerHTML={{ __html: q.quote_card_svg }} />
                              </div>
                              {q.quote_card_caption ? (
                                <p className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">
                                  <span className="font-medium text-gray-800">Caption:</span> {q.quote_card_caption}
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          {q.alt_moves ? (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-2">Alternate moves</p>
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(q.alt_moves, null, 2)}</pre>
                            </div>
                          ) : null}

                          {q.drafts_by_channel && (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-2">Channel drafts</p>
                              <div className="grid gap-3 md:grid-cols-2">
                                {['linkedin', 'facebook', 'instagram', 'x'].map((ch) => {
                                  const text = q.drafts_by_channel?.[ch] || '';
                                  const tags = q.hashtags_by_channel?.[ch] || [];
                                  const fc = q.first_comment_suggestions?.[ch] || null;
                                  if (!text) return null;
                                  return (
                                    <div key={ch} className="border border-gray-200 rounded bg-white p-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs uppercase tracking-wide text-gray-500">{ch}</span>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await navigator.clipboard.writeText(
                                                text +
                                                  (tags?.length ? `\n\n${tags.map((t) => (String(t).startsWith('#') ? t : `#${t}`)).join(' ')}` : '')
                                              );
                                            } catch (_) {}
                                          }}
                                          className="text-xs text-blue-600 hover:underline"
                                        >
                                          Copy
                                        </button>
                                      </div>
                                      <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{text}</p>
                                      {Array.isArray(tags) && tags.length > 0 && (
                                        <p className="mt-2 text-xs text-gray-600">{tags.map((t) => (String(t).startsWith('#') ? t : `#${t}`)).join(' ')}</p>
                                      )}
                                      {fc && (
                                        <div className="mt-2">
                                          <p className="text-xs font-medium text-gray-700">First comment (optional)</p>
                                          <p className="text-xs text-gray-700 whitespace-pre-wrap">{fc}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </details>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => act('quote-approve', q.id, { next_stage: 'studio' })}
                          disabled={acting === q.id}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Approve → Studio
                        </button>
                        <button
                          type="button"
                          onClick={() => act('quote-approve', q.id, { next_stage: 'publisher' })}
                          disabled={acting === q.id}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve → Publisher
                        </button>
                        <button type="button" onClick={() => act('quote-hold', q.id)} disabled={acting === q.id} className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50">Hold</button>
                        <button type="button" onClick={() => act('quote-reject', q.id)} disabled={acting === q.id} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50">Reject</button>
                      </div>
                          </>
                        );
                      })()}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {!loading && activeTab === 'held' && (
            <>
              <p className="text-gray-600 text-sm mb-4">
                Held items stay here and do not expire. Bring them back to Pending when you’re ready.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="text-xs text-gray-500">
                  {typeof heldPage.total === 'number' ? `${heldPage.total} held item(s)` : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canHeldPrev}
                    onClick={() => setHeldOffset((x) => Math.max(0, x - pageSize))}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={!canHeldNext}
                    onClick={() => setHeldOffset((x) => x + pageSize)}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
              {heldList.length === 0 ? (
                <p className="text-gray-500">No held items.</p>
              ) : (
                <ul className="space-y-4">
                  {heldList.map((q) => (
                    <li key={q.id} className="border border-gray-200 rounded p-4">
                      {(() => {
                        const crit = buildCritique(q);
                        const trailFrom = safeUrl(q?.scout_discovered_from_url);
                        const watched = safeUrl(q?.scout_watched_source_url);
                        return (
                          <>
                      <div className="mb-2 text-sm text-gray-800">
                        <span className="font-semibold">Source:</span>{' '}
                        <span className="font-medium">
                          {q.source_name || (q.is_internal ? 'Archetype Original' : 'External')}
                        </span>
                        {q.source_title ? <span> — “{q.source_title}”</span> : null}
                        {crit.link ? (
                          <span>
                            {' '}
                            <a className="text-blue-700 hover:underline" href={crit.link} target="_blank" rel="noreferrer">(link)</a>
                          </span>
                        ) : null}
                      </div>
                      {(watched || trailFrom) ? (
                        <div className="mb-2 text-xs text-gray-600">
                          <span className="font-semibold">Scout trail:</span>{' '}
                          {watched ? (
                            <a className="text-blue-700 hover:underline" href={watched} target="_blank" rel="noreferrer">
                              watched source
                            </a>
                          ) : (
                            <span>watched source</span>
                          )}
                          {trailFrom && (!watched || trailFrom !== watched) ? (
                            <>
                              {' '}
                              →{' '}
                              <a className="text-blue-700 hover:underline" href={trailFrom} target="_blank" rel="noreferrer">
                                followed lead
                              </a>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="text-base font-semibold text-gray-900">{q.source_title || q.source_name || 'Held item'}</h3>
                        <Pill tone="gray">held</Pill>
                      </div>
                      {q.pull_quote ? (
                        <blockquote className="border-l-4 border-gray-900 pl-4 py-1 mb-3">
                          <p className="text-gray-900 font-medium whitespace-pre-wrap">{q.pull_quote}</p>
                        </blockquote>
                      ) : (
                        <p className="text-gray-800 mb-3">{q.quote_text?.slice(0, 260)}{q.quote_text?.length > 260 ? '…' : ''}</p>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => act('quote-unhold', q.id)} disabled={acting === q.id} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">Unhold</button>
                        <button
                          type="button"
                          onClick={() => act('quote-approve', q.id, { next_stage: 'studio' })}
                          disabled={acting === q.id}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Approve → Studio
                        </button>
                        <button
                          type="button"
                          onClick={() => act('quote-approve', q.id, { next_stage: 'publisher' })}
                          disabled={acting === q.id}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve → Publisher
                        </button>
                        <button type="button" onClick={() => act('quote-reject', q.id)} disabled={acting === q.id} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50">Reject</button>
                      </div>
                          </>
                        );
                      })()}
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
