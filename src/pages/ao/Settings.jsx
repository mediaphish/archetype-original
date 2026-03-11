import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';

export default function Settings() {
  const [email, setEmail] = useState('');
  const [linkedinStatus, setLinkedinStatus] = useState(null);
  const [linkedinMessage, setLinkedinMessage] = useState('');
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [linkedinLoading, setLinkedinLoading] = useState(true);

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('email') || localStorage.getItem('ao_email') || '';
    setEmail(e);
    const params = new URLSearchParams(window.location.search);
    if (params.get('provider') === 'linkedin') {
      setLinkedinStatus(params.get('status') || null);
      setLinkedinMessage(params.get('message') || '');
    }
  }, []);

  useEffect(() => {
    if (!email) {
      setLinkedinLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/ao/linkedin/status?email=${encodeURIComponent(email)}`);
        if (cancelled) return;
        const json = await res.json().catch(() => ({}));
        if (json.ok) setLinkedinConnected(!!json.connected);
      } catch (_) {}
      if (!cancelled) setLinkedinLoading(false);
    })();
    return () => { cancelled = true; };
  }, [email]);

  const maskedEmail = email ? `${email.slice(0, 2)}***@${email.split('@')[1] || '***'}` : '—';

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

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">LinkedIn</h2>
          <p className="text-gray-600 text-sm mb-4">Connect your personal LinkedIn account for AO publishing. Single-owner; tokens are stored server-side only.</p>
          {linkedinLoading ? (
            <p className="text-gray-500 text-sm">Checking connection…</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-sm font-medium ${linkedinConnected ? 'text-green-700' : 'text-gray-600'}`}>
                {linkedinConnected ? 'Connected' : 'Not connected'}
              </span>
              <a
                href="/api/auth/linkedin/start"
                className="inline-block px-4 py-2 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0A66C2]"
                style={linkedinConnected ? { border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151' } : { backgroundColor: '#0A66C2', color: '#fff' }}
              >
                {linkedinConnected ? 'Reconnect' : 'Connect LinkedIn'}
              </a>
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Owner</h2>
          <p className="text-gray-600">Allowed email: <span className="font-mono">{maskedEmail}</span></p>
          <p className="text-sm text-gray-500 mt-2">Single-owner console. Only the configured owner can sign in via magic link.</p>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan configuration</h2>
          <p className="text-gray-500 text-sm">Internal and external scan frequency and sources will be configurable here when the scan backend is connected.</p>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Publishing defaults</h2>
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
