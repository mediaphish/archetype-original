import React, { useCallback, useEffect, useState } from 'react';

/**
 * The LinkedIn data screen, shown inside the LinkedIn card on /ao/settings.
 *
 * Built 2026-10-19 for the LinkedIn Community Management review video, which
 * walks through three things on camera: the counts the app holds per post,
 * exactly what LinkedIn data is stored, and the control that erases it.
 * Everything here reads /api/ao/linkedin-data.
 */

const STORE_LABELS = {
  ao_linkedin_tokens: 'Connection tokens, and the IDs for your member account and company page',
  ao_scheduled_post_metrics: 'Reaction, comment and share totals per post',
  ao_scheduled_posts: 'The LinkedIn ID stored on each published post (your writing itself is kept)',
};

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Count({ value }) {
  if (value === null || value === undefined) return <span className="text-gray-400">not available</span>;
  return <span className="font-medium text-gray-900">{value}</span>;
}

export default function LinkedInDataPanel({ connected, onDisconnected }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null); // { kind: 'ok' | 'error', text }

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/ao/linkedin-data');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || (json.errors || []).join('; ') || 'Could not load');
      setData(json);
    } catch (e) {
      setLoadError(e.message || 'Could not load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function post(body, label) {
    setBusy(label);
    setMessage(null);
    try {
      const res = await fetch('/api/ao/linkedin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || (json.errors || []).join('; ') || 'Request failed');
      return json;
    } catch (e) {
      setMessage({ kind: 'error', text: e.message || 'Request failed' });
      return null;
    } finally {
      setBusy('');
    }
  }

  async function handleDisconnect() {
    const json = await post({ action: 'disconnect' }, 'disconnect');
    if (json) {
      setMessage({ kind: 'ok', text: 'LinkedIn disconnected. Your posts and history are untouched.' });
      onDisconnected?.();
      load();
    }
  }

  async function handleDelete() {
    const json = await post({ confirm: confirmText }, 'delete');
    if (json) {
      const rows = (json.deleted || []).reduce((n, d) => n + (d.rows || 0), 0);
      setMessage({ kind: 'ok', text: `All LinkedIn data erased (${rows} records). LinkedIn is now disconnected.` });
      setConfirmText('');
      onDisconnected?.();
      load();
    }
  }

  const posts = data?.posts || [];
  const refusal = posts.find((p) => p.refused_reason)?.refused_reason || '';

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
      {connected && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={!!busy}
            className="px-4 py-2 text-sm font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect LinkedIn'}
          </button>
          <span className="text-xs text-gray-500">Removes the connection only. Posts and history stay.</span>
        </div>
      )}

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">LinkedIn post performance</h3>
        <p className="text-sm text-gray-600 mb-3">
          Totals only. The app never asks LinkedIn who reacted or commented, so no member names or profiles are
          ever requested, stored or shown here.
        </p>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-red-700">{loadError}</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-gray-500">No LinkedIn posts published yet.</p>
        ) : (
          <>
            {refusal && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-900">
                LinkedIn currently refuses to share these totals with the app. Reading them requires the Community
                Management access this app has applied for. LinkedIn's response: <em>{refusal}</em>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4 font-medium">Posted</th>
                    <th className="py-2 pr-4 font-medium">Post</th>
                    <th className="py-2 pr-4 font-medium">Reactions</th>
                    <th className="py-2 pr-4 font-medium">Comments</th>
                    <th className="py-2 font-medium">Shares</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 align-top">
                      <td className="py-2 pr-4 whitespace-nowrap text-gray-600">{formatDate(p.posted_at)}</td>
                      <td className="py-2 pr-4 text-gray-800">{p.excerpt || '(no caption)'}</td>
                      <td className="py-2 pr-4"><Count value={p.reactions} /></td>
                      <td className="py-2 pr-4"><Count value={p.comments} /></td>
                      <td className="py-2"><Count value={p.shares} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">LinkedIn data this app holds</h3>
        <p className="text-sm text-gray-600 mb-3">Everything obtained from LinkedIn, and where it is kept.</p>
        {data && (
          <ul className="text-sm space-y-2 mb-3">
            {(data.stores || []).map((s) => (
              <li key={s.store} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                <span className="text-gray-700">{STORE_LABELS[s.store] || s.what}</span>
                <span className="font-medium text-gray-900 whitespace-nowrap">{s.rows} records</span>
              </li>
            ))}
            <li className="flex justify-between gap-4">
              <span className="text-gray-700">LinkedIn member identities (who reacted or commented)</span>
              <span className="font-medium text-gray-900 whitespace-nowrap">{data.member_identities_held ?? 0}, never requested</span>
            </li>
          </ul>
        )}
      </div>

      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <h3 className="text-base font-semibold text-red-900 mb-1">Erase all LinkedIn data</h3>
        <p className="text-sm text-red-900 mb-3">
          Permanently deletes everything listed above and disconnects LinkedIn. Your own captions and images are
          kept. Type DELETE to confirm.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            aria-label="Type DELETE to confirm"
            className="px-3 py-2 text-sm border border-red-300 rounded bg-white w-40"
          />
          <button
            type="button"
            onClick={handleDelete}
            disabled={!!busy || confirmText.trim().toUpperCase() !== 'DELETE'}
            className="px-4 py-2 text-sm font-medium rounded bg-red-700 text-white hover:bg-red-800 disabled:opacity-40"
          >
            {busy === 'delete' ? 'Erasing…' : 'Erase all LinkedIn data'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded text-sm border ${
            message.kind === 'ok' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
