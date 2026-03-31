import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';
import TinyMarkdownEditor from '../../components/ao/TinyMarkdownEditor';

function fmtDate(iso) {
  try {
    return iso ? new Date(iso).toLocaleString() : '—';
  } catch {
    return '—';
  }
}

function StatusPill({ status }) {
  const s = String(status || '').toLowerCase();
  const map = {
    new: 'bg-gray-100 text-gray-700 border-gray-200',
    brief_ready: 'bg-blue-50 text-blue-700 border-blue-200',
    held: 'bg-amber-50 text-amber-800 border-amber-200',
    archived: 'bg-gray-50 text-gray-500 border-gray-200',
  };
  const labelMap = {
    new: 'New',
    brief_ready: 'Brief ready',
    held: 'Held',
    archived: 'Archived',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[s] || map.new}`}>
      {labelMap[s] || status || 'New'}
    </span>
  );
}

function safePreview(text) {
  const t = String(text || '').trim();
  if (!t) return '—';
  const oneLine = t.replace(/\s+/g, ' ').trim();
  return oneLine.length > 120 ? `${oneLine.slice(0, 120)}…` : oneLine;
}

function looksUrl(v) {
  const s = String(v || '').trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function Ideas() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  const [activePathTab, setActivePathTab] = useState('idea_seed'); // idea_seed | ready_post

  const [statusFilter, setStatusFilter] = useState('active'); // active | held | archived | all
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [offset, setOffset] = useState(0);

  const [loadingList, setLoadingList] = useState(true);
  const [ideas, setIdeas] = useState([]);
  const [page, setPage] = useState({ status: 'active', limit: 10, offset: 0, total: null });
  const [selectedId, setSelectedId] = useState(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [lastWhatIsMissing, setLastWhatIsMissing] = useState([]);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Workroom (chat) for Library ideas — stored locally (per device) for MVP.
  const [workroomOpen, setWorkroomOpen] = useState(false);
  const [workroomId, setWorkroomId] = useState(null);
  const [workroomTitle, setWorkroomTitle] = useState('');
  const [workroomMessages, setWorkroomMessages] = useState([]);
  const [workroomInput, setWorkroomInput] = useState('');
  const [workroomSending, setWorkroomSending] = useState(false);
  const [workroomError, setWorkroomError] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newRaw, setNewRaw] = useState('');
  const [creating, setCreating] = useState(false);
  const [resurfaceLoading, setResurfaceLoading] = useState(false);
  const [resurfaced, setResurfaced] = useState([]);
  const [dupeLoading, setDupeLoading] = useState(false);
  const [possibleDupes, setPossibleDupes] = useState([]);

  const [readyTitle, setReadyTitle] = useState('');
  const [readyMarkdown, setReadyMarkdown] = useState('');
  const [readyTargetSite, setReadyTargetSite] = useState(true);
  const [readyTargetSocial, setReadyTargetSocial] = useState(true);
  const [readyChannels, setReadyChannels] = useState({ linkedin: true, facebook: true, instagram: true, x: true });
  const [readyFeatured, setReadyFeatured] = useState(null); // { filename, mime_type, content_base64 }
  const readyMdFileRef = useRef(null);
  const readyImageFileRef = useRef(null);
  const selectedIdRef = useRef(null);
  const [savedBundles, setSavedBundles] = useState([]);
  const [guardrails, setGuardrails] = useState([]);

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const workroomStorageKey = useCallback((id) => {
    const i = String(id || '').trim();
    return `ao_workroom_v1:idea:${i}`;
  }, []);

  const saveWorkroomMessages = useCallback((id, messages) => {
    try {
      const key = workroomStorageKey(id);
      window.localStorage.setItem(key, JSON.stringify({ v: 1, messages }));
    } catch (_) {}
  }, [workroomStorageKey]);

  const seedWorkroomFromIdea = useCallback((idea) => {
    const title = String(idea?.title || '').trim() || safePreview(idea?.raw_input);
    const why = String(idea?.why_it_matters || '').trim();
    const angles = Array.isArray(idea?.angles) ? idea.angles : [];
    const lines = [];
    lines.push(`Let’s talk this out: ${title}`);
    if (why) {
      lines.push('');
      lines.push(`Why it matters (brief): ${why}`);
    }
    if (angles.length) {
      lines.push('');
      lines.push('Here are a few ways to approach it:');
      lines.push('');
      angles.slice(0, 5).forEach((a, idx) => {
        const bullets = Array.isArray(a?.bullets) ? a.bullets : [];
        lines.push(`${idx + 1}) ${String(a?.title || 'Angle').trim()}`);
        bullets.slice(0, 6).forEach((b) => lines.push(`- ${String(b || '').trim()}`));
        lines.push('');
      });
      lines.push('Reply with which one you want (for example: “Let’s do 1 and 3”).');
    } else {
      lines.push('');
      lines.push('Tell me what you want to build from this (quote card, short post, long-form seed, etc.).');
    }
    return lines.join('\n').trim();
  }, []);

  const openWorkroomForIdea = useCallback((idea) => {
    const id = idea?.id;
    if (!id) return;
    setWorkroomId(id);
    setWorkroomTitle(idea?.title || 'Idea');
    setWorkroomError('');
    setWorkroomInput('');
    try {
      const raw = window.localStorage.getItem(workroomStorageKey(id));
      const parsed = raw ? JSON.parse(raw) : null;
      const existing = Array.isArray(parsed?.messages) ? parsed.messages : [];
      if (existing.length) {
        setWorkroomMessages(existing);
      } else {
        const seed = seedWorkroomFromIdea(idea);
        setWorkroomMessages(seed ? [{ role: 'assistant', at: new Date().toISOString(), content: seed }] : []);
      }
    } catch {
      const seed = seedWorkroomFromIdea(idea);
      setWorkroomMessages(seed ? [{ role: 'assistant', at: new Date().toISOString(), content: seed }] : []);
    }
    setWorkroomOpen(true);
  }, [workroomStorageKey, seedWorkroomFromIdea]);

  const sendWorkroom = useCallback(async () => {
    if (!authChecked) return;
    if (!workroomOpen || !workroomId) return;
    const text = String(workroomInput || '').trim();
    if (!text) return;
    if (workroomSending) return;
    setWorkroomSending(true);
    setWorkroomError('');
    const nextMessages = [
      ...(Array.isArray(workroomMessages) ? workroomMessages : []),
      { role: 'user', at: new Date().toISOString(), content: text },
    ];
    setWorkroomMessages(nextMessages);
    saveWorkroomMessages(workroomId, nextMessages);
    setWorkroomInput('');
    try {
      const res = await fetch('/api/ao/analyst/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_kind: 'idea',
          thread_id: workroomId,
          messages: nextMessages.slice(-12),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not get Analyst reply');
      const assistant = {
        role: 'assistant',
        at: new Date().toISOString(),
        content: String(json.assistant_message || '').trim(),
        suggestions: Array.isArray(json.suggestions) ? json.suggestions : [],
      };
      const after = [...nextMessages, assistant];
      setWorkroomMessages(after);
      saveWorkroomMessages(workroomId, after);
    } catch (e) {
      setWorkroomError(e.message || 'Could not send message');
    } finally {
      setWorkroomSending(false);
    }
  }, [authChecked, workroomOpen, workroomId, workroomInput, workroomSending, workroomMessages, saveWorkroomMessages]);

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
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const fetchResurface = useCallback(async () => {
    if (!authChecked) return;
    setResurfaceLoading(true);
    try {
      const res = await fetch('/api/ao/ideas/resurface?count=3');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) setResurfaced(Array.isArray(json.ideas) ? json.ideas : []);
      else setResurfaced([]);
    } catch (_) {
      setResurfaced([]);
    } finally {
      setResurfaceLoading(false);
    }
  }, [authChecked]);

  useEffect(() => {
    fetchResurface();
  }, [fetchResurface]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    (async () => {
      try {
        const [bundlesRes, guardrailsRes] = await Promise.all([
          fetch('/api/ao/auto/bundles'),
          fetch('/api/ao/auto/guardrails'),
        ]);
        const bundlesJson = await bundlesRes.json().catch(() => ({}));
        const guardrailsJson = await guardrailsRes.json().catch(() => ({}));
        if (!cancelled && bundlesRes.ok && bundlesJson.ok) {
          setSavedBundles(Array.isArray(bundlesJson.bundles) ? bundlesJson.bundles : []);
        }
        if (!cancelled && guardrailsRes.ok && guardrailsJson.ok) {
          setGuardrails(Array.isArray(guardrailsJson.guardrails) ? guardrailsJson.guardrails : []);
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [authChecked]);

  const canNext = useMemo(() => {
    const total = page?.total;
    if (typeof total !== 'number') return false;
    return offset + pageSize < total;
  }, [page, offset, pageSize]);

  const fetchList = useCallback(async ({ keepSelection } = {}) => {
    if (!authChecked) return;
    setLoadingList(true);
    setError('');
    setMessage('');
    try {
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      params.set('path', activePathTab);
      params.set('limit', String(pageSize));
      params.set('offset', String(offset));
      if (query.trim()) params.set('q', query.trim());
      const res = await fetch(`/api/ao/ideas?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to load ideas');
      setIdeas(json.ideas || []);
      setPage(json.page || { status: statusFilter, limit: pageSize, offset, total: null });

      if (!keepSelection) {
        setSelectedId(null);
        setDetail(null);
      } else if (selectedIdRef.current && !(json.ideas || []).some((i) => i.id === selectedIdRef.current)) {
        setSelectedId(null);
        setDetail(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingList(false);
    }
  }, [authChecked, statusFilter, pageSize, offset, query]);

  const fetchDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/ao/ideas/${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to load idea');
      setDetail(json.idea || null);
      setLastWhatIsMissing([]);
    } catch (e) {
      setError(e.message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const onSelect = useCallback(async (idea) => {
    setSelectedId(idea?.id || null);
    setDetail(null);
    if (idea?.id) await fetchDetail(idea.id);
  }, [fetchDetail]);

  const createIdea = useCallback(async () => {
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const body = {
        title: newTitle.trim() ? newTitle.trim() : null,
        raw_input: newRaw,
        source_url: looksUrl(newSourceUrl) ? newSourceUrl.trim() : null,
        path: 'idea_seed',
      };
      const res = await fetch('/api/ao/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to save idea');
      const newId = json.idea?.id || null;

      setNewTitle('');
      setNewSourceUrl('');
      setNewRaw('');
      setOffset(0);
      if (newId) {
        setSelectedId(newId);
        setDetail(null);
        setMessage('Saved. Preparing the brief in the background…');
        await fetchList({ keepSelection: true });
        await fetchDetail(newId);

        // Auto-shape in the background (no extra clicks).
        void (async () => {
          try {
            const res2 = await fetch(`/api/ao/ideas/${encodeURIComponent(newId)}/shape-brief`, { method: 'POST' });
            const json2 = await res2.json().catch(() => ({}));
            if (res2.ok && json2.ok && json2.idea?.id) {
              setDetail(json2.idea);
              setMessage('Brief ready.');
              await fetchList({ keepSelection: true });
            }
          } catch (_) {}
        })();
      } else {
        setMessage('Saved.');
        await fetchList({ keepSelection: false });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }, [newTitle, newRaw, newSourceUrl, fetchList, fetchDetail]);

  useEffect(() => {
    if (!authChecked) return;
    const q = [newTitle, newRaw].join(' ').trim();
    if (q.length < 18) {
      setPossibleDupes([]);
      return;
    }
    let cancelled = false;
    setDupeLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set('status', 'all');
        params.set('path', 'all');
        params.set('limit', '5');
        params.set('offset', '0');
        params.set('q', q.slice(0, 120));
        const res = await fetch(`/api/ao/ideas?${params.toString()}`);
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && json.ok) {
          const rows = (json.ideas || []).filter((x) => x && x.id).slice(0, 4);
          setPossibleDupes(rows);
        } else {
          setPossibleDupes([]);
        }
      } catch (_) {
        if (!cancelled) setPossibleDupes([]);
      } finally {
        if (!cancelled) setDupeLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [authChecked, newTitle, newRaw]);

  const createReadyPost = useCallback(async () => {
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const channels = Object.entries(readyChannels).filter(([, v]) => !!v).map(([k]) => k);
      const body = {
        path: 'ready_post',
        title: readyTitle.trim() ? readyTitle.trim() : null,
        raw_input: readyMarkdown,
        markdown_content: readyMarkdown,
        ready_target_site: !!readyTargetSite,
        ready_target_social: !!readyTargetSocial,
        ready_social_channels: channels,
        featured_image: readyFeatured,
      };
      const res = await fetch('/api/ao/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to save Ready Post');
      setReadyTitle('');
      setReadyMarkdown('');
      setReadyFeatured(null);
      setMessage('Saved. Select it in the list to generate social drafts or send to Import.');
      setOffset(0);
      await fetchList({ keepSelection: false });
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }, [readyTitle, readyMarkdown, readyTargetSite, readyTargetSocial, readyChannels, readyFeatured, fetchList]);

  const act = useCallback(async (action, extraBody) => {
    if (!detail?.id) return;
    setActing(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/ao/ideas/${encodeURIComponent(detail.id)}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: extraBody ? JSON.stringify(extraBody) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Action failed');
      setDetail(json.idea || null);
      if (action === 'shape-brief') setLastWhatIsMissing(json.meta?.what_is_missing || []);
      if (action === 'send-to-import') {
        setMessage('Sent to Import. Open Import to publish it to the site.');
      } else if (action === 'generate-social-drafts') {
        setMessage('Social drafts generated. Open Publisher to schedule them.');
      } else {
        setMessage(action === 'shape-brief' ? 'Brief created.' : 'Done.');
      }
      await fetchList({ keepSelection: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  }, [detail, fetchList]);

  const holdOrUnhold = useCallback(async () => {
    if (!detail?.id) return;
    if (detail.status === 'held') {
      await act('unhold');
      return;
    }
    const reason = window.prompt('Why are you holding this? (required)', detail.hold_reason || '');
    if (reason == null) return;
    if (!String(reason).trim()) {
      window.alert('Hold reason is required.');
      return;
    }
    await act('hold', { reason: String(reason).trim().slice(0, 300) });
  }, [detail, act]);

  const archive = useCallback(async () => {
    if (!detail?.id) return;
    const ok = window.confirm('Archive this idea? You can still find it later under Archived.');
    if (!ok) return;
    await act('archive');
  }, [detail, act]);

  const hasBrief = !!(detail?.why_it_matters || detail?.angles || detail?.recommended_next_step);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <LoadingSpinner message="Checking sign-in…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="library" email={email} onNavigate={handleNavigate} />

      <main className="container mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Memory</h1>
            <p className="text-sm text-gray-600 mt-1">
              Saved bundles, learned guardrails, and older material live here. New work should start in Auto.
            </p>
          </div>

          {message ? (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">{message}</div>
          ) : null}
          {error ? (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">{error}</div>
          ) : null}

          <section className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Saved bundles</h2>
                    <p className="text-xs text-gray-600 mt-1">Auto’s ready-to-publish packets.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavigate('/ao/analyst')}
                    className="px-3 py-1.5 border border-gray-300 bg-white text-sm rounded hover:bg-gray-50"
                  >
                    Open Auto
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {savedBundles.length === 0 ? (
                    <p className="text-sm text-gray-500">No saved bundles yet.</p>
                  ) : savedBundles.slice(0, 6).map((b) => (
                    <div key={b.id} className="border border-gray-200 rounded p-3">
                      <div className="text-sm font-semibold text-gray-900">{b.title || 'Untitled bundle'}</div>
                      <div className="text-xs text-gray-500 mt-1">{b.series_name || 'No series'}</div>
                      <div className="text-sm text-gray-700 mt-2">{safePreview(b.summary)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Guardrails</h2>
                  <p className="text-xs text-gray-600 mt-1">What Auto has learned to do or avoid.</p>
                </div>
                <div className="mt-3 space-y-2">
                  {guardrails.length === 0 ? (
                    <p className="text-sm text-gray-500">No learned guardrails yet.</p>
                  ) : guardrails.slice(0, 8).map((g) => (
                    <div key={g.id} className="border border-gray-200 rounded p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-gray-900">{g.title || 'Learned guardrail'}</div>
                        <StatusPill status={g.enabled ? 'brief_ready' : 'archived'} />
                      </div>
                      <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{g.rule_text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Resurface (old gold)</h2>
                <p className="text-xs text-gray-600 mt-1">A few older items worth revisiting.</p>
              </div>
              <button
                type="button"
                onClick={fetchResurface}
                disabled={resurfaceLoading}
                className="px-3 py-1.5 border border-gray-300 bg-white text-sm rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {resurfaceLoading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            {resurfaceLoading ? (
              <div className="mt-3"><LoadingSpinner message="Loading…" /></div>
            ) : resurfaced.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">Nothing to resurface yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {resurfaced.map((x) => (
                  <li key={x.id} className="flex items-start justify-between gap-3 border border-gray-200 rounded p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{fmtDate(x.created_at)}</span>
                        <StatusPill status={x.status} />
                      </div>
                      <div className="text-sm font-medium text-gray-900 truncate">{x.title || safePreview(x.raw_input)}</div>
                      {x.hold_reason ? <div className="text-xs text-gray-600 mt-1">Held because: {safePreview(x.hold_reason)}</div> : null}
                      {Array.isArray(x.anchors) && x.anchors.length ? (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500">Closest AO anchors:</div>
                          <ul className="mt-1 space-y-1">
                            {x.anchors.slice(0, 2).map((a, idx) => (
                              <li key={idx} className="text-xs text-gray-700">
                                {a.url ? (
                                  <a className="text-blue-700 hover:underline" href={a.url} target="_blank" rel="noreferrer">
                                    {a.title || 'AO post'}
                                  </a>
                                ) : (
                                  <span>{a.title || 'AO post'}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelect(x)}
                      className="shrink-0 text-blue-600 hover:underline text-sm"
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Direct entry</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setActivePathTab('idea_seed'); setOffset(0); }}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${activePathTab === 'idea_seed' ? 'bg-gray-900 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                >
                  Idea Seeds
                </button>
                <button
                  type="button"
                  onClick={() => { setActivePathTab('ready_post'); setOffset(0); }}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${activePathTab === 'ready_post' ? 'bg-gray-900 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                >
                  Ready Posts
                </button>
              </div>
            </div>

            {activePathTab === 'idea_seed' ? (
              <div>
                <div className="mb-3 text-xs text-gray-500">
                  Auto is the preferred entry point now. This section remains here for direct/manual work when needed.
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Short label you’ll recognize"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source link (optional)</label>
                    <input
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://…"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your idea</label>
                  <textarea
                    value={newRaw}
                    onChange={(e) => setNewRaw(e.target.value)}
                    rows={6}
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="One line, bullets, or a full draft. Anything works."
                  />
                  <div className="mt-2">
                    <div className="text-xs font-medium text-gray-700">Possible duplicates</div>
                    {dupeLoading ? (
                      <div className="text-xs text-gray-500 mt-1">Checking…</div>
                    ) : possibleDupes.length === 0 ? (
                      <div className="text-xs text-gray-500 mt-1">None found.</div>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {possibleDupes.map((x) => (
                          <li key={x.id} className="text-xs text-gray-700 flex items-center justify-between gap-2">
                            <span className="truncate">{x.title || safePreview(x.raw_input)}</span>
                            <button type="button" onClick={() => onSelect(x)} className="text-blue-600 hover:underline shrink-0">Open</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={creating || newRaw.trim().length < 5}
                    onClick={createIdea}
                    className="px-4 py-2 bg-gray-900 text-white font-semibold rounded hover:bg-gray-800 disabled:opacity-50"
                  >
                    {creating ? 'Saving…' : 'Save idea'}
                  </button>
                  <span className="text-xs text-gray-500">Nothing gets posted automatically.</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-3 text-xs text-gray-500">
                  Auto can create ready posts for you in chat. This direct path is still available if you want it.
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                    <input
                      value={readyTitle}
                      onChange={(e) => setReadyTitle(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Short label you’ll recognize"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Targets</label>
                    <div className="flex flex-col gap-2 mt-1">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={readyTargetSite} onChange={(e) => setReadyTargetSite(e.target.checked)} />
                        Website (sends to Import)
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={readyTargetSocial} onChange={(e) => setReadyTargetSocial(e.target.checked)} />
                        Social (creates drafts)
                      </label>
                    </div>
                  </div>
                </div>

                {readyTargetSocial ? (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-gray-700 mb-1">Social channels (default all)</div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                      {['linkedin', 'facebook', 'instagram', 'x'].map((k) => (
                        <label key={k} className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!readyChannels[k]}
                            onChange={(e) => setReadyChannels((p) => ({ ...p, [k]: e.target.checked }))}
                          />
                          {k}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Post</label>
                  <TinyMarkdownEditor
                    value={readyMarkdown}
                    onChange={setReadyMarkdown}
                    placeholder="Paste your finished post. You can format it here."
                    onUploadMarkdown={() => readyMdFileRef.current?.click()}
                    enableSectionLocks
                  />
                  <input
                    ref={readyMdFileRef}
                    type="file"
                    accept=".md,text/markdown"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const text = await f.text();
                      setReadyMarkdown(text);
                      e.target.value = '';
                    }}
                  />
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-sm font-medium text-gray-700">Featured image (optional)</label>
                    <button
                      type="button"
                      onClick={() => readyImageFileRef.current?.click()}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Choose image
                    </button>
                  </div>
                  {readyFeatured ? (
                    <div className="mt-2 text-sm text-gray-700">
                      Selected: <span className="font-semibold">{readyFeatured.filename}</span>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-500">One image only (used as the post’s featured image).</div>
                  )}
                  <input
                    ref={readyImageFileRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const buf = await f.arrayBuffer();
                      const bytes = new Uint8Array(buf);
                      let binary = '';
                      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                      const content_base64 = btoa(binary);
                      setReadyFeatured({ filename: f.name, mime_type: f.type || 'image/jpeg', content_base64 });
                      e.target.value = '';
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={creating || readyMarkdown.trim().length < 20}
                    onClick={createReadyPost}
                    className="px-4 py-2 bg-gray-900 text-white font-semibold rounded hover:bg-gray-800 disabled:opacity-50"
                  >
                    {creating ? 'Saving…' : 'Save ready post'}
                  </button>
                  <span className="text-xs text-gray-500">It won’t publish automatically.</span>
                </div>
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className={`bg-white border border-gray-200 rounded-lg p-4 ${selectedId ? 'hidden lg:block' : ''}`}>
              <div className="flex flex-wrap items-end gap-3 mb-4">
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    value={query}
                    onChange={(e) => { setOffset(0); setQuery(e.target.value); }}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Find by title or text…"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setOffset(0); setStatusFilter(e.target.value); }}
                    className="p-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="held">Held</option>
                    <option value="archived">Archived</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Page size</label>
                  <select
                    value={pageSize}
                    onChange={(e) => { setOffset(0); setPageSize(Number(e.target.value)); }}
                    className="p-2 border border-gray-300 rounded bg-white"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => fetchList({ keepSelection: true })}
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                >
                  Refresh
                </button>
              </div>

              {loadingList ? (
                <div className="py-10">
                  <LoadingSpinner message="Loading ideas…" />
                </div>
              ) : ideas.length === 0 ? (
                <div className="text-sm text-gray-600 py-8">
                  No ideas yet for this view.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {ideas.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => onSelect(i)}
                      className={`w-full text-left px-2 py-3 rounded hover:bg-gray-50 ${selectedId === i.id ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {i.title ? i.title : safePreview(i.raw_input)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {fmtDate(i.created_at)}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <StatusPill status={i.status} />
                        </div>
                      </div>
                      {i.suggested_ao_lane || (i.suggested_topic_tags || []).length ? (
                        <div className="text-xs text-gray-600 mt-1">
                          {i.suggested_ao_lane ? <span className="font-semibold">{i.suggested_ao_lane}</span> : null}
                          {i.suggested_ao_lane && (i.suggested_topic_tags || []).length ? <span> • </span> : null}
                          {(i.suggested_topic_tags || []).slice(0, 5).map((t) => (
                            <span key={t} className="mr-2">#{t}</span>
                          ))}
                        </div>
                      ) : null}
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {safePreview(i.raw_input)}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  disabled={offset <= 0}
                  onClick={() => setOffset((o) => Math.max(0, o - pageSize))}
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="text-xs text-gray-500">
                  {typeof page?.total === 'number'
                    ? `Showing ${offset + 1}–${Math.min(offset + pageSize, page.total)} of ${page.total}`
                    : `Offset ${offset}`}
                </div>
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={() => setOffset((o) => o + pageSize)}
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </section>

            <section className={`bg-white border border-gray-200 rounded-lg p-4 ${!selectedId ? 'hidden lg:block' : ''}`}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Idea detail</h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setDetail(null);
                    setMessage('');
                    setError('');
                  }}
                  className="lg:hidden min-h-[44px] px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                >
                  Back to list
                </button>
              </div>
              {!selectedId ? (
                <div className="text-sm text-gray-600 py-8">Select an idea on the left.</div>
              ) : detailLoading ? (
                <div className="py-10">
                  <LoadingSpinner message="Loading idea…" />
                </div>
              ) : !detail ? (
                <div className="text-sm text-gray-600 py-8">Could not load this idea.</div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xl font-bold text-gray-900">
                        {detail.title ? detail.title : safePreview(detail.raw_input)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Created {fmtDate(detail.created_at)} • <StatusPill status={detail.status} />
                      </div>
                    </div>
                  </div>

                  {detail.source_url ? (
                    <div className="mt-3">
                      <a
                        className="text-sm text-blue-700 hover:underline break-all"
                        href={detail.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {detail.source_url}
                      </a>
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <div className="text-sm font-semibold text-gray-900 mb-1">Raw input</div>
                    <pre className="text-sm whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded p-3 text-gray-800">
                      {detail.raw_input}
                    </pre>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => openWorkroomForIdea(detail)}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Discuss
                    </button>
                    {detail.path === 'ready_post' ? (
                      <>
                        <button
                          type="button"
                          disabled={acting}
                          onClick={() => act('generate-social-drafts')}
                          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {acting ? 'Working…' : 'Generate social drafts'}
                        </button>
                        <button
                          type="button"
                          disabled={acting || !detail.ready_target_site}
                          onClick={() => act('send-to-import')}
                          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                          Send to Import
                        </button>
                      </>
                    ) : (
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => act('shape-brief')}
                      className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {acting ? 'Working…' : (hasBrief ? 'Re-shape brief' : 'Shape into brief')}
                    </button>
                    )}
                    <button
                      type="button"
                      disabled={acting}
                      onClick={holdOrUnhold}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      {detail.status === 'held' ? 'Unhold' : 'Hold'}
                    </button>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={archive}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Archive
                    </button>
                  </div>

                  {detail.status === 'held' ? (
                    <div className="mt-3 text-xs text-gray-600">
                      Held {detail.held_at ? `at ${fmtDate(detail.held_at)}` : ''}{detail.hold_reason ? ` — ${detail.hold_reason}` : ''}.
                    </div>
                  ) : null}

                  {hasBrief ? (
                    <div className="mt-6">
                      <div className="text-sm font-semibold text-gray-900 mb-2">Brief</div>

                      <div className="grid gap-3">
                        {lastWhatIsMissing.length ? (
                          <div className="p-3 border border-amber-200 rounded bg-amber-50">
                            <div className="text-xs font-semibold text-amber-900 mb-1">What’s missing (so this doesn’t turn into fluff)</div>
                            <ul className="list-disc pl-5 text-sm text-amber-900">
                              {lastWhatIsMissing.map((x, idx) => (
                                <li key={idx}>{x}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        <div className="p-3 border border-gray-200 rounded bg-white">
                          <div className="text-xs font-semibold text-gray-600 mb-1">What this is</div>
                          <div className="text-sm text-gray-900">
                            {detail.suggested_content_kind || '—'}
                          </div>
                        </div>

                        <div className="p-3 border border-gray-200 rounded bg-white">
                          <div className="text-xs font-semibold text-gray-600 mb-1">Suggested lane</div>
                          <div className="text-sm text-gray-900">{detail.suggested_ao_lane || '—'}</div>
                        </div>

                        <div className="p-3 border border-gray-200 rounded bg-white">
                          <div className="text-xs font-semibold text-gray-600 mb-1">Suggested tags</div>
                          <div className="flex flex-wrap gap-1">
                            {(detail.suggested_topic_tags || []).length ? (
                              detail.suggested_topic_tags.map((t) => (
                                <span key={t} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                                  {t}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-900">—</span>
                            )}
                          </div>
                        </div>

                        <div className="p-3 border border-gray-200 rounded bg-white">
                          <div className="text-xs font-semibold text-gray-600 mb-1">Why it matters</div>
                          <div className="text-sm text-gray-900 whitespace-pre-wrap">{detail.why_it_matters || '—'}</div>
                        </div>

                        <div className="p-3 border border-gray-200 rounded bg-white">
                          <div className="text-xs font-semibold text-gray-600 mb-2">Angles</div>
                          {(detail.angles || []).length ? (
                            <div className="grid gap-2">
                              {detail.angles.map((a, idx) => (
                                <div key={idx} className="border border-gray-100 rounded p-2 bg-gray-50">
                                  <div className="text-sm font-semibold text-gray-900">{a.title}</div>
                                  <ul className="list-disc pl-5 text-sm text-gray-800 mt-1">
                                    {(a.bullets || []).map((b, j) => (
                                      <li key={j}>{b}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-900">—</div>
                          )}
                        </div>

                        <div className="p-3 border border-gray-200 rounded bg-white">
                          <div className="text-xs font-semibold text-gray-600 mb-2">Risks / caution</div>
                          {(detail.risks || []).length ? (
                            <ul className="list-disc pl-5 text-sm text-gray-800">
                              {detail.risks.map((r, idx) => (
                                <li key={idx}>
                                  <span className="font-semibold">{r.risk || 'Risk'}:</span> {r.note || '—'}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-sm text-gray-900">—</div>
                          )}
                        </div>

                        <div className="p-3 border border-gray-200 rounded bg-white">
                          <div className="text-xs font-semibold text-gray-600 mb-1">Recommended next step</div>
                          <div className="text-sm text-gray-900 whitespace-pre-wrap">{detail.recommended_next_step || '—'}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 text-sm text-gray-600">
                      No brief yet. Click “Shape into brief” when you want AO to tighten this into a decision-ready summary.
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {workroomOpen ? (
        <div className="fixed inset-0 z-40 bg-black/40">
          <div className="absolute inset-x-0 bottom-0 top-0 md:inset-10 md:rounded-xl bg-white shadow-xl flex flex-col">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">Workroom</div>
                <div className="text-xs text-gray-600 truncate">
                  {workroomTitle || 'Idea'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWorkroomOpen(false);
                  setWorkroomError('');
                }}
                className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
              {workroomError ? (
                <div className="p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
                  {workroomError}
                </div>
              ) : null}

              {workroomMessages.length === 0 ? (
                <div className="text-sm text-gray-600">
                  Talk it out here. When you’re ready, just say what you want done (for example: “draft this for LinkedIn”, “turn this into a quote card”, “send this to Studio”).
                </div>
              ) : null}

              {workroomMessages.map((m, idx) => {
                const isAssistant = String(m?.role) === 'assistant';
                const suggestions = Array.isArray(m?.suggestions) ? m.suggestions : [];
                return (
                  <div key={m?.at || idx} className={isAssistant ? '' : 'text-right'}>
                    <div className={`inline-block max-w-[92%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${isAssistant ? 'bg-white border border-gray-200 text-gray-900' : 'bg-gray-900 text-white'}`}>
                      {String(m?.content || '')}
                    </div>
                    {isAssistant && suggestions.length ? (
                      <div className="mt-2 text-left">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Suggestions</div>
                        <ul className="text-xs text-gray-700 space-y-1">
                          {suggestions.slice(0, 6).map((s, i) => <li key={i}>- {String(s)}</li>)}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-200 px-4 py-3 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  value={workroomInput}
                  onChange={(e) => setWorkroomInput(e.target.value)}
                  rows={2}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Type here…"
                />
                <button
                  type="button"
                  onClick={sendWorkroom}
                  disabled={workroomSending || !String(workroomInput || '').trim()}
                  className="min-h-[44px] px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {workroomSending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

