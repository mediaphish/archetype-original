import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

function getParam(name) {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  } catch {
    return null;
  }
}

function downloadSvg(filename, svgText) {
  try {
    const blob = new Blob([String(svgText || '')], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'quote-card.svg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (_) {}
}

export default function Writing() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [writing, setWriting] = useState([]);
  const [studioItems, setStudioItems] = useState([]);
  const [unroutedApproved, setUnroutedApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [draftEdits, setDraftEdits] = useState({}); // { [quoteId]: { drafts_by_channel, quote_card_caption } }
  const [savingId, setSavingId] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const openId = useMemo(() => getParam('open'), []);
  const from = useMemo(() => getParam('from'), []);
  const openRef = useRef(null);

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
          const allApproved = qJson.quotes.filter((q) => q && q.status === 'approved');
          const rows = allApproved.filter((q) => String(q.next_stage || '').toLowerCase() === 'studio');
          setStudioItems(rows);
          setUnroutedApproved(allApproved.filter((q) => !String(q.next_stage || '').trim()));
        } else {
          setStudioItems([]);
          setUnroutedApproved([]);
        }
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authChecked, email]);

  useEffect(() => {
    // If we arrived here from Analyst, don't show stale routing errors by default.
    if (from === 'analyst') {
      setRouteError('');
    }
  }, [from]);

  useEffect(() => {
    // If an item is explicitly opened, reduce confusion by clearing routing errors.
    if (openId) {
      setRouteError('');
    }
  }, [openId]);

  const act = useCallback(async (kind, id) => {
    if (!authChecked || acting) return;
    setActing(id);
    setRouteError('');
    setActionMessage('');
    try {
      if (kind === 'send-to-publisher') {
        // If the user has unsaved edits, save them first so Publisher sees the final outputs.
        const payload = draftEdits?.[id] || null;
        if (payload && typeof payload === 'object' && Object.keys(payload).length > 0) {
          const saveRes = await fetch(`/api/ao/quotes/${id}/studio`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const saveJson = await saveRes.json().catch(() => ({}));
          if (!saveRes.ok || !saveJson.ok) {
            setRouteError(saveJson.error || 'Could not save changes before sending to Publisher');
            return;
          }
          if (saveJson.quote) {
            setStudioItems((prev) => prev.map((x) => (x.id === id ? saveJson.quote : x)));
          }
        }

        const res = await fetch(`/api/ao/quotes/${id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ next_stage: 'publisher' }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setRouteError(json.error || 'Could not route item to Publisher');
        } else if (json.ok) {
          setStudioItems((prev) => prev.filter((x) => x.id !== id));
          setUnroutedApproved((prev) => prev.filter((x) => x.id !== id));
          setActionMessage('Sent to Publisher.');
          window.history.pushState({}, '', `/ao/publisher?from=studio&sent=${encodeURIComponent(id)}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
        return;
      }

      if (kind === 'generate-assets') {
        const res = await fetch(`/api/ao/quotes/${id}/studio-assets`, { method: 'POST' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setRouteError(json.error || 'Could not generate drafts');
        } else if (json.quote) {
          setStudioItems((prev) => prev.map((x) => (x.id === id ? json.quote : x)));
          setActionMessage('Drafts updated.');
        }
        return;
      }

      if (kind === 'save-edits') {
        const payload = draftEdits?.[id] || {};
        setSavingId(id);
        const res = await fetch(`/api/ao/quotes/${id}/studio`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setRouteError(json.error || 'Could not save changes');
        } else if (json.quote) {
          setStudioItems((prev) => prev.map((x) => (x.id === id ? json.quote : x)));
          setActionMessage('Saved.');
        }
        return;
      }

      if (kind === 'route-to-studio') {
        const res = await fetch(`/api/ao/quotes/${id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ next_stage: 'studio' }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setRouteError(json.error || 'Could not route item to Studio');
        } else {
          // Move into Studio list immediately
          setUnroutedApproved((prev) => prev.filter((x) => x.id !== id));
          setStudioItems((prev) => [json.quote, ...prev]);
          setRouteError('');
          window.history.pushState({}, '', `/ao/studio?open=${encodeURIComponent(id)}&from=analyst`);
          window.dispatchEvent(new PopStateEvent('popstate'));
          window.scrollTo({ top: 0, behavior: 'instant' });
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
      setSavingId(null);
    }
  }, [authChecked, acting, draftEdits]);

  const pending = writing.filter((w) => w.status === 'pending' || w.status === 'drafting');
  const drafted = writing.filter((w) => w.status === 'drafted');
  const approvedToStudio = studioItems || [];
  const needsRouting = unroutedApproved || [];
  const openRow = useMemo(() => {
    if (!openId) return null;
    return (approvedToStudio || []).find((x) => String(x?.id) === String(openId))
      || (needsRouting || []).find((x) => String(x?.id) === String(openId))
      || null;
  }, [openId, approvedToStudio, needsRouting]);

  useEffect(() => {
    if (!openRow?.id) return;
    let cancelled = false;
    setChatLoading(true);
    setChatError('');
    (async () => {
      try {
        const res = await fetch(`/api/ao/quotes/${openRow.id}/studio-chat`, { method: 'GET' });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setChatError(json.error || 'Could not load Studio chat');
          setChatMessages([]);
        } else {
          const msgs = Array.isArray(json?.session?.messages) ? json.session.messages : [];
          setChatMessages(msgs);
        }
      } catch (_) {
        if (!cancelled) {
          setChatError('Could not load Studio chat');
          setChatMessages([]);
        }
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [openRow?.id]);

  const applyOutputsPatch = useCallback((quoteId, patch) => {
    if (!quoteId || !patch) return;
    setDraftEdits((prev) => {
      const cur = prev?.[quoteId] || {};
      const next = { ...cur };
      if (patch.drafts_by_channel && typeof patch.drafts_by_channel === 'object') {
        next.drafts_by_channel = {
          ...(cur.drafts_by_channel || {}),
          ...patch.drafts_by_channel,
        };
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'quote_card_caption')) {
        next.quote_card_caption = patch.quote_card_caption;
      }
      if (patch.hashtags_by_channel && typeof patch.hashtags_by_channel === 'object') {
        next.hashtags_by_channel = {
          ...(cur.hashtags_by_channel || {}),
          ...patch.hashtags_by_channel,
        };
      }
      if (patch.first_comment_suggestions && typeof patch.first_comment_suggestions === 'object') {
        next.first_comment_suggestions = {
          ...(cur.first_comment_suggestions || {}),
          ...patch.first_comment_suggestions,
        };
      }
      return { ...prev, [quoteId]: next };
    });
    setActionMessage('Applied to outputs (not saved yet).');
  }, []);

  const sendChat = useCallback(async () => {
    if (!openRow?.id) return;
    const message = String(chatInput || '').trim();
    if (!message) return;
    if (!authChecked || chatSending) return;
    setChatSending(true);
    setChatError('');
    try {
      const res = await fetch(`/api/ao/quotes/${openRow.id}/studio-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setChatError(json.error || 'Could not send message');
        return;
      }
      const msgs = Array.isArray(json?.session?.messages) ? json.session.messages : [];
      setChatMessages(msgs);
      setChatInput('');
    } catch (_) {
      setChatError('Could not send message');
    } finally {
      setChatSending(false);
    }
  }, [openRow?.id, chatInput, authChecked, chatSending]);

  useEffect(() => {
    if (!openId) return;
    if (!openRow) return;
    // Scroll the opened item into view once data is present.
    const t = setTimeout(() => {
      try {
        openRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (_) {}
    }, 50);
    return () => clearTimeout(t);
  }, [openId, openRow]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="studio" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Studio</h1>
        <p className="text-gray-600 mb-8">Finish work here: drafts, edits, and assets before sending to Publisher.</p>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleNavigate('/ao/analyst')}
              className="px-3 py-1.5 border border-gray-300 bg-white text-sm rounded hover:bg-gray-50"
            >
              Back to Analyst
            </button>
            <button
              type="button"
              onClick={() => {
                const next = window.prompt('Paste the item ID you want to open in Studio', openId || '');
                if (!next) return;
                const trimmed = String(next).trim();
                if (!trimmed) return;
                window.history.pushState({}, '', `/ao/studio?open=${encodeURIComponent(trimmed)}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="px-3 py-1.5 border border-gray-300 bg-white text-sm rounded hover:bg-gray-50"
            >
              Open a different item
            </button>
          </div>
          <div className="text-xs text-gray-500">
            {openId ? <>Opened item: <span className="font-mono">{String(openId).slice(0, 8)}…</span></> : 'No item opened'}
          </div>
        </div>

        {actionMessage ? (
          <div className="mb-4 p-3 rounded border border-green-200 bg-green-50 text-green-800 text-sm">{actionMessage}</div>
        ) : null}
        {routeError ? (
          <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">{routeError}</div>
        ) : null}

        {loading ? (
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <LoadingSpinner />
          </section>
        ) : !openId ? (
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Nothing to work on yet</h2>
            <p className="text-sm text-gray-600">
              Go to Analyst, pick an item, and use “Approve → Studio.” Studio is built for one item at a time.
            </p>
          </section>
        ) : !openRow ? (
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Could not find that item</h2>
            <p className="text-sm text-gray-600">
              It may not be approved yet, or it may have been routed elsewhere. Go back to Analyst and try approving again.
            </p>
          </section>
        ) : (
          <section ref={openRef} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  {openRow.source_name || (openRow.is_internal ? 'Archetype Original' : 'External')}
                  {openRow.source_title ? <span className="font-normal text-gray-700"> — “{openRow.source_title}”</span> : null}
                </div>
                {openRow.pull_quote ? (
                  <blockquote className="border-l-4 border-gray-900 pl-4 py-1 mt-3">
                    <p className="text-gray-900 font-medium whitespace-pre-wrap">{openRow.pull_quote}</p>
                  </blockquote>
                ) : (
                  <p className="text-gray-800 mt-3 whitespace-pre-wrap">{String(openRow.quote_text || '').slice(0, 500)}{String(openRow.quote_text || '').length > 500 ? '…' : ''}</p>
                )}
                {openRow.why_it_matters ? (
                  <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{openRow.why_it_matters}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!String(openRow.next_stage || '').trim() ? (
                  <button
                    type="button"
                    onClick={() => act('route-to-studio', openRow.id)}
                    disabled={acting === openRow.id}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Route to Studio
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => act('generate-assets', openRow.id)}
                  disabled={acting === openRow.id}
                  className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  {acting === openRow.id ? 'Working…' : 'Generate drafts + quote card'}
                </button>
                <button
                  type="button"
                  onClick={() => act('save-edits', openRow.id)}
                  disabled={acting === openRow.id || savingId === openRow.id}
                  className="px-3 py-1.5 border border-gray-300 bg-white text-sm rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  {savingId === openRow.id ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => act('send-to-publisher', openRow.id)}
                  disabled={acting === openRow.id}
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
            </div>

            <div className="mt-4 border border-gray-200 rounded-lg bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Truth panel</div>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Source link</div>
                  {openRow.source_url ? (
                    <a className="text-blue-700 hover:underline break-all" href={openRow.source_url} target="_blank" rel="noreferrer">
                      {openRow.source_url}
                    </a>
                  ) : (
                    <div className="text-gray-600">No link</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500">Lane / tags</div>
                  <div className="text-gray-800">
                    {[openRow.ao_lane, ...(Array.isArray(openRow.topic_tags) ? openRow.topic_tags : [])].filter(Boolean).slice(0, 6).join(' • ') || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Recommended move</div>
                  <div className="text-gray-800">{openRow.best_move || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Risk flags</div>
                  <div className="text-gray-800">{Array.isArray(openRow.risk_flags) && openRow.risk_flags.length ? openRow.risk_flags.slice(0, 6).join(' • ') : '—'}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5 border border-gray-200 rounded-lg bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-gray-900">Studio chat</div>
                  <button
                    type="button"
                    onClick={() => act('generate-assets', openRow.id)}
                    disabled={acting === openRow.id}
                    className="px-2.5 py-1 border border-gray-300 bg-white text-xs rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Regenerate drafts
                  </button>
                </div>
                {chatError ? (
                  <div className="mt-3 p-2 rounded border border-red-200 bg-red-50 text-red-800 text-sm">{chatError}</div>
                ) : null}
                <div className="mt-3 border border-gray-200 rounded bg-gray-50 p-3 h-[420px] overflow-y-auto">
                  {chatLoading ? (
                    <div className="text-sm text-gray-600">Loading chat…</div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-sm text-gray-600">
                      Ask Studio to rewrite a draft, change the angle, or propose a caption. If it suggests changes, you can apply them to the outputs on the right.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chatMessages.map((m, idx) => {
                        const isAssistant = String(m?.role) === 'assistant';
                        const patch = m?.outputs_patch;
                        return (
                          <div key={m?.at || idx} className={isAssistant ? '' : 'text-right'}>
                            <div className={`inline-block max-w-[92%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${isAssistant ? 'bg-white border border-gray-200 text-gray-900' : 'bg-gray-900 text-white'}`}>
                              {String(m?.content || '')}
                            </div>
                            {isAssistant && patch ? (
                              <div className="mt-1">
                                <button
                                  type="button"
                                  onClick={() => applyOutputsPatch(openRow.id, patch)}
                                  className="px-2.5 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50"
                                >
                                  Apply to outputs
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    placeholder="Ask Studio to improve the drafts, caption, or angle…"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-500">Nothing is saved until you click “Save changes”.</div>
                    <button
                      type="button"
                      onClick={sendChat}
                      disabled={chatSending || !String(chatInput || '').trim()}
                      className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50"
                    >
                      {chatSending ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-6">
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Quote card</div>
                  {openRow.quote_card_svg ? (
                    <>
                      <div className="border border-gray-200 rounded bg-white p-2 overflow-auto">
                        <div dangerouslySetInnerHTML={{ __html: openRow.quote_card_svg }} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => downloadSvg(`ao-quote-card-${openRow.id}.svg`, openRow.quote_card_svg)}
                          className="px-3 py-1.5 border border-gray-300 bg-white text-sm rounded hover:bg-gray-50"
                        >
                          Download SVG
                        </button>
                      </div>
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Quote card caption (optional)</label>
                        <textarea
                          value={draftEdits?.[openRow.id]?.quote_card_caption ?? openRow.quote_card_caption ?? ''}
                          onChange={(e) => setDraftEdits((prev) => ({
                            ...prev,
                            [openRow.id]: { ...(prev[openRow.id] || {}), quote_card_caption: e.target.value },
                          }))}
                          rows={3}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                          placeholder="Caption used with the quote card…"
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">No quote card yet. Use “Generate drafts + quote card”.</p>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Drafts by channel</div>
                  {openRow.drafts_by_channel ? (
                    <div className="grid gap-3">
                      {['linkedin', 'facebook', 'instagram', 'x'].map((ch) => {
                        const existing = openRow.drafts_by_channel?.[ch] || '';
                        const text = draftEdits?.[openRow.id]?.drafts_by_channel?.[ch] ?? existing;
                        return (
                          <div key={ch} className="border border-gray-200 rounded bg-white p-3">
                            <div className="text-xs uppercase tracking-wide text-gray-500">{ch}</div>
                            <textarea
                              value={text}
                              onChange={(e) => setDraftEdits((prev) => ({
                                ...prev,
                                [openRow.id]: {
                                  ...(prev[openRow.id] || {}),
                                  drafts_by_channel: {
                                    ...((prev[openRow.id] || {}).drafts_by_channel || openRow.drafts_by_channel || {}),
                                    [ch]: e.target.value,
                                  },
                                },
                              }))}
                              rows={4}
                              className="mt-2 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              placeholder="Draft text…"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No drafts yet. Use “Generate drafts + quote card”.</p>
                  )}
                </div>
              </div>
            </div>

            <details className="mt-6 border border-gray-200 rounded-lg bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-gray-900">Other queues (optional)</summary>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div className="border border-gray-200 rounded p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Drafting queue</h3>
                  {pending.length === 0 ? (
                    <p className="text-gray-500 text-sm">No items right now.</p>
                  ) : (
                    <ul className="space-y-3">
                      {pending.slice(0, 6).map((w) => (
                        <li key={w.id} className="border border-gray-200 rounded p-3">
                          <div className="font-medium text-gray-900 text-sm">{w.title || 'Untitled'}</div>
                          <div className="text-gray-600 text-xs mt-1">{String(w.angle || w.source_notes || '').slice(0, 140)}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="border border-gray-200 rounded p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Ready for site</h3>
                  {drafted.length === 0 ? (
                    <p className="text-gray-500 text-sm">No drafted content yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {drafted.slice(0, 6).map((w) => (
                        <li key={w.id} className="border border-gray-200 rounded p-3">
                          <div className="font-medium text-gray-900 text-sm">{w.title || 'Untitled'}</div>
                          <div className="text-gray-600 text-xs mt-1">{String(w.draft_content || '').slice(0, 140)}{String(w.draft_content || '').length > 140 ? '…' : ''}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </details>
          </section>
        )}
      </main>
    </div>
  );
}
