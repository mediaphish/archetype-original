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
