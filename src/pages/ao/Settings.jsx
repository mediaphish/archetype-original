import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';

function StatusPill({ state }) {
  const s = state || 'not_connected';
  const map = {
    connected: { label: 'Connected', cls: 'bg-green-50 text-green-800 border-green-200' },
    not_connected: { label: 'Not connected', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
    needs_reconnect: { label: 'Needs reconnect', cls: 'bg-yellow-50 text-yellow-900 border-yellow-200' },
  };
  const cfg = map[s] || map.not_connected;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function Settings() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [linkedinStatus, setLinkedinStatus] = useState(null);
  const [linkedinMessage, setLinkedinMessage] = useState('');
  const [metaConnectStatus, setMetaConnectStatus] = useState(null);
  const [metaConnectMessage, setMetaConnectMessage] = useState('');
  const [xConnectStatus, setXConnectStatus] = useState(null);
  const [xConnectMessage, setXConnectMessage] = useState('');
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [linkedinState, setLinkedinState] = useState('not_connected'); // connected | not_connected | needs_reconnect
  const [linkedinReason, setLinkedinReason] = useState('');
  const [linkedinLoading, setLinkedinLoading] = useState(true);
  const [linkedinTestLoading, setLinkedinTestLoading] = useState(false);
  const [linkedinTestResult, setLinkedinTestResult] = useState(null); // 'success' | 'error' | null
  const [linkedinTestError, setLinkedinTestError] = useState('');
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaStatus, setMetaStatus] = useState(null);
  const [metaError, setMetaError] = useState('');
  const [metaOverallState, setMetaOverallState] = useState('not_connected');
  const [metaTestLoading, setMetaTestLoading] = useState({ facebook: false, instagram: false });
  const [metaTestResult, setMetaTestResult] = useState({ facebook: null, instagram: null }); // success|error|null
  const [metaTestError, setMetaTestError] = useState({ facebook: '', instagram: '' });

  const [xLoading, setXLoading] = useState(true);
  const [xConnected, setXConnected] = useState(false);
  const [xState, setXState] = useState('not_connected'); // connected | not_connected | needs_reconnect
  const [xUsername, setXUsername] = useState('');
  const [xError, setXError] = useState('');
  const [xTestLoading, setXTestLoading] = useState(false);
  const [xTestResult, setXTestResult] = useState(null); // success|error|null
  const [xTestError, setXTestError] = useState('');

  const [dbCheckLoading, setDbCheckLoading] = useState(false);
  const [dbCheckError, setDbCheckError] = useState('');
  const [dbCheckResult, setDbCheckResult] = useState(null); // { missing: [], notes: [] }

  const [brandLoading, setBrandLoading] = useState(true);
  const [brandAssets, setBrandAssets] = useState([]);
  const [brandError, setBrandError] = useState('');
  const [brandUploads, setBrandUploads] = useState([]); // [{ localId, file, label, variant, defaultLight, defaultDark }]
  const [brandUploading, setBrandUploading] = useState(false);
  const [brandUploadError, setBrandUploadError] = useState('');
  const [brandUploadMessage, setBrandUploadMessage] = useState('');

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('provider') === 'linkedin') {
      setLinkedinStatus(params.get('status') || null);
      setLinkedinMessage(params.get('message') || '');
    }
    if (params.get('provider') === 'meta') {
      setMetaConnectStatus(params.get('status') || null);
      setMetaConnectMessage(params.get('message') || '');
    }
    if (params.get('provider') === 'x') {
      setXConnectStatus(params.get('status') || null);
      setXConnectMessage(params.get('message') || '');
    }
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
      setLinkedinLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/ao/linkedin/status`);
        if (cancelled) return;
        const json = await res.json().catch(() => ({}));
        if (json.ok) {
          setLinkedinConnected(!!json.connected);
          setLinkedinState(json.state || (json.connected ? 'connected' : 'not_connected'));
          setLinkedinReason(json.reason || '');
        }
      } catch (_) {}
      if (!cancelled) setLinkedinLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authChecked, email]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    (async () => {
      setMetaLoading(true);
      setMetaError('');
      try {
        const res = await fetch('/api/ao/meta/status');
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && json.ok) {
          setMetaStatus(json);
          setMetaOverallState(json.overallState || 'not_connected');
        } else {
          setMetaStatus(null);
          setMetaError(json.error || 'Meta status check failed');
        }
      } catch (e) {
        if (!cancelled) {
          setMetaStatus(null);
          setMetaError(e.message || 'Meta status check failed');
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authChecked]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    (async () => {
      setXLoading(true);
      setXError('');
      try {
        const res = await fetch('/api/ao/x/status');
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && json.ok) {
          setXConnected(!!json.connected);
          setXUsername(json.username || '');
          setXState(json.state || (json.connected ? 'connected' : 'not_connected'));
        } else {
          setXConnected(false);
          setXUsername('');
          setXError(json.error || 'X status check failed');
        }
      } catch (e) {
        if (!cancelled) {
          setXConnected(false);
          setXUsername('');
          setXError(e.message || 'X status check failed');
        }
      } finally {
        if (!cancelled) setXLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authChecked]);

  const maskedEmail = email ? `${email.slice(0, 2)}***@${email.split('@')[1] || '***'}` : '—';

  const runDbCheck = useCallback(async () => {
    if (!authChecked) return;
    setDbCheckLoading(true);
    setDbCheckError('');
    try {
      const res = await fetch('/api/ao/db-check');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Setup check failed');
      setDbCheckResult({ missing: json.missing || [], notes: json.notes || [] });
    } catch (e) {
      setDbCheckResult(null);
      setDbCheckError(e.message || 'Setup check failed');
    } finally {
      setDbCheckLoading(false);
    }
  }, [authChecked]);

  const refreshBrandAssets = useCallback(async () => {
    if (!authChecked) return;
    setBrandLoading(true);
    setBrandError('');
    try {
      const res = await fetch('/api/ao/brand/assets');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load brand assets');
      setBrandAssets(Array.isArray(json.assets) ? json.assets : []);
    } catch (e) {
      setBrandAssets([]);
      setBrandError(e.message || 'Could not load brand assets');
    } finally {
      setBrandLoading(false);
    }
  }, [authChecked]);

  useEffect(() => {
    if (!authChecked) return;
    refreshBrandAssets();
  }, [authChecked, refreshBrandAssets]);

  const uploadBrandAssets = useCallback(async () => {
    if (!authChecked) return;
    if (brandUploading) return;
    setBrandUploadError('');
    setBrandUploadMessage('');

    const pending = Array.isArray(brandUploads) ? brandUploads : [];
    if (!pending.length) return;

    const missingLabel = pending.find((u) => !String(u?.label || '').trim());
    if (missingLabel) {
      setBrandUploadError('Each file needs a label before uploading.');
      return;
    }

    setBrandUploading(true);
    try {
      for (const u of pending) {
        const fd = new FormData();
        fd.append('label', String(u.label || '').trim());
        fd.append('variant', String(u.variant || 'other'));
        fd.append('defaultLight', u.defaultLight ? 'true' : 'false');
        fd.append('defaultDark', u.defaultDark ? 'true' : 'false');
        fd.append('file', u.file);

        const res = await fetch('/api/ao/brand/assets', { method: 'POST', body: fd });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || 'Upload failed');
      }
      setBrandUploads([]);
      setBrandUploadMessage('Uploaded.');
      await refreshBrandAssets();
    } catch (e) {
      setBrandUploadError(e.message || 'Upload failed');
    } finally {
      setBrandUploading(false);
    }
  }, [authChecked, brandUploading, brandUploads, refreshBrandAssets]);

  const patchBrandAsset = useCallback(async (id, patch) => {
    if (!authChecked) return;
    try {
      const res = await fetch(`/api/ao/brand/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch || {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Update failed');
      setBrandAssets((prev) => prev.map((a) => (a.id === id ? json.asset : a)));
    } catch (e) {
      setBrandUploadError(e.message || 'Update failed');
    }
  }, [authChecked]);

  const deleteBrandAsset = useCallback(async (id) => {
    if (!authChecked) return;
    if (!window.confirm('Delete this logo?')) return;
    try {
      const res = await fetch(`/api/ao/brand/assets/${id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Delete failed');
      setBrandAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setBrandUploadError(e.message || 'Delete failed');
    }
  }, [authChecked]);

  async function handleLinkedInTestPost() {
    if (!authChecked) return;
    setLinkedinTestResult(null);
    setLinkedinTestError('');
    setLinkedinTestLoading(true);
    try {
      const res = await fetch('/api/providers/linkedin/test-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setLinkedinTestResult('success');
      } else {
        setLinkedinTestResult('error');
        setLinkedinTestError(data.error || 'Request failed');
      }
    } catch (e) {
      setLinkedinTestResult('error');
      setLinkedinTestError(e.message || 'Request failed');
    } finally {
      setLinkedinTestLoading(false);
    }
  }

  async function handleMetaTestPost(platform) {
    if (!authChecked) return;
    if (platform !== 'facebook' && platform !== 'instagram') return;
    setMetaTestResult((p) => ({ ...p, [platform]: null }));
    setMetaTestError((p) => ({ ...p, [platform]: '' }));
    setMetaTestLoading((p) => ({ ...p, [platform]: true }));
    try {
      const res = await fetch('/api/providers/meta/test-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.ok) {
        setMetaTestResult((p) => ({ ...p, [platform]: 'success' }));
      } else {
        setMetaTestResult((p) => ({ ...p, [platform]: 'error' }));
        setMetaTestError((p) => ({ ...p, [platform]: json.error || 'Request failed' }));
      }
    } catch (e) {
      setMetaTestResult((p) => ({ ...p, [platform]: 'error' }));
      setMetaTestError((p) => ({ ...p, [platform]: e.message || 'Request failed' }));
    } finally {
      setMetaTestLoading((p) => ({ ...p, [platform]: false }));
    }
  }

  async function handleXTestPost() {
    if (!authChecked) return;
    setXTestResult(null);
    setXTestError('');
    setXTestLoading(true);
    try {
      const res = await fetch('/api/providers/x/test-post', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (json.ok) {
        setXTestResult('success');
      } else {
        setXTestResult('error');
        setXTestError(json.error || 'Request failed');
      }
    } catch (e) {
      setXTestResult('error');
      setXTestError(e.message || 'Request failed');
    } finally {
      setXTestLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="settings" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600 mb-8">Owner console and configuration.</p>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">System setup check</h2>
          <p className="text-sm text-gray-600 mb-4">
            If something throws a database error (like “missing column”), run this check to see which one-time setup steps are missing.
          </p>
          {dbCheckError ? (
            <div className="mb-3 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">{dbCheckError}</div>
          ) : null}
          <button
            type="button"
            onClick={runDbCheck}
            disabled={dbCheckLoading}
            className="px-4 py-2 bg-gray-900 text-white font-semibold rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {dbCheckLoading ? 'Checking…' : 'Run setup check'}
          </button>
          {dbCheckResult ? (
            <div className="mt-4">
              {Array.isArray(dbCheckResult.missing) && dbCheckResult.missing.length === 0 ? (
                <div className="p-3 rounded border border-green-200 bg-green-50 text-green-800 text-sm">
                  Looks good. No missing setup steps detected.
                </div>
              ) : (
                <>
                  <div className="p-3 rounded border border-amber-200 bg-amber-50 text-amber-900 text-sm">
                    Missing setup steps detected. Run these files in Supabase SQL editor:
                  </div>
                  <ul className="mt-3 space-y-2 text-sm">
                    {(dbCheckResult.missing || []).map((m, i) => (
                      <li key={i} className="border border-gray-200 rounded p-3 bg-white">
                        <div className="font-semibold text-gray-900">{m.sql}</div>
                        {m.reason ? <div className="text-gray-600 mt-1">{m.reason}</div> : null}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {Array.isArray(dbCheckResult.notes) && dbCheckResult.notes.length ? (
                <ul className="mt-3 text-xs text-gray-600 list-disc pl-5">
                  {dbCheckResult.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Brand assets</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload AO logos once (SVG + PNG) and label them so Studio can use the right one when generating branded graphics.
          </p>

          {brandError ? (
            <div className="mb-3 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">{brandError}</div>
          ) : null}
          {brandUploadError ? (
            <div className="mb-3 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">{brandUploadError}</div>
          ) : null}
          {brandUploadMessage ? (
            <div className="mb-3 p-3 rounded border border-green-200 bg-green-50 text-green-800 text-sm">{brandUploadMessage}</div>
          ) : null}

          <div className="border border-gray-200 rounded p-4 bg-gray-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-900">Upload logos</div>
              <div className="text-xs text-gray-500">SVG or PNG only</div>
            </div>
            <div className="mt-3">
              <input
                type="file"
                accept=".svg,.png,image/svg+xml,image/png"
                multiple
                onChange={(e) => {
                  setBrandUploadError('');
                  setBrandUploadMessage('');
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  setBrandUploads((prev) => ([
                    ...(Array.isArray(prev) ? prev : []),
                    ...files.map((f) => ({
                      localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                      file: f,
                      label: '',
                      variant: 'other',
                      defaultLight: false,
                      defaultDark: false,
                    })),
                  ]));
                  e.target.value = '';
                }}
                className="block w-full text-sm"
              />
            </div>

            {Array.isArray(brandUploads) && brandUploads.length ? (
              <div className="mt-4 space-y-3">
                {brandUploads.map((u) => (
                  <div key={u.localId} className="border border-gray-200 rounded bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-gray-900">
                        <span className="font-semibold">File:</span> {u.file?.name || 'logo'}
                      </div>
                      <button
                        type="button"
                        onClick={() => setBrandUploads((prev) => (prev || []).filter((x) => x.localId !== u.localId))}
                        className="px-2.5 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Label (required)</label>
                        <input
                          value={u.label}
                          onChange={(e) => setBrandUploads((prev) => (prev || []).map((x) => (x.localId === u.localId ? { ...x, label: e.target.value } : x)))}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="e.g., AO mark (white), Wordmark (black), Lockup dark…"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Variant</label>
                        <select
                          value={u.variant || 'other'}
                          onChange={(e) => setBrandUploads((prev) => (prev || []).map((x) => (x.localId === u.localId ? { ...x, variant: e.target.value } : x)))}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                        >
                          <option value="mark">mark</option>
                          <option value="wordmark">wordmark</option>
                          <option value="lockup_light">lockup_light</option>
                          <option value="lockup_dark">lockup_dark</option>
                          <option value="other">other</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!u.defaultLight}
                          onChange={(e) => setBrandUploads((prev) => (prev || []).map((x) => (x.localId === u.localId ? { ...x, defaultLight: e.target.checked } : x)))}
                        />
                        Default for light backgrounds
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!u.defaultDark}
                          onChange={(e) => setBrandUploads((prev) => (prev || []).map((x) => (x.localId === u.localId ? { ...x, defaultDark: e.target.checked } : x)))}
                        />
                        Default for dark backgrounds
                      </label>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={uploadBrandAssets}
                    disabled={brandUploading}
                    className="px-4 py-2 bg-gray-900 text-white font-semibold rounded hover:bg-gray-800 disabled:opacity-50"
                  >
                    {brandUploading ? 'Uploading…' : 'Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrandUploads([])}
                    disabled={brandUploading}
                    className="px-4 py-2 border border-gray-300 bg-white text-gray-700 font-semibold rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Clear
                  </button>
                  <span className="text-xs text-gray-500">Labels are required so you can reference them later in Studio.</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold text-gray-900 mb-2">Saved logos</div>
            {brandLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : Array.isArray(brandAssets) && brandAssets.length ? (
              <ul className="space-y-3">
                {brandAssets.slice(0, 50).map((a) => (
                  <li key={a.id} className="border border-gray-200 rounded p-3 bg-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{a.label}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {a.variant || 'other'}
                          {a.is_default_light ? ' · default light' : ''}
                          {a.is_default_dark ? ' · default dark' : ''}
                        </div>
                        {a.public_url ? (
                          <a className="text-xs text-blue-700 hover:underline break-all" href={a.public_url} target="_blank" rel="noreferrer">
                            Preview file
                          </a>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => patchBrandAsset(a.id, { is_default_light: true })}
                          className="px-2.5 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50"
                        >
                          Set default light
                        </button>
                        <button
                          type="button"
                          onClick={() => patchBrandAsset(a.id, { is_default_dark: true })}
                          className="px-2.5 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50"
                        >
                          Set default dark
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBrandAsset(a.id)}
                          className="px-2.5 py-1 text-xs rounded border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No logos uploaded yet.</p>
            )}
          </div>
        </section>

        {linkedinStatus === 'connected' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">LinkedIn connected. You can use LinkedIn for publishing.</div>
        )}
        {linkedinStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">LinkedIn connection failed.{linkedinMessage ? ` ${linkedinMessage}` : ''}</div>
        )}
        {metaConnectStatus === 'connected' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">Meta connected. You can publish to Facebook and Instagram.</div>
        )}
        {metaConnectStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">Meta connection failed.{metaConnectMessage ? ` ${metaConnectMessage}` : ''}</div>
        )}
        {xConnectStatus === 'connected' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">X connected. You can publish to @archetypeog.</div>
        )}
        {xConnectStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">X connection failed.{xConnectMessage ? ` ${xConnectMessage}` : ''}</div>
        )}

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">LinkedIn</h2>
          <p className="text-gray-600 text-sm mb-4">Connect your personal LinkedIn account for AO publishing. Single-owner; tokens are stored server-side only.</p>
          {linkedinLoading ? (
            <p className="text-gray-500 text-sm">Checking connection…</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill state={linkedinState} />
                <a
                  href="/api/auth/linkedin/start"
                  className="inline-block px-4 py-2 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0A66C2]"
                  style={linkedinConnected ? { border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151' } : { backgroundColor: '#0A66C2', color: '#fff' }}
                >
                  {(linkedinState === 'connected' || linkedinState === 'needs_reconnect') ? 'Reconnect' : 'Connect LinkedIn'}
                </a>
                {linkedinConnected && (
                  <button
                    type="button"
                    onClick={handleLinkedInTestPost}
                    disabled={linkedinTestLoading}
                    className="inline-block px-4 py-2 text-sm font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0A66C2] disabled:opacity-50"
                  >
                    {linkedinTestLoading ? 'Posting…' : 'Post LinkedIn Test'}
                  </button>
                )}
              </div>
              {linkedinState === 'needs_reconnect' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-900 text-sm">
                  LinkedIn needs reconnect.{linkedinReason ? ` ${linkedinReason}` : ''}
                </div>
              )}
              {linkedinTestResult === 'success' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">LinkedIn test post published.</div>
              )}
              {linkedinTestResult === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">LinkedIn test post failed.{linkedinTestError ? ` ${linkedinTestError}` : ''}</div>
              )}
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Meta (Facebook + Instagram)</h2>
          <p className="text-gray-600 text-sm mb-4">Connect your Facebook Page and Instagram Business account for publishing.</p>
          {metaLoading ? (
            <p className="text-gray-500 text-sm">Checking connection…</p>
          ) : metaError ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">Meta status check failed. {metaError}</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill state={metaOverallState} />
                <a
                  href="/api/auth/meta/start"
                  className="inline-block px-4 py-2 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-1"
                  style={metaStatus?.facebook?.connected || metaStatus?.instagram?.connected ? { border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151' } : { backgroundColor: '#1877F2', color: '#fff' }}
                >
                  {(metaStatus?.facebook?.connected || metaStatus?.instagram?.connected) ? 'Reconnect Meta' : 'Connect Meta'}
                </a>
                {metaStatus?.source === 'stored' && (
                  <span className="text-xs text-gray-500">Connected via AO Settings</span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-3 border border-gray-200 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Facebook Page</span>
                    <StatusPill state={metaStatus?.facebook?.state} />
                  </div>
                  {metaStatus?.facebook?.connected ? (
                    <p className="text-xs text-gray-500 mt-1">{metaStatus.facebook.page?.name || 'Page'}{metaStatus.facebook.page?.id ? ` · ${metaStatus.facebook.page.id}` : ''}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">{metaStatus?.facebook?.reason || 'Missing configuration'}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMetaTestPost('facebook')}
                      disabled={!metaStatus?.facebook?.connected || metaTestLoading.facebook}
                      className="inline-block px-4 py-2 text-sm font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {metaTestLoading.facebook ? 'Posting…' : 'Post Facebook Test'}
                    </button>
                  </div>
                  {metaTestResult.facebook === 'success' && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm">Facebook test post published.</div>
                  )}
                  {metaTestResult.facebook === 'error' && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">Facebook test post failed.{metaTestError.facebook ? ` ${metaTestError.facebook}` : ''}</div>
                  )}
                </div>

                <div className="p-3 border border-gray-200 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Instagram</span>
                    <StatusPill state={metaStatus?.instagram?.state} />
                  </div>
                  {metaStatus?.instagram?.connected ? (
                    <p className="text-xs text-gray-500 mt-1">@{metaStatus.instagram.account?.username || 'connected'}{metaStatus.instagram.account?.id ? ` · ${metaStatus.instagram.account.id}` : ''}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">{metaStatus?.instagram?.reason || 'Missing configuration'}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMetaTestPost('instagram')}
                      disabled={!metaStatus?.instagram?.connected || metaTestLoading.instagram}
                      className="inline-block px-4 py-2 text-sm font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {metaTestLoading.instagram ? 'Posting…' : 'Post Instagram Test'}
                    </button>
                  </div>
                  {metaTestResult.instagram === 'success' && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm">Instagram test post published.</div>
                  )}
                  {metaTestResult.instagram === 'error' && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">Instagram test post failed.{metaTestError.instagram ? ` ${metaTestError.instagram}` : ''}</div>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Test posts publish real content to your Facebook Page and Instagram feed. If connection is missing, see <a href="https://github.com/mediaphish/archetype-original/blob/main/notes/SOCIAL_VERCEL_ENV.md" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">notes/SOCIAL_VERCEL_ENV.md</a>.
              </p>
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">X</h2>
          <p className="text-gray-600 text-sm mb-4">Connect your X account for publishing.</p>

          {xLoading ? (
            <p className="text-gray-500 text-sm">Checking connection…</p>
          ) : xError ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">X status check failed. {xError}</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill state={xState} />
                {xState === 'connected' && xUsername ? (
                  <span className="text-sm text-gray-600">@{xUsername}</span>
                ) : null}
                <a
                  href="/api/auth/x/start"
                  className="inline-block px-4 py-2 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-1"
                  style={xConnected ? { border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151' } : { backgroundColor: '#111827', color: '#fff' }}
                >
                  {(xState === 'connected' || xState === 'needs_reconnect') ? 'Reconnect X' : 'Connect X'}
                </a>
                {xConnected && (
                  <button
                    type="button"
                    onClick={handleXTestPost}
                    disabled={xTestLoading}
                    className="inline-block px-4 py-2 text-sm font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {xTestLoading ? 'Posting…' : 'Post X Test'}
                  </button>
                )}
              </div>
              {xState === 'needs_reconnect' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-900 text-sm">
                  X needs reconnect.
                </div>
              )}
              {xTestResult === 'success' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">X test post published.</div>
              )}
              {xTestResult === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">X test post failed.{xTestError ? ` ${xTestError}` : ''}</div>
              )}
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Owner</h2>
          <p className="text-gray-600">Allowed email: <span className="font-mono">{maskedEmail}</span></p>
          <p className="text-sm text-gray-500 mt-2">Single-owner console. Only the configured owner can sign in via magic link.</p>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Scout sources</h2>
          <p className="text-gray-600 text-sm">
            Sources and scan inputs live in Scout now. This keeps “Settings” focused on connections and security.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => handleNavigate('/ao/scout')}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
            >
              Go to Scout
            </button>
          </div>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Publisher defaults</h2>
          <p className="text-gray-500 text-sm">Default platforms and schedule time can be set here. See <a href="https://github.com/mediaphish/archetype-original/blob/main/notes/SOCIAL_VERCEL_ENV.md" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">notes/SOCIAL_VERCEL_ENV.md</a> for environment variables.</p>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Security</h2>
          <p className="text-gray-500 text-sm">Magic links expire after 15 minutes. There is no public signup; only the owner email can request a link.</p>
        </section>
      </main>
    </div>
  );
}
