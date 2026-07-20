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

export default function ReviewerSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkedin, setLinkedin] = useState(null);

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
        setLinkedin(json.linkedin);
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
          <p className="text-sm text-gray-500 mt-1">Connection status.</p>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">LinkedIn</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Checking connection…</p>
          ) : (
            <StatusPill connected={linkedin?.connected} />
          )}
          <p className="text-xs text-gray-500 mt-3">
            Publishing and analytics access is managed by the account owner.
          </p>
        </div>
      </div>
    </div>
  );
}
