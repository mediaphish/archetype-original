import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

function IndeterminateBar({ label }) {
  return (
    <div className="mt-3">
      {label ? <p className="text-xs text-gray-600 mb-2">{label}</p> : null}
      <div className="h-2 w-full bg-gray-100 rounded overflow-hidden border border-gray-200 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-200 via-green-600 to-green-200 animate-pulse opacity-90" />
      </div>
      <p className="text-xs text-gray-500 mt-2">This can take a moment. You can stay on this page.</p>
    </div>
  );
}

export default function CommandCenter() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [scheduled, setScheduled] = useState([]);
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanStatus, setScanStatus] = useState({ last_internal_scan: null, last_external_scan: null, last_daily_run: null, recent_errors: [] });
  const [quotesCount, setQuotesCount] = useState(0);
  const [journalCount, setJournalCount] = useState(0);
  const [writingCount, setWritingCount] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [dailyRunning, setDailyRunning] = useState(false);
  const [dailyRunMessage, setDailyRunMessage] = useState('');

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
        const [schedRes, failRes, statusRes, quotesRes, journalRes, writingRes] = await Promise.all([
          fetch(`/api/ao/scheduled-posts?status=scheduled&limit=10`),
          fetch(`/api/ao/scheduled-posts?status=failed&limit=10`),
          fetch(`/api/ao/automation-status`),
          fetch(`/api/ao/quotes/list`),
          fetch(`/api/ao/journal-topics/list`),
          fetch(`/api/ao/writing/list`),
        ]);
        if (cancelled) return;
        const schedJson = await schedRes.json().catch(() => ({}));
        const failJson = await failRes.json().catch(() => ({}));
        const statusJson = await statusRes.json().catch(() => ({}));
        const quotesJson = await quotesRes.json().catch(() => ({}));
        const journalJson = await journalRes.json().catch(() => ({}));
        const writingJson = await writingRes.json().catch(() => ({}));
        if (schedJson.ok && schedJson.posts) setScheduled(schedJson.posts);
        if (failJson.ok && failJson.posts) setFailures(failJson.posts);
        if (statusJson.ok) setScanStatus({ last_internal_scan: statusJson.last_internal_scan, last_external_scan: statusJson.last_external_scan, last_daily_run: statusJson.last_daily_run || null, recent_errors: statusJson.recent_errors || [] });
        if (quotesJson.ok && Array.isArray(quotesJson.quotes)) setQuotesCount(quotesJson.quotes.filter((q) => q.status === 'pending').length);
        if (journalJson.ok && Array.isArray(journalJson.topics)) setJournalCount(journalJson.topics.filter((t) => t.status === 'pending').length);
        if (writingJson.ok && Array.isArray(writingJson.writing)) setWritingCount(writingJson.writing.filter((w) => w.status === 'pending' || w.status === 'drafting').length);
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authChecked, email]);

  const runScan = useCallback(async (type) => {
    if (!authChecked || scanning) return;
    setScanning(true);
    try {
      const url = `${type === 'internal' ? '/api/ao/scan-internal' : '/api/ao/scan-external'}`;
      const res = await fetch(url, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (json.ok) {
        setScanStatus((prev) => ({ ...prev, [`last_${type}_scan`]: new Date().toISOString() }));
        window.location.reload();
      }
    } finally {
      setScanning(false);
    }
  }, [authChecked, scanning]);

  const runDailyNow = useCallback(async () => {
    if (!authChecked || dailyRunning) return;
    setDailyRunMessage('');
    setDailyRunning(true);
    try {
      const res = await fetch('/api/ao/daily-run-now', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setDailyRunMessage(`Daily run complete. Drafted ${json.drafted_count || 0} item(s).`);
      } else {
        setDailyRunMessage(json.error || 'Daily run failed');
      }
    } catch (e) {
      setDailyRunMessage(e.message || 'Daily run failed');
    } finally {
      setDailyRunning(false);
    }
  }, [authChecked, dailyRunning]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="command-center" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Command Center</h1>
        <p className="text-gray-600 mb-8">At a glance: candidates, queues, scheduled posts, and scan status.</p>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New social candidates</h2>
            <p className="text-gray-700 font-medium">{quotesCount} pending</p>
            <p className="text-gray-500 text-sm mt-1">Quote queue from internal scan.</p>
            <button type="button" onClick={() => handleNavigate('/ao/review')} className="mt-3 text-blue-600 hover:underline text-sm">Go to Review → Social</button>
          </section>
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New journal candidates</h2>
            <p className="text-gray-700 font-medium">{journalCount} pending</p>
            <p className="text-gray-500 text-sm mt-1">Journal topic queue.</p>
            <button type="button" onClick={() => handleNavigate('/ao/review')} className="mt-3 text-blue-600 hover:underline text-sm">Go to Review → Journal</button>
          </section>
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Expandable ideas</h2>
            <p className="text-gray-700 font-medium">{writingCount} in queue</p>
            <p className="text-gray-500 text-sm mt-1">Writing queue (drafting).</p>
            <button type="button" onClick={() => handleNavigate('/ao/writing')} className="mt-3 text-blue-600 hover:underline text-sm">Go to Writing</button>
          </section>
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contradiction / clarification</h2>
            <p className="text-gray-500 text-sm">High-priority items will appear here after corpus comparison is connected.</p>
          </section>
        </div>

        <section className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scheduled posts</h2>
          {loading ? (
            <LoadingSpinner />
          ) : scheduled.length === 0 ? (
            <p className="text-gray-500">No scheduled posts.</p>
          ) : (
            <ul className="space-y-2">
              {scheduled.slice(0, 5).map((p) => (
                <li key={p.id} className="flex justify-between items-start text-sm">
                  <span className="text-gray-700">{p.platform} / {p.account_id} — {new Date(p.scheduled_at).toLocaleString()}</span>
                  <button type="button" onClick={() => handleNavigate('/ao/publishing')} className="text-blue-600 hover:underline">View</button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => handleNavigate('/ao/publishing')} className="mt-3 text-blue-600 hover:underline text-sm">View all in Publishing</button>
        </section>

        <section className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent failures</h2>
          {loading ? (
            <LoadingSpinner />
          ) : failures.length === 0 ? (
            <p className="text-gray-500">No recent failures.</p>
          ) : (
            <ul className="space-y-2">
              {failures.slice(0, 5).map((p) => (
                <li key={p.id} className="text-sm">
                  <span className="text-gray-700">{p.platform} — {p.error_message || 'Unknown error'}</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => handleNavigate('/ao/publishing')} className="mt-3 text-blue-600 hover:underline text-sm">View in Publishing</button>
        </section>

        <section className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily run & scan status</h2>
          <p className="text-gray-600 text-sm">
            Last daily run: {scanStatus.last_daily_run ? new Date(scanStatus.last_daily_run).toLocaleString() : '—'}<br />
            Last internal: {scanStatus.last_internal_scan ? new Date(scanStatus.last_internal_scan).toLocaleString() : '—'} | Last external: {scanStatus.last_external_scan ? new Date(scanStatus.last_external_scan).toLocaleString() : '—'}
          </p>
          {dailyRunMessage && (
            <div className={`mt-3 p-3 rounded text-sm ${dailyRunMessage.toLowerCase().includes('failed') ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
              {dailyRunMessage}
            </div>
          )}
          {scanStatus.recent_errors?.length > 0 && (
            <ul className="mt-2 text-sm text-red-600">
              {scanStatus.recent_errors.slice(0, 3).map((r, i) => (
                <li key={i}>{r.error_message}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={runDailyNow} disabled={dailyRunning} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50">{dailyRunning ? 'Running…' : 'Run daily now'}</button>
            <button type="button" onClick={() => runScan('internal')} disabled={scanning} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">Run internal scan</button>
            <button type="button" onClick={() => runScan('external')} disabled={scanning} className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50">Run external scan</button>
          </div>
          {dailyRunning ? <IndeterminateBar label="Daily run in progress…" /> : null}
        </section>
      </main>
    </div>
  );
}
