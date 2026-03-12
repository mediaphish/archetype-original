import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

function safeUrl(s) {
  try {
    if (!s) return null;
    const u = new URL(String(s));
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.toString();
  } catch (_) {
    return null;
  }
}

function IndeterminateBar({ label }) {
  return (
    <div className="mt-3">
      {label ? <p className="text-xs text-gray-600 mb-2">{label}</p> : null}
      <div className="h-2 w-full bg-gray-100 rounded overflow-hidden border border-gray-200 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-200 via-blue-600 to-blue-200 animate-pulse opacity-90" />
      </div>
      <p className="text-xs text-gray-500 mt-2">This can take a moment. You can stay on this page.</p>
    </div>
  );
}

function normType(v) {
  const t = String(v || '').trim().toLowerCase();
  return t === 'article' ? 'article' : 'rss';
}

export default function Scout() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  const [scanStatus, setScanStatus] = useState({
    last_internal_scan: null,
    last_external_scan: null,
    last_daily_run: null,
    recent_errors: [],
  });
  const [statusLoading, setStatusLoading] = useState(true);

  const [scanning, setScanning] = useState(false);
  const [dailyRunning, setDailyRunning] = useState(false);
  const [dailyRunMessage, setDailyRunMessage] = useState('');

  // URLs we watch (external sources allowlist)
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sources, setSources] = useState([]);
  const [sourcesError, setSourcesError] = useState('');
  const [sourcesMessage, setSourcesMessage] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState('rss'); // rss | article
  const [addSourceLoading, setAddSourceLoading] = useState(false);
  const [deleteSourceLoading, setDeleteSourceLoading] = useState(null);
  const [rebuildingSources, setRebuildingSources] = useState(false);
  const [wipingSources, setWipingSources] = useState(false);

  // People we follow (Brain Trust registry)
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [people, setPeople] = useState([]);
  const [peopleError, setPeopleError] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonCategories, setNewPersonCategories] = useState('');
  const [newPersonProfileUrl, setNewPersonProfileUrl] = useState('');
  const [newPersonNotes, setNewPersonNotes] = useState('');
  const [addPersonLoading, setAddPersonLoading] = useState(false);
  const [togglingPersonId, setTogglingPersonId] = useState(null);

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

  const loadStatus = useCallback(async () => {
    if (!authChecked) return;
    setStatusLoading(true);
    try {
      const res = await fetch('/api/ao/automation-status');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setScanStatus({
          last_internal_scan: json.last_internal_scan,
          last_external_scan: json.last_external_scan,
          last_daily_run: json.last_daily_run || null,
          recent_errors: json.recent_errors || [],
        });
      }
    } catch (_) {}
    setStatusLoading(false);
  }, [authChecked]);

  const loadSources = useCallback(async () => {
    if (!authChecked) return;
    setSourcesLoading(true);
    setSourcesError('');
    try {
      const res = await fetch('/api/ao/external-sources');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setSources(Array.isArray(json.sources) ? json.sources : []);
      } else {
        setSources([]);
        setSourcesError(json.error || 'Could not load sources');
      }
    } catch (e) {
      setSources([]);
      setSourcesError(e.message || 'Could not load sources');
    } finally {
      setSourcesLoading(false);
    }
  }, [authChecked]);

  const loadPeople = useCallback(async () => {
    if (!authChecked) return;
    setPeopleLoading(true);
    setPeopleError('');
    try {
      const res = await fetch('/api/ao/brain-trust');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setPeople(Array.isArray(json.people) ? json.people : []);
      } else {
        setPeople([]);
        setPeopleError(json.error || 'Could not load people');
      }
    } catch (e) {
      setPeople([]);
      setPeopleError(e.message || 'Could not load people');
    } finally {
      setPeopleLoading(false);
    }
  }, [authChecked]);

  useEffect(() => {
    if (!authChecked) return;
    loadStatus();
    loadSources();
    loadPeople();
  }, [authChecked, loadStatus, loadSources, loadPeople]);

  const runScan = useCallback(async (type) => {
    if (!authChecked || scanning) return;
    setScanning(true);
    try {
      const url = `${type === 'internal' ? '/api/ao/scan-internal' : '/api/ao/scan-external'}`;
      const res = await fetch(url, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        await loadStatus();
      }
    } finally {
      setScanning(false);
    }
  }, [authChecked, scanning, loadStatus]);

  const runDailyNow = useCallback(async () => {
    if (!authChecked || dailyRunning) return;
    setDailyRunMessage('');
    setDailyRunning(true);
    try {
      const res = await fetch('/api/ao/daily-run-now', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setDailyRunMessage(`Daily run complete. Drafted ${json.drafted_count || 0} item(s).`);
        await loadStatus();
      } else {
        setDailyRunMessage(json.error || 'Daily run failed');
      }
    } catch (e) {
      setDailyRunMessage(e.message || 'Daily run failed');
    } finally {
      setDailyRunning(false);
    }
  }, [authChecked, dailyRunning, loadStatus]);

  async function handleAddSource() {
    if (!authChecked || addSourceLoading) return;
    const url = newSourceUrl.trim();
    if (!url) return;
    setAddSourceLoading(true);
    setSourcesError('');
    try {
      const res = await fetch('/api/ao/external-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          name: newSourceName.trim() || null,
          source_type: normType(newSourceType),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setSourcesError(json.error || 'Could not add source');
      } else {
        setNewSourceUrl('');
        setNewSourceName('');
        setNewSourceType('rss');
        await loadSources();
      }
    } catch (e) {
      setSourcesError(e.message || 'Could not add source');
    } finally {
      setAddSourceLoading(false);
    }
  }

  async function handleWipeSources() {
    if (!authChecked || wipingSources) return;
    const ok = window.confirm('Wipe all watched URLs? This cannot be undone.');
    if (!ok) return;
    setWipingSources(true);
    setSourcesError('');
    setSourcesMessage('');
    try {
      const res = await fetch('/api/ao/external-sources/wipe', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Wipe failed');
      await loadSources();
      setSourcesMessage('Wiped watched URLs.');
    } catch (e) {
      setSourcesError(e.message || 'Wipe failed');
    } finally {
      setWipingSources(false);
    }
  }

  async function handleRebuildSources() {
    if (!authChecked || rebuildingSources) return;
    const ok = window.confirm('Rebuild watched URLs with AI? This will wipe the list first.');
    if (!ok) return;
    setRebuildingSources(true);
    setSourcesError('');
    setSourcesMessage('');
    try {
      const res = await fetch('/api/ao/external-sources/rebuild', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_count: 20 }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Rebuild failed');
      await loadSources();
      const inserted = Number(json.inserted || 0);
      if (!inserted) {
        setSourcesError(json.message || 'Rebuild finished, but found 0 working sources.');
      } else {
        setSourcesMessage(`Rebuilt watched URLs. Added ${inserted}.`);
      }
    } catch (e) {
      setSourcesError(e.message || 'Rebuild failed');
    } finally {
      setRebuildingSources(false);
    }
  }

  async function handleDeleteSource(id) {
    if (!authChecked || deleteSourceLoading) return;
    setDeleteSourceLoading(id);
    setSourcesError('');
    try {
      const res = await fetch(`/api/ao/external-sources/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setSourcesError(json.error || 'Could not delete source');
      } else {
        await loadSources();
      }
    } catch (e) {
      setSourcesError(e.message || 'Could not delete source');
    } finally {
      setDeleteSourceLoading(null);
    }
  }

  const categoriesArray = useMemo(() => {
    const raw = String(newPersonCategories || '').trim();
    if (!raw) return [];
    return raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12);
  }, [newPersonCategories]);

  async function handleAddPerson() {
    if (!authChecked || addPersonLoading) return;
    const name = newPersonName.trim();
    if (!name) return;
    const url = safeUrl(newPersonProfileUrl.trim());
    setAddPersonLoading(true);
    setPeopleError('');
    try {
      const res = await fetch('/api/ao/brain-trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          categories: categoriesArray,
          profile_urls: url ? [url] : [],
          notes: newPersonNotes.trim() || null,
          active: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setPeopleError(json.error || 'Could not add person');
      } else {
        setNewPersonName('');
        setNewPersonCategories('');
        setNewPersonProfileUrl('');
        setNewPersonNotes('');
        await loadPeople();
      }
    } catch (e) {
      setPeopleError(e.message || 'Could not add person');
    } finally {
      setAddPersonLoading(false);
    }
  }

  async function togglePersonActive(person) {
    if (!authChecked || togglingPersonId) return;
    setTogglingPersonId(person.id);
    setPeopleError('');
    try {
      const res = await fetch(`/api/ao/brain-trust/${encodeURIComponent(person.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !person.active }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setPeopleError(json.error || 'Could not update');
      } else {
        await loadPeople();
      }
    } catch (e) {
      setPeopleError(e.message || 'Could not update');
    } finally {
      setTogglingPersonId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="scout" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Scout</h1>
        <p className="text-gray-600 mb-8">Search and collect leadership signals from watched URLs and people.</p>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Run Scout</h2>
          <p className="text-sm text-gray-600">
            Last daily run: {scanStatus.last_daily_run ? new Date(scanStatus.last_daily_run).toLocaleString() : '—'}<br />
            Last internal: {scanStatus.last_internal_scan ? new Date(scanStatus.last_internal_scan).toLocaleString() : '—'} | Last external: {scanStatus.last_external_scan ? new Date(scanStatus.last_external_scan).toLocaleString() : '—'}
          </p>
          {statusLoading ? <div className="mt-3"><LoadingSpinner /></div> : null}
          {scanStatus.recent_errors?.length ? (
            <ul className="mt-3 text-sm text-red-700">
              {(scanStatus.recent_errors || []).slice(0, 3).map((r, i) => (
                <li key={i}>{r.error_message}</li>
              ))}
            </ul>
          ) : null}

          {dailyRunMessage ? (
            <div className={`mt-3 p-3 rounded text-sm ${dailyRunMessage.toLowerCase().includes('failed') ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
              {dailyRunMessage}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={runDailyNow} disabled={dailyRunning} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50">
              {dailyRunning ? 'Running…' : 'Run daily now'}
            </button>
            <button type="button" onClick={() => runScan('internal')} disabled={scanning} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
              Run internal scan
            </button>
            <button type="button" onClick={() => runScan('external')} disabled={scanning} className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50">
              Run external scan
            </button>
          </div>

          {dailyRunning ? <IndeterminateBar label="Daily run in progress…" /> : null}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">URLs we watch</h2>
            <p className="text-sm text-gray-600 mb-4">These are the sites Scout checks for leadership signals.</p>

            {sourcesError ? <p className="text-sm text-red-700 mb-3">{sourcesError}</p> : null}
            {sourcesMessage ? <p className="text-sm text-green-800 mb-3">{sourcesMessage}</p> : null}

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRebuildSources}
                disabled={rebuildingSources}
                className="px-4 py-2 bg-gray-900 text-white font-semibold rounded hover:bg-gray-800 disabled:opacity-50"
              >
                {rebuildingSources ? 'Rebuilding…' : 'Rebuild list with AI'}
              </button>
              <button
                type="button"
                onClick={handleWipeSources}
                disabled={wipingSources}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {wipingSources ? 'Wiping…' : 'Wipe list'}
              </button>
              <span className="text-xs text-gray-500">Wipe removes AI-added URLs only. Manual URLs stay until you delete them.</span>
            </div>
            {(rebuildingSources || wipingSources) ? (
              <IndeterminateBar label={rebuildingSources ? 'Rebuilding the list…' : 'Wiping the list…'} />
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://example.com/feed"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newSourceType}
                  onChange={(e) => setNewSourceType(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                >
                  <option value="rss">RSS</option>
                  <option value="article">Article</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                <input
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="Leadership Brain Trust"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddSource}
                disabled={addSourceLoading || !newSourceUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {addSourceLoading ? 'Adding…' : 'Add URL'}
              </button>
              <button
                type="button"
                onClick={loadSources}
                disabled={sourcesLoading}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4">
              {sourcesLoading ? (
                <LoadingSpinner message="Loading sources…" />
              ) : sources.length === 0 ? (
                <p className="text-sm text-gray-500">No URLs yet.</p>
              ) : (
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
                  {sources.map((s) => (
                    <li key={s.id} className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {s.name || 'Source'}
                          <span className="ml-2 text-xs text-gray-500">({s.source_type})</span>
                        </div>
                        <a className="text-sm text-blue-700 hover:underline break-all" href={safeUrl(s.url) || '#'} target="_blank" rel="noreferrer">
                          {s.url}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSource(s.id)}
                        disabled={deleteSourceLoading === s.id}
                        className="text-sm text-red-700 hover:underline disabled:opacity-50"
                      >
                        {deleteSourceLoading === s.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">People we follow</h2>
            <p className="text-sm text-gray-600 mb-4">A lightweight registry of identifiable people in your leadership universe.</p>

            {peopleError ? <p className="text-sm text-red-700 mb-3">{peopleError}</p> : null}

            <div className="grid gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categories (comma-separated)</label>
                  <input
                    value={newPersonCategories}
                    onChange={(e) => setNewPersonCategories(e.target.value)}
                    placeholder="leadership, culture, operations"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profile link (optional)</label>
                  <input
                    value={newPersonProfileUrl}
                    onChange={(e) => setNewPersonProfileUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={newPersonNotes}
                  onChange={(e) => setNewPersonNotes(e.target.value)}
                  rows={2}
                  placeholder="Why this person matters / what to watch for"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddPerson}
                  disabled={addPersonLoading || !newPersonName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {addPersonLoading ? 'Adding…' : 'Add person'}
                </button>
                <button
                  type="button"
                  onClick={loadPeople}
                  disabled={peopleLoading}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-4">
              {peopleLoading ? (
                <LoadingSpinner message="Loading people…" />
              ) : people.length === 0 ? (
                <p className="text-sm text-gray-500">No people yet.</p>
              ) : (
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
                  {people.map((p) => (
                    <li key={p.id} className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
                          <span className={`text-xs px-2 py-0.5 rounded ${p.active ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                            {p.active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        {Array.isArray(p.categories) && p.categories.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.categories.slice(0, 8).map((c) => (
                              <span key={c} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-800">{c}</span>
                            ))}
                          </div>
                        ) : null}
                        {Array.isArray(p.profile_urls) && p.profile_urls.length ? (
                          <div className="mt-2">
                            {p.profile_urls.slice(0, 2).map((u) => (
                              <a key={u} href={safeUrl(u) || '#'} target="_blank" rel="noreferrer" className="text-sm text-blue-700 hover:underline break-all">
                                {u}
                              </a>
                            ))}
                          </div>
                        ) : null}
                        {p.notes ? <div className="mt-2 text-sm text-gray-600">{p.notes}</div> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePersonActive(p)}
                        disabled={togglingPersonId === p.id}
                        className="text-sm text-gray-700 hover:underline disabled:opacity-50"
                      >
                        {togglingPersonId === p.id ? 'Saving…' : (p.active ? 'Pause' : 'Activate')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

