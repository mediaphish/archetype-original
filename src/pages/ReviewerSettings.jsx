import React, { useEffect, useState } from 'react';
import ReviewerNav from '../components/ao/ReviewerNav';

function StatusPill({ connected }) {
  return connected ? (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-green-50 text-green-800 border-green-200">
      Connected
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-gray-50 text-gray-700 border-gray-200">
      Not connected
    </span>
  );
}

function PlatformCard({ title, description, connected, reconnectHref, testHref, testLabel }) {
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const isMetaTest = testHref.includes('/providers/meta/test-post');
      const platform = testHref.includes('platform=facebook')
        ? 'facebook'
        : testHref.includes('platform=instagram')
          ? 'instagram'
          : null;
      const url = isMetaTest ? '/api/providers/meta/test-post' : testHref;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: isMetaTest ? JSON.stringify({ platform }) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      setTestResult(res.ok && json.ok !== false && json.success !== false ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="text-xs text-gray-500 mb-4">{description}</p>
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill connected={connected} />
        <a
          href={reconnectHref}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          Reconnect
        </a>
        <button
          type="button"
          onClick={handleTest}
          disabled={testLoading}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {testLoading ? 'Posting…' : testLabel}
        </button>
      </div>
      {testResult === 'success' && (
        <p className="mt-3 text-xs text-green-700">Test post published.</p>
      )}
      {testResult === 'error' && (
        <p className="mt-3 text-xs text-red-700">Test post failed.</p>
      )}
    </div>
  );
}

export default function ReviewerSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/ao/reviewer/settings');
        const json = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/ao/reviewer-login';
          return;
        }
        if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load settings');
        setStatus(json);
      } catch (e) {
        setError(e.message || 'Could not load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <ReviewerNav active="settings" />
      <div className="mx-auto max-w-2xl space-y-6 px-4 pb-10">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Connections for LinkedIn, Facebook, Instagram, and X.</p>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}

        {loading ? (
          <p className="text-sm text-gray-500">Checking connections…</p>
        ) : (
          <>
            <PlatformCard
              title="LinkedIn"
              description="Company page publishing."
              connected={status?.linkedin?.connected}
              reconnectHref="/api/auth/linkedin/start"
              testHref="/api/providers/linkedin/test-post"
              testLabel="Post LinkedIn Test"
            />
            <PlatformCard
              title="Facebook"
              description="Facebook Page publishing."
              connected={status?.facebook?.connected}
              reconnectHref="/api/auth/meta/start"
              testHref="/api/providers/meta/test-post?platform=facebook"
              testLabel="Post Facebook Test"
            />
            <PlatformCard
              title="Instagram"
              description="Instagram Business account publishing."
              connected={status?.instagram?.connected}
              reconnectHref="/api/auth/meta/start"
              testHref="/api/providers/meta/test-post?platform=instagram"
              testLabel="Post Instagram Test"
            />
            <PlatformCard
              title="X"
              description="X account publishing."
              connected={status?.twitter?.connected}
              reconnectHref="/api/auth/x/start"
              testHref="/api/providers/x/test-post"
              testLabel="Post X Test"
            />
          </>
        )}
      </div>
    </div>
  );
}
